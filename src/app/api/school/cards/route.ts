export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const schoolId = user.schoolId;
    if (!schoolId && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'School ID missing' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const cards = await prisma.studentCard.findMany({
      where: {
        student: {
          ...(schoolId ? { schoolId } : {}),
        },
        ...(status ? { status } : {}),
      },
      include: {
        student: {
          include: {
            classRoom: true,
            school: true,
          },
        },
        qrToken: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Fetch school cards error:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
