export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await req.json();
    const { token, deviceInfo } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token QR tidak valid.' }, { status: 400 });
    }

    let trimmedToken = token.trim();

    // If the QR scanned is a JSON string, extract token or cardId
    try {
      if (trimmedToken.startsWith('{') && trimmedToken.endsWith('}')) {
        const parsedJson = JSON.parse(trimmedToken);
        if (parsedJson.token) {
          trimmedToken = parsedJson.token.trim();
        } else if (parsedJson.cardId) {
          trimmedToken = parsedJson.cardId.trim();
        }
      }
    } catch (e) {}

    // If the QR scanned is a URL, extract the query or token parameter
    try {
      if (trimmedToken.startsWith('http://') || trimmedToken.startsWith('https://')) {
        const parsed = new URL(trimmedToken);
        const extracted = parsed.searchParams.get('token') || parsed.searchParams.get('query') || parsed.searchParams.get('nis');
        if (extracted) {
          trimmedToken = extracted.trim();
        }
      }
    } catch (e) {}

    const studentInclude = {
      card: {
        include: {
          student: {
            include: {
              school: true,
              classRoom: true,
            },
          },
        },
      },
    };

    // 1. Fast-path lookup by unique QR token (indexed B-tree: 1ms)
    let qrTokenRecord = await prisma.qrToken.findUnique({
      where: { token: trimmedToken },
      include: studentInclude,
    });

    // Fallback: If not found by unique token, check cardId or student NIS
    if (!qrTokenRecord) {
      qrTokenRecord = await prisma.qrToken.findFirst({
        where: {
          OR: [
            { card: { cardId: trimmedToken } },
            { card: { student: { nis: trimmedToken } } },
          ],
        },
        include: studentInclude,
      });
    }

    if (!qrTokenRecord) {
      return NextResponse.json(
        {
          success: false,
          code: 'UNREGISTERED',
          error: `QR Code tidak terdaftar (${trimmedToken}). Pastikan kartu dicetak dari sistem SmartSiswa.`,
        },
        { status: 404 }
      );
    }

    const { card } = qrTokenRecord;

    // 2. Check if card was explicitly deactivated (NONAKTIF)
    if (card.status === 'NONAKTIF') {
      return NextResponse.json(
        {
          success: false,
          code: 'INACTIVE',
          error: 'Kartu ini telah dinonaktifkan oleh sekolah / Developer.',
          student: {
            fullName: card.student.fullName,
            nis: card.student.nis,
            className: card.student.classRoom.name,
            cardId: card.cardId,
          },
        },
        { status: 400 }
      );
    }

    // Auto-activate card and token if previously DICETAK / SIAP_CETAK / DRAFT
    if (card.status !== 'AKTIF' || !qrTokenRecord.isActive) {
      await prisma.studentCard.update({
        where: { id: card.id },
        data: {
          status: 'AKTIF',
          activatedAt: card.activatedAt || new Date(),
        },
      });

      await prisma.qrToken.update({
        where: { id: qrTokenRecord.id },
        data: { isActive: true },
      });
    }

    const student = card.student;
    const school = student.school;

    // Multi-tenant check: if teacher is from a specific school, verify student belongs to the same school
    if (user.role === 'TEACHER' && user.schoolId && user.schoolId !== student.schoolId) {
      return NextResponse.json(
        {
          success: false,
          code: 'WRONG_SCHOOL',
          error: `Siswa ini terdaftar di ${school.name}, bukan sekolah Anda.`,
        },
        { status: 403 }
      );
    }

    // 3. Current time & check if already scanned today
    const now = new Date();
    // Format YYYY-MM-DD in local time
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const localTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: localDateStr,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_SCANNED',
          error: 'Siswa sudah melakukan presensi hari ini.',
          attendance: existingAttendance,
          student: {
            id: student.id,
            fullName: student.fullName,
            nis: student.nis,
            nisn: student.nisn,
            gender: student.gender,
            className: student.classRoom.name,
            photoUrl: student.photoUrl,
            cardId: card.cardId,
            schoolName: school.name,
          },
        },
        { status: 200 }
      );
    }

    // 4. Determine status: HADIR vs TERLAMBAT based on school rules
    const lateThreshold = school.lateAfter || '07:45';
    const isLate = localTimeStr.localeCompare(lateThreshold) > 0;
    const attendanceStatus = isLate ? 'TERLAMBAT' : 'HADIR';

    // 5. Create attendance record with race condition protection (prevents 500 collision errors)
    let attendance;
    try {
      attendance = await prisma.attendance.create({
        data: {
          studentId: student.id,
          schoolId: student.schoolId,
          date: localDateStr,
          time: localTimeStr,
          status: attendanceStatus,
          scannedBy: user.name,
          deviceInfo: deviceInfo || 'Web Scanner (Camera)',
        },
      });
    } catch (createError: any) {
      // If concurrent request created it at the exact same millisecond
      if (createError?.code === 'P2002') {
        const fallbackExisting = await prisma.attendance.findUnique({
          where: {
            studentId_date: {
              studentId: student.id,
              date: localDateStr,
            },
          },
        });
        return NextResponse.json(
          {
            success: false,
            code: 'ALREADY_SCANNED',
            error: 'Siswa sudah melakukan presensi hari ini.',
            attendance: fallbackExisting,
            student: {
              id: student.id,
              fullName: student.fullName,
              nis: student.nis,
              nisn: student.nisn,
              gender: student.gender,
              className: student.classRoom.name,
              photoUrl: student.photoUrl,
              cardId: card.cardId,
              schoolName: school.name,
            },
          },
          { status: 200 }
        );
      }
      throw createError;
    }

    // 6. Create audit log in background (non-blocking for ultra-fast scan latency)
    createAuditLog({
      action: 'SCAN_ATTENDANCE',
      actor: user.name,
      details: `Scan QR ${student.fullName} (NIS: ${student.nis}, ${student.classRoom.name}) - Status: ${attendanceStatus} pada ${localTimeStr}`,
      schoolId: student.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    }).catch((err) => console.error('Scan audit log background error:', err));

    return NextResponse.json({
      success: true,
      code: 'SUCCESS',
      status: attendanceStatus,
      time: localTimeStr,
      date: localDateStr,
      student: {
        id: student.id,
        fullName: student.fullName,
        nis: student.nis,
        nisn: student.nisn,
        gender: student.gender,
        className: student.classRoom.name,
        photoUrl: student.photoUrl,
        cardId: card.cardId,
        schoolName: school.name,
      },
      attendance,
    });
  } catch (error) {
    console.error('Attendance scan error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses presensi.' },
      { status: 500 }
    );
  }
}
