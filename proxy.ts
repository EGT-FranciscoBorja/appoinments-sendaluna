import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin/login') {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/login', '/admin/((?!login).*)'],
};
