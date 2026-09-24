import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import TeacherAttendanceManager from '@/components/TeacherAttendanceManager';
import { getWIBDate } from '@/lib/dateUtils';

export default async function TeacherAttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const todayStr = getWIBDate();

  const attendances = await prisma.attendance.findMany({
    where: {
      date: todayStr,
      ...(user.schoolId ? { schoolId: user.schoolId } : {}),
    },
    include: {
      student: {
        include: {
          classRoom: true,
        },
      },
    },
    orderBy: {
      time: 'desc',
    },
  });

  const schoolStudents = await prisma.student.findMany({
    where: {
      status: 'AKTIF',
      ...(user.schoolId ? { schoolId: user.schoolId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      nis: true,
      classRoom: {
        select: { name: true },
      },
    },
    orderBy: [
      { classRoom: { grade: 'asc' } },
      { classRoom: { section: 'asc' } },
      { fullName: 'asc' },
    ],
  });

  return (
    <AppLayout user={user}>
      <TeacherAttendanceManager
        initialAttendances={attendances as any}
        schoolStudents={schoolStudents}
        todayStr={todayStr}
        schoolName={user.schoolName || 'Semua Sekolah'}
      />
    </AppLayout>
  );
}
