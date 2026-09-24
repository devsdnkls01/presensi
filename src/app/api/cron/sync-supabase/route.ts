export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { getWIBDate, getWIBTime } from '@/lib/dateUtils';
import { migrateGlobalScansToSupabase, getTodayScansFromGlobalConfig } from '@/lib/globalConfig';

/**
 * 24-Hour Automated Migration Engine:
 * Migrates all scan records buffered in presensi-global-config to Supabase
 * Runs automatically every 24 hours via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET || 'smartsiswa-cron-secret-backup-key-2026';
    const authHeader = req.headers.get('authorization');
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';

    // Verify bearer token or Vercel cron header
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      const { searchParams } = new URL(req.url);
      if (searchParams.get('key') !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
      }
    }

    const todayDate = getWIBDate();
    const nowTime = getWIBTime();

    // 1. MIGRATE BUFFERED SCANS FROM PRESENSI-GLOBAL-CONFIG TO SUPABASE
    const migrationResult = await migrateGlobalScansToSupabase(todayDate);

    // 2. Ensure all student cards that have active tokens are marked as AKTIF
    const unactivatedTokens = await prisma.qrToken.findMany({
      where: {
        isActive: true,
        card: { status: { not: 'AKTIF' } },
      },
      include: { card: true },
    });

    let autoActivatedCount = 0;
    for (const item of unactivatedTokens) {
      if (item.card && item.card.status !== 'NONAKTIF') {
        await prisma.studentCard.update({
          where: { id: item.card.id },
          data: { status: 'AKTIF', activatedAt: new Date() },
        });
        autoActivatedCount++;
      }
    }

    // 3. Count total synced attendance in Supabase
    const totalTodayInSupabase = await prisma.attendance.count({
      where: { date: todayDate },
    });

    // 4. Log 24-hour sync event to Supabase Audit Log
    await createAuditLog({
      action: 'MIGRATE_GLOBAL_CONFIG_TO_SUPABASE_24H',
      actor: 'Automated Migration Cron (24h)',
      details: `Migrasi 24 Jam Selesai: ${migrationResult.insertedCount} scan baru dimigrasikan dari presensi-global-config ke Supabase. Total hari ini: ${totalTodayInSupabase} presensi. ${autoActivatedCount} kartu diselaraskan.`,
    });

    return NextResponse.json({
      success: true,
      engine: 'presensi-global-config -> supabase',
      message: '24-Hour Migration from Global Config to Supabase Completed Successfully',
      timestamp: `${todayDate} ${nowTime} WIB`,
      stats: {
        totalBufferedInGlobalConfig: migrationResult.totalBuffered,
        newlyInsertedToSupabase: migrationResult.insertedCount,
        alreadyPresent: migrationResult.alreadyPresentCount,
        totalTodayInSupabase,
        cardsAutoActivated: autoActivatedCount,
        errors: migrationResult.errors,
      },
    });
  } catch (error: any) {
    console.error('24-Hour Supabase Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}
