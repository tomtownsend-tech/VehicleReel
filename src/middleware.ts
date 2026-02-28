import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

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
  ],
};
