export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const schoolId = user.role === 'DEVELOPER' ? searchParams.get('schoolId') || user.schoolId : user.schoolId;

    const attendances = await prisma.attendance.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(date ? { date } : {}),
        ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
        ...(status ? { status } : {}),
        student: {
          ...(classId ? { classRoomId: classId } : {}),
          ...(search
            ? {
                OR: [
                  { fullName: { contains: search } },
                  { nis: { contains: search } },
                ],
              }
            : {}),
        },
      },
      include: {
        student: {
          include: {
            classRoom: true,
            school: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Fetch attendance error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SCHOOL_ADMIN' && user.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const date = searchParams.get('date');
    const all = searchParams.get('all');

    // Multi-tenant check: Non-developers are strictly locked to user.schoolId
    const targetSchoolId = user.role === 'DEVELOPER'
      ? searchParams.get('schoolId') || user.schoolId
      : user.schoolId;

    if (!targetSchoolId && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'School ID missing.' }, { status: 400 });
    }

    // Single Record Deletion
    if (id) {
      const existing = await prisma.attendance.findUnique({
        where: { id },
        include: { student: true, school: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Catatan presensi tidak ditemukan.' }, { status: 404 });
      }

      // Tenant isolation verification
      if (user.role !== 'DEVELOPER' && existing.schoolId !== user.schoolId) {
        return NextResponse.json({ error: 'Akses Ditolak: Anda tidak memiliki izin untuk presensi sekolah lain.' }, { status: 403 });
      }

      await prisma.attendance.delete({
        where: { id },
      });

      await createAuditLog({
        action: 'DELETE_ATTENDANCE_RECORD',
        actor: user.name,
        details: `Menghapus presensi ${existing.student.fullName} tanggal ${existing.date} (${existing.status})`,
        schoolId: existing.schoolId,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, message: 'Catatan presensi berhasil dihapus.' });
    }

    // Bulk Deletion for All Records in School
    if (all === 'true') {
      if (!targetSchoolId) {
        return NextResponse.json({ error: 'School ID diperlukan untuk penghapusan massal.' }, { status: 400 });
      }

      const res = await prisma.attendance.deleteMany({
        where: {
          schoolId: targetSchoolId,
        },
      });

      await createAuditLog({
        action: 'DELETE_ALL_ATTENDANCE',
        actor: user.name,
        details: `Menghapus seluruh rekaman presensi sekolah (${res.count} catatan)`,
        schoolId: targetSchoolId,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, count: res.count, message: `Semua data presensi (${res.count} catatan) berhasil dihapus.` });
    }

    // Date-specific Deletion
    if (date) {
      if (!targetSchoolId) {
        return NextResponse.json({ error: 'School ID diperlukan.' }, { status: 400 });
      }

      const res = await prisma.attendance.deleteMany({
        where: {
          schoolId: targetSchoolId,
          date,
        },
      });

      await createAuditLog({
        action: 'DELETE_DATE_ATTENDANCE',
        actor: user.name,
        details: `Menghapus presensi sekolah untuk tanggal ${date} (${res.count} catatan)`,
        schoolId: targetSchoolId,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, count: res.count, message: `Data presensi tanggal ${date} (${res.count} catatan) berhasil dihapus.` });
    }

    return NextResponse.json({ error: 'Parameter id, date, atau all diperlukan.' }, { status: 400 });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return NextResponse.json({ error: 'Failed to delete attendance' }, { status: 500 });
  }
}

