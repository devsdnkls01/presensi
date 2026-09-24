export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requests = await prisma.cardPrintRequest.findMany({
      include: {
        school: true,
        cards: {
          include: {
            student: {
              include: { classRoom: true },
            },
            qrToken: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Fetch developer print requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// Actions: VERIFY, GENERATE_BATCH, MARK_PRINTED, FINISH_ACTIVATE
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { requestId, action } = await req.json();

    const request = await prisma.cardPrintRequest.findUnique({
      where: { id: requestId },
      include: {
        school: true,
        cards: { include: { student: true, qrToken: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
    }

    if (action === 'VERIFY') {
      await prisma.cardPrintRequest.update({
        where: { id: requestId },
        data: { status: 'DIVERIFIKASI' },
      });

      // Update cards to DIVERIFIKASI
      for (const card of request.cards) {
        await prisma.studentCard.update({
          where: { id: card.id },
          data: { status: 'DIVERIFIKASI' },
        });
      }

      await createAuditLog({
        action: 'VERIFY_PRINT_REQUEST',
        actor: user.name,
        details: `Verifikasi pengajuan cetak No ${request.requestNumber} (${request.school.name} - ${request.cards.length} kartu)`,
        schoolId: request.schoolId,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, status: 'DIVERIFIKASI' });
    }

    if (action === 'GENERATE_BATCH') {
      // Create a production print batch for Legal paper (8.5 x 14 inch)
      const batchNum = `BATCH-LEG-${Date.now().toString().slice(-6)}`;

      const batch = await prisma.cardPrintBatch.create({
        data: {
          batchNumber: batchNum,
          paperSize: 'LEGAL',
          totalCards: request.cards.length,
          status: 'SIAP_CETAK',
        },
      });

      await prisma.cardPrintRequest.update({
        where: { id: requestId },
        data: { status: 'DALAM_PROSES' },
      });

      // Update cards to SIAP_CETAK and assign to batch
      for (const card of request.cards) {
        await prisma.studentCard.update({
          where: { id: card.id },
          data: {
            status: 'SIAP_CETAK',
            batchId: batch.id,
          },
        });
      }

      await createAuditLog({
        action: 'GENERATE_PRINT_BATCH',
        actor: user.name,
        details: `Generate batch cetak lembar Legal ${batchNum} (${request.cards.length} kartu)`,
        schoolId: request.schoolId,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, batch, status: 'SIAP_CETAK' });
    }

    if (action === 'FINISH_ACTIVATE') {
      // Mark cards DICETAK and AKTIF
      await prisma.cardPrintRequest.update({
        where: { id: requestId },
        data: { status: 'SELESAI' },
      });

      for (const card of request.cards) {
        await prisma.studentCard.update({
          where: { id: card.id },
          data: {
            status: 'AKTIF',
            activatedAt: new Date(),
          },
        });

        if (card.qrToken) {
          await prisma.qrToken.update({
            where: { id: card.qrToken.id },
            data: { isActive: true },
          });
        }
      }

      await createAuditLog({
        action: 'ACTIVATE_CARDS',
        actor: user.name,
        details: `Menyelesaikan cetak & mengaktifkan ${request.cards.length} kartu untuk ${request.school.name}`,
        schoolId: request.schoolId,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, status: 'SELESAI' });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (error) {
    console.error('Process print request error:', error);
    return NextResponse.json({ error: 'Gagal memproses pengajuan cetak.' }, { status: 500 });
  }
}
