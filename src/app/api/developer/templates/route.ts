export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let template = await prisma.cardTemplate.findFirst({
      where: { isDefault: true },
    });

    if (!template) {
      template = await prisma.cardTemplate.create({
        data: {
          name: 'Royal Sapphire & Deep Navy VIP',
          primaryColor: '#0c35a6',
          secondaryColor: '#061b4b',
          schoolLogoPosition: 'TOP_LEFT',
          isDefault: true,
        },
      });
    }

    const school = await prisma.school.findFirst({
      where: { name: { contains: 'Kalisalak' } },
    });

    return NextResponse.json({
      template,
      schoolLogo: school?.logo || '/logo.svg',
      schoolName: school?.name || 'SDN KALISALAK 01',
    });
  } catch (error) {
    console.error('Fetch template error:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, primaryColor, secondaryColor, templateId, logoUrl, schoolName } = body;

    let template = await prisma.cardTemplate.findFirst({
      where: { isDefault: true },
    });

    if (template) {
      template = await (prisma.cardTemplate.update as any)({
        where: { id: template.id },
        data: {
          ...(name ? { name } : {}),
          ...(primaryColor ? { primaryColor } : {}),
          ...(secondaryColor ? { secondaryColor } : {}),
          ...(templateId ? { templateId } : {}),
        } as any,
      });
    } else {
      template = await (prisma.cardTemplate.create as any)({
        data: {
          name: name || 'Ultra Modern Sapphire Gold VIP',
          templateId: templateId || 'sapphire-navy',
          primaryColor: primaryColor || '#02142d',
          secondaryColor: secondaryColor || '#08387f',
          isDefault: true,
        } as any,
      });
    }

    // Upload and update School Logo to Cloudinary if provided
    let finalLogoUrl = logoUrl;
    if (logoUrl) {
      finalLogoUrl = await uploadToCloudinary(logoUrl, 'presensi-siswa/school-logos', 'school_logo_official');
      await prisma.school.updateMany({
        data: { logo: finalLogoUrl },
      });
    }

    await createAuditLog({
      action: 'UPDATE_CARD_TEMPLATE',
      actor: user.name,
      details: `Memperbarui template kartu: ${name || template?.name || 'Ultra Modern'}, Warna: ${primaryColor}/${secondaryColor}`,
      schoolId: user.schoolId || undefined,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, template, logoUrl: finalLogoUrl });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
