import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const CURRENT_TC_VERSION = '1.0';

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

    // Email verification gate — must verify email before accessing any dashboard
    // Skip for ADMIN role (always seeded test accounts)
    if (token.emailVerified === false && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/verify-email', req.url));
    }

    // T&C consent gate — re-request if version changed
    // Skip for ADMIN role and allow access to settings (where re-consent form lives)
    if (token.tcVersion !== CURRENT_TC_VERSION && token.role !== 'ADMIN') {
      const settingsPaths = ['/owner/settings', '/production/settings', '/coordinator/settings', '/art-department/settings'];
      if (!settingsPaths.some((p) => pathname.startsWith(p))) {
        const settingsMap: Record<string, string> = {
          OWNER: '/owner/settings',
          PRODUCTION: '/production/settings',
          COORDINATOR: '/coordinator/settings',
          ART_DEPARTMENT: '/art-department/settings',
        };
        const settingsPath = settingsMap[token.role as string] || '/login';
        const url = new URL(`${settingsPath}?consent=required`, req.url);
        return NextResponse.redirect(url);
      }
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
        const allowed = ['/owner/vehicles/new', '/owner/vehicles', '/owner/options', '/owner/settings'];
        if (!allowed.some((p) => pathname.startsWith(p))) {
          return NextResponse.redirect(new URL('/owner/vehicles/new', req.url));
        }
      }
    }

    // Coordinator routes
    if (pathname.startsWith('/coordinator')) {
      if (token.role !== 'COORDINATOR') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // Production routes
    if (pathname.startsWith('/production')) {
      if (token.role !== 'PRODUCTION') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      // Unverified production users can only access documents and settings
      if (token.status === 'PENDING_VERIFICATION') {
        const allowed = ['/production/documents', '/production/settings'];
        if (!allowed.some((p) => pathname.startsWith(p))) {
          return NextResponse.redirect(new URL('/production/documents', req.url));
        }
      }
    }

    // Art Department routes
    if (pathname.startsWith('/art-department')) {
      if (token.role !== 'ART_DEPARTMENT') {
        return NextResponse.redirect(new URL('/login', req.url));
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
    '/coordinator/:path*',
    '/art-department/:path*',
    '/admin/:path*',
  ],
};
