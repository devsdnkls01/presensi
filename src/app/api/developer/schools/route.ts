export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schools = await prisma.school.findMany({
      include: {
        users: {
          select: { id: true, name: true, username: true, role: true },
        },
        _count: {
          select: {
            students: true,
            classes: true,
            printRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ schools });
  } catch (error) {
    console.error('Fetch schools error:', error);
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, npsn, address, adminName, adminUsername, adminPassword } = body;

    if (!name || !npsn || !adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: 'Nama sekolah, NPSN, dan akun admin sekolah wajib diisi.' },
        { status: 400 }
      );
    }

    // Check unique NPSN
    const existingSchool = await prisma.school.findUnique({ where: { npsn } });
    if (existingSchool) {
      return NextResponse.json({ error: 'Sekolah dengan NPSN ini sudah terdaftar.' }, { status: 400 });
    }

    // Check unique username
    const existingUser = await prisma.user.findUnique({ where: { username: adminUsername } });
    if (existingUser) {
      return NextResponse.json({ error: 'Username admin sudah digunakan.' }, { status: 400 });
    }

    const school = await prisma.school.create({
      data: {
        name,
        npsn,
        address: address || null,
      },
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        name: adminName || `Admin ${name}`,
        username: adminUsername,
        password: hashedPassword,
        role: 'SCHOOL_ADMIN',
        schoolId: school.id,
      },
    });

    await createAuditLog({
      action: 'CREATE_SCHOOL',
      actor: user.name,
      details: `Menambahkan sekolah baru: ${school.name} (NPSN: ${school.npsn}) & Admin: ${adminUser.username}`,
      schoolId: school.id,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, school, adminUser });
  } catch (error) {
    console.error('Create school error:', error);
    return NextResponse.json({ error: 'Gagal membuat sekolah baru.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      npsn,
      checkInStartTime,
      checkInEndTime,
      lateAfter,
      adminName,
      adminUsername,
      adminPassword,
    } = body;


    if (!id || !name || !npsn) {
      return NextResponse.json(
        { error: 'ID sekolah, nama sekolah, dan NPSN wajib diisi.' },
        { status: 400 }
      );
    }

    // Check unique NPSN for other schools
    const existingNpsn = await prisma.school.findFirst({
      where: { npsn, NOT: { id } },
    });
    if (existingNpsn) {
      return NextResponse.json({ error: 'NPSN ini sudah digunakan oleh sekolah lain.' }, { status: 400 });
    }

    // Update school data
    const updatedSchool = await prisma.school.update({
      where: { id },
      data: {
        name,
        npsn,
        checkInStartTime: checkInStartTime || '06:00',
        checkInEndTime: checkInEndTime || '07:45',
        lateAfter: lateAfter || '07:45',

      },
    });

    // Handle Admin account update if provided
    if (adminUsername) {
      const existingUser = await prisma.user.findFirst({
        where: { username: adminUsername, NOT: { schoolId: id } },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Username admin sudah digunakan oleh akun lain.' }, { status: 400 });
      }

      const currentAdmin = await prisma.user.findFirst({
        where: { schoolId: id, role: 'SCHOOL_ADMIN' },
      });

      if (currentAdmin) {
        const updateData: any = {
          name: adminName || currentAdmin.name,
          username: adminUsername,
        };
        if (adminPassword && adminPassword.trim() !== '') {
          updateData.password = await bcrypt.hash(adminPassword.trim(), 10);
        }
        await prisma.user.update({
          where: { id: currentAdmin.id },
          data: updateData,
        });
      } else {
        // Create new admin if none existed
        const passwordToHash = adminPassword && adminPassword.trim() !== '' ? adminPassword.trim() : '123456';
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);
        await prisma.user.create({
          data: {
            name: adminName || `Admin ${name}`,
            username: adminUsername,
            password: hashedPassword,
            role: 'SCHOOL_ADMIN',
            schoolId: id,
          },
        });
      }
    }

    await createAuditLog({
      action: 'UPDATE_SCHOOL',
      actor: user.name,
      details: `Mengubah data sekolah: ${updatedSchool.name} (NPSN: ${updatedSchool.npsn})`,
      schoolId: updatedSchool.id,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, school: updatedSchool });
  } catch (error) {
    console.error('Update school error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui data sekolah.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID sekolah wajib diisi.' }, { status: 400 });
    }

    const targetSchool = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true, classes: true },
        },
      },
    });

    if (!targetSchool) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan.' }, { status: 404 });
    }

    await prisma.school.delete({
      where: { id },
    });

    await createAuditLog({
      action: 'DELETE_SCHOOL',
      actor: user.name,
      details: `Menghapus sekolah: ${targetSchool.name} (NPSN: ${targetSchool.npsn})`,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, message: `Sekolah ${targetSchool.name} berhasil dihapus.` });
  } catch (error) {
    console.error('Delete school error:', error);
    return NextResponse.json({ error: 'Gagal menghapus sekolah.' }, { status: 500 });
  }
}

