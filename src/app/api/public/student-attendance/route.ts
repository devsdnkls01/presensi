export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWIBDate, getWIBMonth } from '@/lib/dateUtils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim();
    const month = searchParams.get('month') || getWIBMonth();

    if (!query) {
      return NextResponse.json({ error: 'Harap masukkan NIS, NISN, atau Card ID siswa.' }, { status: 400 });
    }

    // Attempt to locate student by:
    // 1. NIS
    // 2. NISN
    // 3. Card ID (via StudentCard)
    // 4. QR Token (via QrToken -> StudentCard)
    let student = await prisma.student.findFirst({
      where: {
        OR: [
          { nis: query },
          { nisn: query },
          { cards: { some: { cardId: query } } },
          { cards: { some: { qrToken: { token: query } } } },
        ],
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            npsn: true,
            checkInStartTime: true,
            checkInEndTime: true,
            lateAfter: true,
          },
        },
        classRoom: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        cards: {
          select: {
            id: true,
            cardId: true,
            status: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Siswa tidak ditemukan. Pastikan NIS, NISN, atau Card ID sudah benar.' },
        { status: 404 }
      );
    }

    // Today's attendance
    const todayStr = getWIBDate();
    const todayAttendance = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: todayStr,
        },
      },
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
        scannedBy: true,
      },
    });

    // Monthly attendance records
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    const monthlyAttendances = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
        scannedBy: true,
      },
      orderBy: { date: 'desc' },
    });

    // Fetch school holidays for this student's school
    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        schoolId: student.school.id,
        date: { gte: startDate, lte: endDate },
      },
    });
    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      holidayMap.set(h.date, h.description);
    }

    // Calculate effective school days up to today in this month (exclude Sundays and School Holidays)
    let effectiveSchoolDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${month}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(year, monthNum - 1, day);
      const isHoliday = holidayMap.has(dStr);
      if (dObj.getDay() !== 0 && !isHoliday && dStr <= todayStr) {
        effectiveSchoolDays++;
      }
    }

    const hadirTepatWaktu = monthlyAttendances.filter((a) => a.status === 'HADIR').length;
    const terlambat = monthlyAttendances.filter((a) => a.status === 'TERLAMBAT').length;
    const totalHadir = hadirTepatWaktu + terlambat;
    const totalIzin = monthlyAttendances.filter((a) => a.status === 'IZIN').length;
    const totalSakit = monthlyAttendances.filter((a) => a.status === 'SAKIT').length;
    const totalAlpha = Math.max(0, effectiveSchoolDays - (totalHadir + totalIzin + totalSakit));

    const persentase = effectiveSchoolDays > 0
      ? Math.min(100, Math.round((totalHadir / effectiveSchoolDays) * 100))
      : 100;

    // Compute daily calendar items
    const daysList = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${month}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(year, monthNum - 1, day);
      const isSunday = dObj.getDay() === 0;
      const holidayDesc = holidayMap.get(dStr) || null;
      const isHoliday = Boolean(holidayDesc);
      const match = monthlyAttendances.find((a) => a.date === dStr);

      let status = 'AKAN_DATANG';
      if (match) {
        status = match.status;
      } else if (isSunday || isHoliday) {
        status = 'LIBUR';
      } else if (dStr <= todayStr) {
        status = 'ALPHA';
      }

      daysList.push({
        dayNumber: day,
        date: dStr,
        isSunday,
        isHoliday,
        holidayName: holidayDesc,
        hasAttended: !!match,
        status,
        time: match?.time,
      });
    }

    const stats = {
      totalHadir,
      totalTerlambat: terlambat,
      totalTepatWaktu: hadirTepatWaktu,
      totalIzin,
      totalSakit,
      totalAlpha,
      attendanceRate: persentase,
      effectiveSchoolDays,
      daysInMonth,
    };

    const calendar = {
      daysInMonth,
      days: daysList.map((d) => ({
        day: d.dayNumber,
        date: d.date,
        isWeekend: d.isSunday,
        status: d.status === 'HADIR' ? 'HADIR' : d.status === 'TERLAMBAT' ? 'TERLAMBAT' : d.status === 'BELUM' ? null : d.status,
        time: d.time,
      })),
    };

    return NextResponse.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        nis: student.nis,
        nisn: student.nisn,
        gender: student.gender,
        photoUrl: student.photoUrl,
        status: student.status,
        schoolName: student.school.name,
        className: student.classRoom.name,
        cardId: student.cards[0]?.cardId || '-',
        cardStatus: student.cards[0]?.status || 'BELUM_ADA',
      },
      schoolRules: {
        checkInStartTime: student.school.checkInStartTime,
        checkInEndTime: student.school.checkInEndTime,
        lateAfter: student.school.lateAfter,
      },
      todayAttendance,
      today: {
        hasAttended: !!todayAttendance,
        record: todayAttendance,
        date: todayStr,
      },
      stats,
      monthSummary: {
        month,
        daysInMonth,
        effectiveSchoolDays,
        hadirTepatWaktu,
        terlambat,
        totalHadir,
        persentase,
      },
      calendar,
      daysList,
      monthlyAttendances,
    });
  } catch (error) {
    console.error('Public student attendance query error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
