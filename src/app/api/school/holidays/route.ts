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
    const schoolId = user.role === 'DEVELOPER' ? searchParams.get('schoolId') || user.schoolId : user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID missing' }, { status: 400 });
    }

    const month = searchParams.get('month'); // "YYYY-MM" (optional)

    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        schoolId,
        ...(month ? { date: { startsWith: month } } : {}),
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Fetch holidays error:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SCHOOL_ADMIN' && user.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { date, description, schoolId: overrideSchoolId } = body;

    const schoolId = user.role === 'DEVELOPER' ? overrideSchoolId || user.schoolId : user.schoolId;

    if (!schoolId || !date || !description) {
      return NextResponse.json({ error: 'Tanggal dan keterangan hari libur wajib diisi.' }, { status: 400 });
    }

    // Upsert holiday for this school and date
    const holiday = await prisma.schoolHoliday.upsert({
      where: {
        schoolId_date: {
          schoolId,
          date,
        },
      },
      update: {
        description,
      },
      create: {
        schoolId,
        date,
        description,
      },
    });

    await createAuditLog({
      action: 'SCHOOL_HOLIDAY_SET',
      actor: user.name,
      details: `Menetapkan hari libur pada tanggal ${date}: ${description}`,
      schoolId,
    });

    return NextResponse.json({ holiday, message: 'Hari libur berhasil disimpan.' });
  } catch (error: any) {
    console.error('Save holiday error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan hari libur.' }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: 'ID hari libur wajib disertakan.' }, { status: 400 });
    }

    const existing = await prisma.schoolHoliday.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Hari libur tidak ditemukan.' }, { status: 404 });
    }

    if (user.role !== 'DEVELOPER' && existing.schoolId !== user.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    await prisma.schoolHoliday.delete({
      where: { id },
    });

    await createAuditLog({
      action: 'SCHOOL_HOLIDAY_DELETED',
      actor: user.name,
      details: `Menghapus hari libur tanggal ${existing.date} (${existing.description})`,
      schoolId: existing.schoolId,
    });

    return NextResponse.json({ success: true, message: 'Hari libur berhasil dihapus.' });
  } catch (error: any) {
    console.error('Delete holiday error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus hari libur.' }, { status: 500 });
  }
}
