export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const schoolId = user.role === 'DEVELOPER' ? searchParams.get('schoolId') || user.schoolId : user.schoolId;

    if (!schoolId && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const classes = await prisma.classRoom.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        _count: {
          select: { students: true },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Fetch classes error:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SCHOOL_ADMIN' && user.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, grade, section, schoolId: overrideSchoolId } = body;
    const targetSchoolId = user.role === 'DEVELOPER' ? overrideSchoolId || user.schoolId : user.schoolId;

    if (!name || !grade || !targetSchoolId) {
      return NextResponse.json({ error: 'Nama kelas dan tingkat kelas wajib diisi.' }, { status: 400 });
    }

    const newClass = await prisma.classRoom.create({
      data: {
        name,
        grade: Number(grade),
        section: section || 'A',
        schoolId: targetSchoolId,
      },
    });

    return NextResponse.json({ success: true, classRoom: newClass });
  } catch (error) {
    console.error('Create class error:', error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
