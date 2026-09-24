export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // STRICT BACKEND AUTHORIZATION: ONLY DEVELOPER ALLOWED!
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json(
        {
          error: 'Akses Ditolak: Hanya Developer / Admin Pusat yang diizinkan mengakses data produksi cetak kartu.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId') || searchParams.get('printRequestId');
    const schoolId = searchParams.get('schoolId');
    const batchId = searchParams.get('batchId');

    // 1. Fetch all confirmed / processing print requests that are valid for production
    const availableRequests = await prisma.cardPrintRequest.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        status: { in: ['DIVERIFIKASI', 'DALAM_PROSES', 'SELESAI'] },
      },
      include: {
        school: true,
        _count: {
          select: { cards: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let targetRequestId = requestId;
    // If no specific request is provided in URL, auto-select the latest confirmed/in-progress request
    if (!targetRequestId && !batchId && availableRequests.length > 0) {
      targetRequestId = availableRequests[0].id;
    }

    let cards: any[] = [];
    let activeRequest: any = null;

    if (targetRequestId) {
      activeRequest = await prisma.cardPrintRequest.findUnique({
        where: { id: targetRequestId },
        include: {
          school: true,
          cards: {
            include: {
              student: {
                include: {
                  classRoom: true,
                  school: true,
                },
              },
              qrToken: true,
              batch: true,
            },
            orderBy: [
              { student: { classRoom: { grade: 'asc' } } },
              { student: { classRoom: { section: 'asc' } } },
              { student: { fullName: 'asc' } },
            ],
          },
        },
      });

      if (activeRequest) {
        cards = activeRequest.cards;
      }
    } else if (batchId) {
      cards = await prisma.studentCard.findMany({
        where: { batchId },
        include: {
          student: {
            include: {
              classRoom: true,
              school: true,
            },
          },
          qrToken: true,
          batch: true,
        },
        orderBy: { cardId: 'asc' },
      });
    }

    const template = await prisma.cardTemplate.findFirst({
      where: { isDefault: true },
    });

    const school =
      activeRequest?.school ||
      (await prisma.school.findFirst({ where: { name: { contains: 'Kalisalak' } } })) ||
      (await prisma.school.findFirst());

    return NextResponse.json({
      success: true,
      paperSize: 'A4 (210 × 297 mm, Margin 1 cm)',
      cardDimension: '53.98 mm × 85.60 mm (Standard ID-1 PVC Potret)',
      totalCards: cards.length,
      cards,
      template,
      schoolLogo: school?.logo || '/logo.svg',
      schoolName: school?.name || 'SDN KALISALAK 01',
      currentRequest: activeRequest
        ? {
            id: activeRequest.id,
            requestNumber: activeRequest.requestNumber,
            status: activeRequest.status,
            schoolName: activeRequest.school.name,
            schoolId: activeRequest.schoolId,
            createdAt: activeRequest.createdAt,
            notes: activeRequest.notes,
          }
        : null,
      availableRequests: availableRequests.map((r) => ({
        id: r.id,
        requestNumber: r.requestNumber,
        status: r.status,
        schoolName: r.school.name,
        schoolId: r.schoolId,
        totalCards: r._count.cards,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Production data fetch error:', error);
    return NextResponse.json({ error: 'Gagal memuat data produksi cetak.' }, { status: 500 });
  }
}
