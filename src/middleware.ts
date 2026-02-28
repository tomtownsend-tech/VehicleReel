import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Rate limit login attempts: 10 per 15 minutes per IP
    if (pathname === '/api/auth/callback/credentials') {
      const ip = getClientIp(req);
      const { success } = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
      if (!success) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429 }
        );
      }
    }

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Block banned and suspended users from all protected routes
    if (token.status === 'BANNED' || token.status === 'SUSPENDED') {
      const url = new URL('/login', req.url);
      url.searchParams.set('error', 'account_restricted');
      return NextResponse.redirect(url);
    }

    // Admin routes
    if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Owner routes - allow unverified owners to access vehicle creation (onboarding)
    if (pathname.startsWith('/owner')) {
      if (token.role !== 'OWNER') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      // Unverified owners can only access vehicle creation and settings
      if (token.status === 'PENDING_VERIFICATION') {
        const allowed = ['/owner/vehicles/new', '/owner/settings'];
        if (!allowed.some((p) => pathname.startsWith(p))) {
          return NextResponse.redirect(new URL('/owner/vehicles/new', req.url));
        }
      }
    }

    // Production routes
    if (pathname.startsWith('/production')) {
      if (token.role !== 'PRODUCTION') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      // Unverified production users can only access settings
      if (token.status === 'PENDING_VERIFICATION') {
        if (!pathname.startsWith('/production/settings')) {
          return NextResponse.redirect(new URL('/production/settings', req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/owner/:path*',
    '/production/:path*',
    '/admin/:path*',
    '/api/auth/callback/credentials',
  ],
};
