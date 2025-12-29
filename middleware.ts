import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // If user must change password and not on change-password page, redirect there
    if (token?.mustChangePassword && path !== '/change-password') {
      return NextResponse.redirect(new URL('/change-password', req.url));
    }

    // If user doesn't need to change password and is on change-password page, redirect home
    if (!token?.mustChangePassword && path === '/change-password') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/', '/change-password'],
};
