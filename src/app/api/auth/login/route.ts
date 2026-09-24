export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { school: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Username atau kata sandi salah.' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Username atau kata sandi salah.' },
        { status: 401 }
      );
    }

    const sessionPayload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role as 'DEVELOPER' | 'SCHOOL_ADMIN' | 'TEACHER',
      schoolId: user.schoolId,
      schoolName: user.school?.name || null,
    };

    const token = createSessionToken(sessionPayload);

    // Determine redirect path
    let redirectUrl = '/developer/dashboard';
    if (user.role === 'SCHOOL_ADMIN') {
      redirectUrl = '/school/dashboard';
    } else if (user.role === 'TEACHER') {
      redirectUrl = '/teacher/scan';
    }

    await createAuditLog({
      action: 'LOGIN',
      actor: user.name,
      details: `User ${user.username} (${user.role}) berhasil masuk ke sistem`,
      schoolId: user.schoolId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      redirectUrl,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
