export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER' && user.role !== 'SCHOOL_ADMIN' && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, date, status, notes } = body;

    if (!studentId || !status) {
      return NextResponse.json({ error: 'Siswa dan status kehadiran wajib dipilih.' }, { status: 400 });
    }

    const validStatuses = ['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status tidak valid. Pilihan: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Verify student exists and belongs to school
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true, classRoom: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Data siswa tidak ditemukan.' }, { status: 404 });
    }

    if (user.role !== 'DEVELOPER' && student.schoolId !== user.schoolId) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk siswa sekolah lain.' }, { status: 403 });
    }

    const now = new Date();
    const recordDate = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const recordTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId: student.id,
          date: recordDate,
        },
      },
      update: {
        status,
        time: recordTime,
        scannedBy: `${user.name} (Manual)`,
        deviceInfo: 'Input Manual Guru',
        notes: notes || null,
      },
      create: {
        studentId: student.id,
        schoolId: student.schoolId,
        date: recordDate,
        time: recordTime,
        status,
        scannedBy: `${user.name} (Manual)`,
        deviceInfo: 'Input Manual Guru',
        notes: notes || null,
      },
    });

    await createAuditLog({
      action: 'MANUAL_ATTENDANCE_RECORDED',
      actor: user.name,
      details: `Pencatatan manual presensi ${student.fullName} (${student.classRoom.name}): ${status} - Catatan: ${notes || '-'}`,
      schoolId: student.schoolId,
    });

    return NextResponse.json({
      success: true,
      attendance,
      message: `Presensi ${student.fullName} berhasil dicatat sebagai ${status}.`,
    });
  } catch (error: any) {
    console.error('Manual attendance error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan presensi manual.' }, { status: 500 });
  }
}
