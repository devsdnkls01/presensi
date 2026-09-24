import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, parseSessionToken } from './lib/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png'
  ) {
    return NextResponse.next();
  }

  // Allow system cron bearer token for automated backup jobs
  const cronSecret = process.env.CRON_SECRET || 'smartsiswa-cron-secret-backup-key-2026';
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    return NextResponse.next();
  }


  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const user = sessionCookie?.value ? parseSessionToken(sessionCookie.value) : null;

  // Auto-redirect if already logged in and visiting /login
  if (user && pathname === '/login') {
    if (user.role === 'DEVELOPER') {
      return NextResponse.redirect(new URL('/developer/dashboard', req.url));
    } else if (user.role === 'SCHOOL_ADMIN') {
      return NextResponse.redirect(new URL('/school/dashboard', req.url));
    } else {
      return NextResponse.redirect(new URL('/teacher/scan', req.url));
    }
  }

  // Allow guest access to /login
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // If not logged in and requesting protected page or api
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Developer route protection
  if (pathname.startsWith('/developer') || pathname.startsWith('/api/developer')) {
    if (user.role !== 'DEVELOPER') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Akses Ditolak: Hanya Developer Pusat yang diizinkan.' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/school/dashboard', req.url));
    }
  }

  // School route protection
  if (pathname.startsWith('/school') || pathname.startsWith('/api/school')) {
    if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'DEVELOPER') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Akses Ditolak.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/teacher/scan', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/developer/:path*',
    '/school/:path*',
    '/teacher/:path*',
    '/presensi/:path*',
    '/reports/:path*',
    '/api/developer/:path*',
    '/api/school/:path*',
    '/api/attendance/:path*',
  ],
};
