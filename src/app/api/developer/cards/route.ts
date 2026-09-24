export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classRoomId = searchParams.get('classRoomId');
    const status = searchParams.get('status');

    const cards = await prisma.studentCard.findMany({
      where: {
        ...(schoolId || classRoomId
          ? {
              student: {
                ...(schoolId ? { schoolId } : {}),
                ...(classRoomId ? { classRoomId } : {}),
              },
            }
          : {}),
        ...(status ? { status } : {}),
      },
      include: {
        student: {
          include: {
            school: true,
            classRoom: true,
          },
        },
        qrToken: true,
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Fetch all cards error:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

// Toggle status: AKTIF / NONAKTIF / DICETAK
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { cardId, status } = await req.json();

    const card = await prisma.studentCard.findUnique({
      where: { id: cardId },
      include: { student: true, qrToken: true },
    });

    if (!card) {
      return NextResponse.json({ error: 'Kartu tidak ditemukan.' }, { status: 404 });
    }

    const updated = await prisma.studentCard.update({
      where: { id: cardId },
      data: {
        status,
        ...(status === 'AKTIF' ? { activatedAt: new Date() } : {}),
      },
    });

    // Also update QR token active state
    if (card.qrToken) {
      await prisma.qrToken.update({
        where: { id: card.qrToken.id },
        data: { isActive: status === 'AKTIF' },
      });
    }

    await createAuditLog({
      action: 'UPDATE_CARD_STATUS',
      actor: user.name,
      details: `Mengubah status kartu ${card.cardId} (${card.student.fullName}) menjadi ${status}`,
      schoolId: card.student.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, card: updated });
  } catch (error) {
    console.error('Update card error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui kartu.' }, { status: 500 });
  }
}

// Replacement for lost cards
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { oldCardId, reason } = await req.json();

    const oldCard = await prisma.studentCard.findUnique({
      where: { id: oldCardId },
      include: {
        student: { include: { school: true } },
        qrToken: true,
      },
    });

    if (!oldCard) {
      return NextResponse.json({ error: 'Kartu lama tidak ditemukan.' }, { status: 404 });
    }

    // 1. Invalidate old card and token
    await prisma.studentCard.update({
      where: { id: oldCard.id },
      data: { status: 'NONAKTIF' },
    });

    if (oldCard.qrToken) {
      await prisma.qrToken.update({
        where: { id: oldCard.qrToken.id },
        data: { isActive: false },
      });
    }

    // 2. Generate new Card ID
    const schoolCode = (oldCard.student.school.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'SCH').toUpperCase();
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const newCardId = `${schoolCode}-${new Date().getFullYear()}-${randomSeq}`;

    const newCard = await prisma.studentCard.create({
      data: {
        cardId: newCardId,
        studentId: oldCard.studentId,
        status: 'AKTIF',
        activatedAt: new Date(),
      },
    });

    // 3. Generate new QR Token
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newToken = `STU-${randomHex}`;

    await prisma.qrToken.create({
      data: {
        token: newToken,
        cardId: newCard.id,
        isActive: true,
      },
    });

    await createAuditLog({
      action: 'REPLACE_LOST_CARD',
      actor: user.name,
      details: `Penggantian kartu hilang untuk ${oldCard.student.fullName}. Kartu lama ${oldCard.cardId} dinonaktifkan. Kartu baru: ${newCard.cardId}. Alasan: ${reason || 'Kartu hilang'}`,
      schoolId: oldCard.student.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: 'Kartu baru berhasil diterbitkan dan diaktifkan.',
      oldCardId: oldCard.cardId,
      newCard,
      newToken,
    });
  } catch (error) {
    console.error('Replace card error:', error);
    return NextResponse.json({ error: 'Gagal membuat kartu pengganti.' }, { status: 500 });
  }
}
