import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, validateSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes that require admin authentication
  const protectedPatterns = [
    /^\/dashboard(\/.*)?$/,
    /^\/businesses(\/.*)?$/,
    /^\/analytics(\/.*)?$/,
  ];

  const isProtected = protectedPatterns.some((pattern) => pattern.test(pathname));

  if (isProtected) {
    const token = getSessionToken(request);

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const valid = await validateSession(token);
    if (!valid) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('expired', '1');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from login
  if (pathname === '/login') {
    const token = getSessionToken(request);
    if (token) {
      const valid = await validateSession(token);
      if (valid) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/businesses/:path*', '/analytics/:path*', '/login'],
};
