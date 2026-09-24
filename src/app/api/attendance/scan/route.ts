export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getWIBDate, getWIBTime } from '@/lib/dateUtils';
import {
  hasScannedTodayInGlobalConfig,
  recordScanToGlobalConfig,
  lookupCardInGlobalConfig,
  warmUpGlobalCards,
} from '@/lib/globalConfig';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await req.json();
    const { token, deviceInfo } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Token QR tidak valid.' }, { status: 200 });
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

    // If the QR scanned is a URL, extract query or token parameter
    try {
      if (trimmedToken.startsWith('http://') || trimmedToken.startsWith('https://')) {
        const parsed = new URL(trimmedToken);
        const extracted = parsed.searchParams.get('token') || parsed.searchParams.get('query') || parsed.searchParams.get('nis');
        if (extracted) {
          trimmedToken = extracted.trim();
        }
      }
    } catch (e) {}

    const localDateStr = getWIBDate();
    const localTimeStr = getWIBTime();

    // 1. FAST-PATH: Instant Lookup in Global Config Card Cache
    let cardData = lookupCardInGlobalConfig(trimmedToken);

    // Fallback: If not found in memory cache, query DB and warm up cache
    if (!cardData) {
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

      let qrTokenRecord = await prisma.qrToken.findUnique({
        where: { token: trimmedToken },
        include: studentInclude,
      });

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
          { status: 200 }
        );
      }

      cardData = qrTokenRecord.card;
      // Warm up global cache with this record
      warmUpGlobalCards([qrTokenRecord.card]);
    }

    const card = cardData;
    const student = card.student;
    const school = student.school || { lateAfter: '07:45', name: 'Sekolah' };

    // 2. Check if card was explicitly deactivated (NONAKTIF)
    if (card.status === 'NONAKTIF') {
      return NextResponse.json(
        {
          success: false,
          code: 'INACTIVE',
          error: 'Kartu ini telah dinonaktifkan oleh sekolah / Developer.',
          student: {
            fullName: student.fullName,
            nis: student.nis,
            className: student.classRoom?.name || '',
            cardId: card.cardId,
          },
        },
        { status: 200 }
      );
    }

    // Multi-tenant check: if teacher is from a specific school, verify student belongs to same school
    if (user.role === 'TEACHER' && user.schoolId && user.schoolId !== student.schoolId) {
      return NextResponse.json(
        {
          success: false,
          code: 'WRONG_SCHOOL',
          error: `Siswa ini terdaftar di ${school.name}, bukan sekolah Anda.`,
        },
        { status: 200 }
      );
    }

    // 3. CHECK DUPLICATE SCAN IN GLOBAL CONFIG (0ms Latency)
    const existingInGlobal = hasScannedTodayInGlobalConfig(student.id, localDateStr);
    if (existingInGlobal) {
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_SCANNED',
          error: 'Siswa sudah melakukan presensi hari ini (Global Config).',
          attendance: {
            time: existingInGlobal.time,
            date: existingInGlobal.date,
            status: existingInGlobal.status,
            scannedBy: existingInGlobal.scannedBy,
          },
          student: {
            id: student.id,
            fullName: student.fullName,
            nis: student.nis,
            nisn: student.nisn,
            gender: student.gender,
            className: student.classRoom?.name || '',
            photoUrl: student.photoUrl,
            cardId: card.cardId,
            schoolName: school.name,
          },
        },
        { status: 200 }
      );
    }

    // Fallback check in Supabase (if previously persisted before server reboot)
    const existingInDb = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: localDateStr,
        },
      },
    });

    if (existingInDb) {
      // Re-populate global config cache
      await recordScanToGlobalConfig({
        studentId: student.id,
        schoolId: student.schoolId,
        date: existingInDb.date,
        time: existingInDb.time,
        status: existingInDb.status as 'HADIR' | 'TERLAMBAT',
        scannedBy: existingInDb.scannedBy,
        deviceInfo: existingInDb.deviceInfo || 'Database Sync',
      });

      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_SCANNED',
          error: 'Siswa sudah melakukan presensi hari ini.',
          attendance: existingInDb,
          student: {
            id: student.id,
            fullName: student.fullName,
            nis: student.nis,
            nisn: student.nisn,
            gender: student.gender,
            className: student.classRoom?.name || '',
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
    const attendanceStatus: 'HADIR' | 'TERLAMBAT' = isLate ? 'TERLAMBAT' : 'HADIR';

    // 5. STORE IN PRESENSI-GLOBAL-CONFIG AND SUPABASE DATABASE (Real-time sync)
    const recordedScan = await recordScanToGlobalConfig({
      studentId: student.id,
      schoolId: student.schoolId,
      date: localDateStr,
      time: localTimeStr,
      status: attendanceStatus,
      scannedBy: user.name,
      deviceInfo: deviceInfo || 'Kamera HP (Native 60FPS)',
      studentData: {
        id: student.id,
        fullName: student.fullName,
        nis: student.nis,
        nisn: student.nisn,
        gender: student.gender,
        className: student.classRoom?.name || '',
        photoUrl: student.photoUrl,
        cardId: card.cardId,
        schoolName: school.name,
      },
    });

    let attendanceDbRecord;
    try {
      attendanceDbRecord = await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: student.id,
            date: localDateStr,
          },
        },
        create: {
          studentId: student.id,
          schoolId: student.schoolId,
          date: localDateStr,
          time: localTimeStr,
          status: attendanceStatus,
          scannedBy: user.name,
          deviceInfo: deviceInfo || 'Kamera HP (Native 60FPS)',
        },
        update: {
          time: localTimeStr,
          status: attendanceStatus,
          scannedBy: user.name,
        },
      });
    } catch (e) {
      console.warn('DB attendance upsert fallback:', e);
    }

    return NextResponse.json({
      success: true,
      code: 'SUCCESS',
      status: attendanceStatus,
      time: localTimeStr,
      date: localDateStr,
      engine: 'presensi-global-config',
      student: {
        id: student.id,
        fullName: student.fullName,
        nis: student.nis,
        nisn: student.nisn,
        gender: student.gender,
        className: student.classRoom?.name || '',
        photoUrl: student.photoUrl,
        cardId: card.cardId,
        schoolName: school.name,
      },
      attendance: attendanceDbRecord || {
        id: recordedScan.id || `gc_${Date.now()}`,
        date: localDateStr,
        time: localTimeStr,
        status: attendanceStatus,
        scannedBy: user.name,
      },
    });
  } catch (error) {
    console.error('Attendance scan error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses presensi.' },
      { status: 500 }
    );
  }
}
