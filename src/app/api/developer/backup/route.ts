export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Akses terbatas untuk Developer/Admin Pusat' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json'; // 'json' (default Supabase PostgreSQL) or 'sqlite'

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

    await createAuditLog({
      action: 'DATABASE_BACKUP_CREATED',
      actor: user.name,
      details: `Mengunduh cadangan snapshot database sistem (format: ${format.toUpperCase()})`,
    });

    if (format === 'json') {
      // Export full relational snapshot as JSON
      const [
        schools,
        users,
        classes,
        students,
        cards,
        qrTokens,
        attendance,
        printRequests,
        holidays,
        auditLogs,
      ] = await Promise.all([
        prisma.school.findMany(),
        prisma.user.findMany({ select: { id: true, name: true, username: true, role: true, schoolId: true, createdAt: true } }),
        prisma.classRoom.findMany(),
        prisma.student.findMany(),
        prisma.studentCard.findMany(),
        prisma.qrToken.findMany(),
        prisma.attendance.findMany(),
        prisma.cardPrintRequest.findMany(),
        (prisma as any).schoolHoliday ? (prisma as any).schoolHoliday.findMany() : Promise.resolve([]),
        prisma.auditLog.findMany({ take: 200, orderBy: { createdAt: 'desc' } }),
      ]);

      const snapshot = {
        system: 'SISTEM PRESENSI SISWA SD/MI BERBASIS QR CODE',
        version: '1.0.0',
        exportedAt: now.toISOString(),
        exportedBy: user.name,
        counts: {
          schools: schools.length,
          users: users.length,
          classes: classes.length,
          students: students.length,
          cards: cards.length,
          qrTokens: qrTokens.length,
          attendance: attendance.length,
          printRequests: printRequests.length,
          holidays: holidays.length,
        },
        data: {
          schools,
          users,
          classes,
          students,
          cards,
          qrTokens,
          attendance,
          printRequests,
          holidays,
          auditLogs,
        },
      };

      const jsonStr = JSON.stringify(snapshot, null, 2);
      const filename = `backup-smartsiswa-${timestamp}.json`;

      return new NextResponse(jsonStr, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: Return the physical SQLite .db binary file
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ 
        error: 'Database utama kini telah bermigrasi ke Supabase PostgreSQL. Silakan gunakan format JSON untuk mencadangkan data langsung dari server cloud.',
        isCloudPostgres: true 
      }, { status: 400 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const filename = `backup-smartsiswa-${timestamp}.db`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Backup database error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat cadangan database.' }, { status: 500 });
  }
}
