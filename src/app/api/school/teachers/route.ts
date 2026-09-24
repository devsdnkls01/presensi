export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SCHOOL_ADMIN' || !user.schoolId) {
      return NextResponse.json({ error: 'Unauthorized: Hanya Admin Sekolah yang berhak mengakses' }, { status: 403 });
    }

    const teachers = await prisma.user.findMany({
      where: {
        schoolId: user.schoolId,
        role: 'TEACHER',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ teachers });
  } catch (error) {
    console.error('Fetch teachers error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data guru/petugas.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SCHOOL_ADMIN' || !user.schoolId) {
      return NextResponse.json({ error: 'Unauthorized: Hanya Admin Sekolah yang berhak menambahkan guru' }, { status: 403 });
    }

    const body = await req.json();
    const { name, username, password } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Nama guru, username, dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check unique username
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Username "${cleanUsername}" sudah terdaftar pada sistem. Gunakan username lain.` },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const teacher = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        role: 'TEACHER',
        schoolId: user.schoolId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      action: 'CREATE_TEACHER',
      actor: user.name,
      details: `Menambahkan akun guru/petugas: ${teacher.name} (@${teacher.username})`,
      schoolId: user.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, teacher });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan akun guru.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SCHOOL_ADMIN' || !user.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, username, password } = body;

    if (!id || !name || !username) {
      return NextResponse.json(
        { error: 'ID guru, nama, dan username wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check existing teacher and ensure belongs to same school
    const existingTeacher = await prisma.user.findFirst({
      where: { id, schoolId: user.schoolId, role: 'TEACHER' },
    });

    if (!existingTeacher) {
      return NextResponse.json(
        { error: 'Akun guru tidak ditemukan atau tidak berada di sekolah Anda.' },
        { status: 404 }
      );
    }

    // Check unique username for others
    const usernameTaken = await prisma.user.findFirst({
      where: {
        username: cleanUsername,
        NOT: { id },
      },
    });
    if (usernameTaken) {
      return NextResponse.json(
        { error: `Username "${cleanUsername}" sudah digunakan oleh pengguna lain.` },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: name.trim(),
      username: cleanUsername,
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
    });

    await createAuditLog({
      action: 'UPDATE_TEACHER',
      actor: user.name,
      details: `Memperbarui akun guru: ${updated.name} (@${updated.username})${password ? ' (Password di-reset)' : ''}`,
      schoolId: user.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui akun guru.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SCHOOL_ADMIN' || !user.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID guru wajib disertakan.' }, { status: 400 });
    }

    const targetTeacher = await prisma.user.findFirst({
      where: { id, schoolId: user.schoolId, role: 'TEACHER' },
    });

    if (!targetTeacher) {
      return NextResponse.json({ error: 'Akun guru tidak ditemukan atau bukan milik sekolah Anda.' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    await createAuditLog({
      action: 'DELETE_TEACHER',
      actor: user.name,
      details: `Menghapus akun guru: ${targetTeacher.name} (@${targetTeacher.username})`,
      schoolId: user.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, message: `Akun guru ${targetTeacher.name} berhasil dihapus.` });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json({ error: 'Gagal menghapus akun guru.' }, { status: 500 });
  }
}
