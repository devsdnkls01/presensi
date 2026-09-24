export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const schoolId = user.schoolId;
    if (!schoolId && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'School ID missing' }, { status: 400 });
    }

    const requests = await prisma.cardPrintRequest.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        school: true,
        cards: {
          include: {
            student: {
              include: { classRoom: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Fetch print requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch print requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentIds, notes } = await req.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal satu siswa untuk diajukan cetak.' }, { status: 400 });
    }

    const schoolId = user.schoolId!;

    // Check photo completeness for every requested student (Poin 43)
    const selectedStudents = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId,
      },
      select: { id: true, fullName: true, photoUrl: true },
    });

    const studentsWithoutPhoto = selectedStudents.filter((s) => !s.photoUrl || s.photoUrl.trim() === '');
    if (studentsWithoutPhoto.length > 0) {
      const names = studentsWithoutPhoto.map((s) => s.fullName).join(', ');
      return NextResponse.json(
        {
          error: `Pengajuan cetak ditolak! Terdapat ${studentsWithoutPhoto.length} siswa yang belum memiliki pasfoto: ${names}. Harap lengkapi pasfoto siswa terlebih dahulu sebelum mengajukan pencetakan fisik kartu.`,
        },
        { status: 400 }
      );
    }

    // Generate Request Number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const requestNumber = `REQ-${datePrefix}-${randSuffix}`;

    // Create the Print Request
    const printRequest = await prisma.cardPrintRequest.create({
      data: {
        requestNumber,
        schoolId,
        status: 'MENUNGGU_VERIFIKASI',
        notes: notes || null,
      },
    });

    // Find cards for these students or create cards if they don't have one
    for (const sId of studentIds) {
      let card = await prisma.studentCard.findFirst({
        where: { studentId: sId },
      });

      if (!card) {
        const school = await prisma.school.findUnique({ where: { id: schoolId } });
        const schoolCode = (school?.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'SCH').toUpperCase();
        const randomSeq = Math.floor(100000 + Math.random() * 900000);
        const cardId = `${schoolCode}-${new Date().getFullYear()}-${randomSeq}`;

        card = await prisma.studentCard.create({
          data: {
            cardId,
            studentId: sId,
            status: 'DIAJUKAN',
            printRequestId: printRequest.id,
          },
        });
      } else {
        await prisma.studentCard.update({
          where: { id: card.id },
          data: {
            status: 'DIAJUKAN',
            printRequestId: printRequest.id,
          },
        });
      }

      // Ensure QR token exists for this card
      const existingToken = await prisma.qrToken.findUnique({
        where: { cardId: card.id },
      });

      if (!existingToken) {
        // Generate secure token STU-XXXXXXXX
        const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
        const token = `STU-${randomHex}`;

        await prisma.qrToken.create({
          data: {
            token,
            cardId: card.id,
            isActive: false, // will become active once developer marks it AKTIF
          },
        });
      }
    }

    await createAuditLog({
      action: 'SUBMIT_PRINT_REQUEST',
      actor: user.name,
      details: `Mengajukan cetak kartu untuk ${studentIds.length} siswa (No: ${requestNumber})`,
      schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      printRequest,
      totalCards: studentIds.length,
    });
  } catch (error) {
    console.error('Submit print request error:', error);
    return NextResponse.json({ error: 'Gagal mengajukan cetak kartu.' }, { status: 500 });
  }
}
