import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Admin routes
    if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Owner routes
    if (pathname.startsWith('/owner') && token.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Production routes
    if (pathname.startsWith('/production') && token.role !== 'PRODUCTION') {
      return NextResponse.redirect(new URL('/login', req.url));
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
