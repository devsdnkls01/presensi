export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const search = searchParams.get('search');

    // Tenant isolation: if school admin or teacher, lock to their schoolId
    const schoolId = user.role === 'DEVELOPER' ? searchParams.get('schoolId') || user.schoolId : user.schoolId;

    if (!schoolId && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'School ID missing' }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(classId ? { classRoomId: classId } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search } },
                { nis: { contains: search } },
                { nisn: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        classRoom: true,
        school: true,
        cards: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { qrToken: true },
        },
      },
      orderBy: [
        { classRoom: { grade: 'asc' } },
        { classRoom: { section: 'asc' } },
        { fullName: 'asc' },
      ],
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Fetch students error:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SCHOOL_ADMIN' && user.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // STRICT PRIVACY AUDIT: Prevent any sensitive fields as ordered in rujukan.md
    const prohibitedFields = ['nik', 'kk', 'nomor_kk', 'alamat', 'ayah', 'ibu', 'orangtua', 'gaji', 'penyakit'];
    for (const key of Object.keys(body)) {
      if (prohibitedFields.some((p) => key.toLowerCase().includes(p))) {
        return NextResponse.json(
          {
            error: `Field '${key}' dilarang oleh regulasi privasi sistem. Jangan menyimpan NIK, KK, atau alamat rumah.`,
          },
          { status: 400 }
        );
      }
    }

    const { nis, nisn, fullName, gender, classRoomId, photoUrl, schoolId: overrideSchoolId } = body;

    const targetSchoolId = user.role === 'DEVELOPER' ? overrideSchoolId || user.schoolId : user.schoolId;

    if (!nis || !fullName || !gender || !classRoomId || !targetSchoolId) {
      return NextResponse.json(
        { error: 'NIS, Nama Lengkap, Jenis Kelamin, dan Kelas wajib diisi.' },
        { status: 400 }
      );
    }

    // Check unique NIS in this school
    const existing = await prisma.student.findUnique({
      where: {
        schoolId_nis: {
          schoolId: targetSchoolId,
          nis,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Siswa dengan NIS ${nis} sudah terdaftar di sekolah ini.` },
        { status: 400 }
      );
    }

    // Upload student photo to Cloudinary if provided
    let finalPhotoUrl = photoUrl || null;
    if (photoUrl) {
      finalPhotoUrl = await uploadToCloudinary(
        photoUrl,
        'presensi-siswa/students',
        `student_${nis}_${Date.now()}`
      );
    }

    // Create student
    const student = await prisma.student.create({
      data: {
        nis,
        nisn: nisn || null,
        fullName,
        gender,
        classRoomId,
        schoolId: targetSchoolId,
        photoUrl: finalPhotoUrl,
        status: 'AKTIF',
      },
    });

    // Automatically generate draft card with unique Card ID
    const school = await prisma.school.findUnique({ where: { id: targetSchoolId } });
    const schoolCode = (school?.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'SCH').toUpperCase();
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const cardId = `${schoolCode}-${new Date().getFullYear()}-${randomSeq}`;

    const card = await prisma.studentCard.create({
      data: {
        cardId,
        studentId: student.id,
        status: 'DRAFT',
      },
    });

    await createAuditLog({
      action: 'CREATE_STUDENT',
      actor: user.name,
      details: `Menambahkan siswa baru: ${student.fullName} (NIS: ${student.nis}) - Card ID: ${card.cardId}`,
      schoolId: targetSchoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, student, card });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SCHOOL_ADMIN' && user.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // STRICT PRIVACY AUDIT: Prevent any sensitive fields
    const prohibitedFields = ['nik', 'kk', 'nomor_kk', 'alamat', 'ayah', 'ibu', 'orangtua', 'gaji', 'penyakit'];
    for (const key of Object.keys(body)) {
      if (prohibitedFields.some((p) => key.toLowerCase().includes(p))) {
        return NextResponse.json(
          {
            error: `Field '${key}' dilarang oleh regulasi privasi sistem. Jangan menyimpan NIK, KK, atau alamat rumah.`,
          },
          { status: 400 }
        );
      }
    }

    const { id, nis, nisn, fullName, gender, classRoomId, photoUrl, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Siswa diperlukan.' }, { status: 400 });
    }

    // Verify student exists and belongs to user's school
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan.' }, { status: 404 });
    }

    if (user.role !== 'DEVELOPER' && existingStudent.schoolId !== user.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    // Check if NIS changed and if it conflicts with another student in the same school
    if (nis && nis !== existingStudent.nis) {
      const duplicateNis = await prisma.student.findUnique({
        where: {
          schoolId_nis: {
            schoolId: existingStudent.schoolId,
            nis,
          },
        },
      });
      if (duplicateNis && duplicateNis.id !== id) {
        return NextResponse.json(
          { error: `NIS ${nis} sudah digunakan oleh siswa lain di sekolah ini.` },
          { status: 400 }
        );
      }
    }

    // Upload / update photo in Cloudinary if changed
    let finalPhotoUrl = photoUrl;
    if (photoUrl && photoUrl !== existingStudent.photoUrl) {
      finalPhotoUrl = await uploadToCloudinary(
        photoUrl,
        'presensi-siswa/students',
        `student_${existingStudent.nis}`
      );
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        ...(nis ? { nis } : {}),
        ...(nisn !== undefined ? { nisn: nisn || null } : {}),
        ...(fullName ? { fullName } : {}),
        ...(gender ? { gender } : {}),
        ...(classRoomId ? { classRoomId } : {}),
        ...(finalPhotoUrl !== undefined ? { photoUrl: finalPhotoUrl || null } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        classRoom: true,
        school: true,
        cards: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    await createAuditLog({
      action: 'UPDATE_STUDENT',
      actor: user.name,
      details: `Memperbarui data siswa: ${updatedStudent.fullName} (NIS: ${updatedStudent.nis})`,
      schoolId: existingStudent.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
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
      return NextResponse.json({ error: 'ID Siswa diperlukan.' }, { status: 400 });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: { cards: true },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan.' }, { status: 404 });
    }

    if (user.role !== 'DEVELOPER' && existingStudent.schoolId !== user.schoolId) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    // Delete student (Prisma relations will cascade)
    await prisma.student.delete({
      where: { id },
    });

    await createAuditLog({
      action: 'DELETE_STUDENT',
      actor: user.name,
      details: `Menghapus data siswa: ${existingStudent.fullName} (NIS: ${existingStudent.nis})`,
      schoolId: existingStudent.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, message: 'Siswa berhasil dihapus' });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
