export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getWIBDate, getWIBMonth } from '@/lib/dateUtils';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const month = searchParams.get('month') || getWIBMonth(); // e.g. "2026-09"
    const search = searchParams.get('search');

    // School ID resolution: Developer can query any school; others are bound to their school
    const schoolId = user.role === 'DEVELOPER'
      ? searchParams.get('schoolId') || user.schoolId
      : user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // Fetch school info
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        npsn: true,
        checkInStartTime: true,
        checkInEndTime: true,
        lateAfter: true,
      },
    });

    // Parse month (YYYY-MM)
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    // Fetch students in this school / class
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'AKTIF',
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
      include: {
        classRoom: true,
      },
      orderBy: [
        { classRoom: { grade: 'asc' } },
        { classRoom: { section: 'asc' } },
        { fullName: 'asc' },
      ],
    });

    // Fetch all attendance for this school in this date range
    const studentIds = students.map((s) => s.id);
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        date: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        studentId: true,
        date: true,
        time: true,
        status: true,
        scannedBy: true,
      },
      orderBy: { time: 'asc' },
    });

    // Group attendances by studentId and date
    const attendanceMap: Record<string, Record<string, { status: string; time: string; scannedBy: string }>> = {};
    for (const att of attendances) {
      if (!attendanceMap[att.studentId]) {
        attendanceMap[att.studentId] = {};
      }
      attendanceMap[att.studentId][att.date] = {
        status: att.status,
        time: att.time,
        scannedBy: att.scannedBy,
      };
    }

    // Fetch school holidays for this month
    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        schoolId,
        date: { gte: startDate, lte: endDate },
      },
    });
    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      holidayMap.set(h.date, h.description);
    }

    // Determine working days (exclude Sundays and registered School Holidays)
    const datesList: { date: string; dayNumber: number; dayName: string; isSunday: boolean; isHoliday: boolean; holidayName: string | null }[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    let effectiveSchoolDays = 0;
    const todayStr = getWIBDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${month}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(year, monthNum - 1, day);
      const dayOfWeek = dObj.getDay();
      const isSunday = dayOfWeek === 0;
      const holidayDesc = holidayMap.get(dStr) || null;
      const isHoliday = Boolean(holidayDesc);

      if (!isSunday && !isHoliday && dStr <= todayStr) {
        effectiveSchoolDays++;
      }

      datesList.push({
        date: dStr,
        dayNumber: day,
        dayName: dayNames[dayOfWeek],
        isSunday,
        isHoliday,
        holidayName: holidayDesc,
      });
    }

    // Build student recap matrix
    const matrix = students.map((student) => {
      const studentAtt = attendanceMap[student.id] || {};
      let countHadir = 0;
      let countTerlambat = 0;
      let countIzin = 0;
      let countSakit = 0;
      let countAlpha = 0;

      const dailyRecords: Record<string, { status: string; time: string } | null> = {};

      for (const d of datesList) {
        const record = studentAtt[d.date];
        if (record) {
          dailyRecords[d.date] = {
            status: record.status,
            time: record.time,
          };
          if (record.status === 'HADIR') countHadir++;
          else if (record.status === 'TERLAMBAT') countTerlambat++;
          else if (record.status === 'IZIN') countIzin++;
          else if (record.status === 'SAKIT') countSakit++;
          else if (record.status === 'ALPHA') countAlpha++;
        } else {
          dailyRecords[d.date] = null;
          if (!d.isSunday && !d.isHoliday && d.date <= todayStr) {
            countAlpha++;
          }
        }
      }

      const totalHadir = countHadir + countTerlambat;
      const percentage = effectiveSchoolDays > 0
        ? Math.round((totalHadir / effectiveSchoolDays) * 100)
        : 100;

      return {
        student: {
          id: student.id,
          fullName: student.fullName,
          nis: student.nis,
          nisn: student.nisn,
          gender: student.gender,
          photoUrl: student.photoUrl,
          className: student.classRoom.name,
          classId: student.classRoom.id,
        },
        daily: dailyRecords,
        summary: {
          hadirTepatWaktu: countHadir,
          terlambat: countTerlambat,
          totalHadir,
          izin: countIzin,
          sakit: countSakit,
          alpha: countAlpha,
          tidakHadir: countIzin + countSakit + countAlpha,
          persentase: percentage,
        },
      };
    });

    // Class / School Summary
    const totalStudents = students.length;
    const avgPercentage = totalStudents > 0
      ? Math.round(matrix.reduce((acc, m) => acc + m.summary.persentase, 0) / totalStudents)
      : 0;

    return NextResponse.json({
      school,
      month,
      daysInMonth,
      effectiveSchoolDays,
      datesList,
      totalStudents,
      avgPercentage,
      matrix,
    });
  } catch (error) {
    console.error('Attendance recap error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data rekap presensi' }, { status: 500 });
  }
}
