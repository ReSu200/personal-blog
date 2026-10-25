import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');
const cookieName = process.env.AUTH_COOKIE_NAME || 'blog_session';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  let isAdmin = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      isAdmin = payload.role === 'admin';
    } catch {
      isAdmin = false;
    }
  }

  if (!isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
