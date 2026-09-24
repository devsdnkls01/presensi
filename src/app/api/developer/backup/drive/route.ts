export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import fs from 'fs';
import path from 'path';

const GOOGLE_DRIVE_FOLDER_ID = '10LHCaLApULlK6wdQ7kZ7MYd7PX7eAQ-u';

// Helper to get Google Apps Script Webhook URL from env or DB settings
async function getWebhookUrl(): Promise<string | null> {
  // Check process.env first
  if (process.env.GOOGLE_DRIVE_BACKUP_WEBHOOK) {
    return process.env.GOOGLE_DRIVE_BACKUP_WEBHOOK.trim();
  }

  // Check audit log / system config table if stored
  const configLog = await prisma.auditLog.findFirst({
    where: { action: 'CONFIG_GDRIVE_WEBHOOK' },
    orderBy: { createdAt: 'desc' },
  });

  return configLog ? configLog.details : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Akses terbatas untuk Developer' }, { status: 403 });
    }

    const webhookUrl = await getWebhookUrl();

    // Get last backup log
    const lastBackupLog = await prisma.auditLog.findFirst({
      where: { action: 'GOOGLE_DRIVE_BACKUP_SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    const lastBackupDate = lastBackupLog ? lastBackupLog.createdAt : null;
    let nextBackupDate = null;
    let daysRemaining = 15;

    if (lastBackupDate) {
      const lastTime = new Date(lastBackupDate).getTime();
      const nextTime = lastTime + 15 * 24 * 60 * 60 * 1000;
      nextBackupDate = new Date(nextTime);
      const diffMs = nextTime - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Get recent 5 backup logs
    const recentBackups = await prisma.auditLog.findMany({
      where: {
        action: { in: ['GOOGLE_DRIVE_BACKUP_SUCCESS', 'GOOGLE_DRIVE_BACKUP_FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      folderId: GOOGLE_DRIVE_FOLDER_ID,
      folderUrl: `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}?usp=sharing`,
      hasWebhook: Boolean(webhookUrl),
      maskedWebhook: webhookUrl
        ? `${webhookUrl.slice(0, 32)}...${webhookUrl.slice(-8)}`
        : null,
      intervalDays: 15,
      lastBackupDate,
      nextBackupDate,
      daysRemaining,
      recentBackups,
    });
  } catch (error: any) {
    console.error('Fetch Drive status error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat status Google Drive' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Allow developer or system cron header
    const cronSecret = process.env.CRON_SECRET || 'smartsiswa-cron-secret-backup-key-2026';
    const authHeader = req.headers.get('authorization');
    const isCron = Boolean(authHeader && authHeader === `Bearer ${cronSecret}`);

    if (!isCron && (!user || user.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Akses terbatas untuk Developer' }, { status: 403 });
    }


    const body = await req.json().catch(() => ({}));
    const { force, webhookUrlOverride, format = 'sqlite' } = body;

    // Save new webhook URL if provided
    if (webhookUrlOverride && webhookUrlOverride.trim().startsWith('http')) {
      await createAuditLog({
        action: 'CONFIG_GDRIVE_WEBHOOK',
        actor: user?.name || 'System Developer',
        details: webhookUrlOverride.trim(),
      });
    }

    const webhookUrl = webhookUrlOverride?.trim() || (await getWebhookUrl());

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: 'Webhook Google Apps Script belum dikonfigurasi. Masukkan URL Webhook terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    // Check 15-day interval if not forced
    if (!force) {
      const lastBackup = await prisma.auditLog.findFirst({
        where: { action: 'GOOGLE_DRIVE_BACKUP_SUCCESS' },
        orderBy: { createdAt: 'desc' },
      });

      if (lastBackup) {
        const lastTime = new Date(lastBackup.createdAt).getTime();
        const intervalMs = 15 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastTime < intervalMs) {
          const daysLeft = Math.ceil((intervalMs - (Date.now() - lastTime)) / (1000 * 60 * 60 * 24));
          return NextResponse.json({
            skipped: true,
            message: `Pencadangan dilewati. Jadwal berikutnya masih ${daysLeft} hari lagi. Gunakan opsi 'force: true' jika ingin mencadangkan sekarang.`,
          });
        }
      }
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

    let fileName = '';
    let fileContent = '';
    let mimeType = '';
    let isBase64 = false;

    if (format === 'sqlite' && fs.existsSync(path.join(process.cwd(), 'prisma', 'dev.db'))) {
      const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
      const buffer = fs.readFileSync(dbPath);
      fileContent = buffer.toString('base64');
      fileName = `backup-smartsiswa-${timestamp}.db`;
      mimeType = 'application/x-sqlite3';
      isBase64 = true;
    } else {
      // JSON snapshot (Default & Supabase PostgreSQL)
      const [schools, users, classes, students, cards, attendance] = await Promise.all([
        prisma.school.findMany(),
        prisma.user.findMany({ select: { id: true, name: true, username: true, role: true, schoolId: true } }),
        prisma.classRoom.findMany(),
        prisma.student.findMany(),
        prisma.studentCard.findMany(),
        prisma.attendance.findMany({ take: 5000, orderBy: { date: 'desc' } }),
      ]);

      const snapshot = {
        system: 'SISTEM PRESENSI SISWA SD/MI BERBASIS QR CODE',
        folderId: GOOGLE_DRIVE_FOLDER_ID,
        exportedAt: now.toISOString(),
        data: { schools, users, classes, students, cards, attendance },
      };

      fileContent = JSON.stringify(snapshot, null, 2);
      fileName = `backup-smartsiswa-${timestamp}.json`;
      mimeType = 'application/json';
      isBase64 = false;
    }

    // Send payload to Google Apps Script Webhook
    const gdriveResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        fileContent,
        mimeType,
        isBase64,
        folderId: GOOGLE_DRIVE_FOLDER_ID,
      }),
    });

    const resultText = await gdriveResponse.text();
    let resultJson: any = null;
    try {
      resultJson = JSON.parse(resultText);
    } catch (e) {
      resultJson = { raw: resultText };
    }

    if (!gdriveResponse.ok || (resultJson && resultJson.success === false)) {
      const errorMsg = resultJson?.error || resultText || 'Gagal mengirim berkas ke Webhook Google Drive.';
      await createAuditLog({
        action: 'GOOGLE_DRIVE_BACKUP_FAILED',
        actor: user?.name || 'Automated Scheduler',
        details: `Gagal mencadangkan ${fileName} ke Google Drive: ${errorMsg}`,
      });
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    await createAuditLog({
      action: 'GOOGLE_DRIVE_BACKUP_SUCCESS',
      actor: user?.name || 'Automated Scheduler (15 Hari)',
      details: `Berhasil mengunggah ${fileName} ke Google Drive (ID: ${resultJson.fileId || '-'})`,
    });

    return NextResponse.json({
      success: true,
      message: `Berkas ${fileName} berhasil diunggah dan disimpan ke folder Google Drive!`,
      fileName,
      result: resultJson,
    });
  } catch (error: any) {
    console.error('Google Drive backup error:', error);
    await createAuditLog({
      action: 'GOOGLE_DRIVE_BACKUP_FAILED',
      actor: 'System Error',
      details: `Exception: ${error.message}`,
    });
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
