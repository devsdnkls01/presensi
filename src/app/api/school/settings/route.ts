export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
    });

    return NextResponse.json({ school });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SCHOOL_ADMIN' || !user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { checkInStartTime, checkInEndTime, lateAfter } = body;

    const updated = await prisma.school.update({
      where: { id: user.schoolId },
      data: {
        ...(checkInStartTime ? { checkInStartTime } : {}),
        ...(checkInEndTime ? { checkInEndTime } : {}),
        ...(lateAfter ? { lateAfter } : {}),
      },
    });

    await createAuditLog({
      action: 'UPDATE_SCHOOL_SETTINGS',
      actor: user.name,
      details: `Mengubah aturan jam presensi: Mulai ${checkInStartTime}, Batas Hadir ${lateAfter}`,
      schoolId: user.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, school: updated });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
