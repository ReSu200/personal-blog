import { NextResponse } from 'next/server';
import { CAPTCHA_COOKIE, CAPTCHA_TTL_MS, createCaptchaCode, renderCaptchaSvg, signCaptcha } from '@/lib/captcha';

export const dynamic = 'force-dynamic';

export async function GET() {
  const code = createCaptchaCode();
  const response = new NextResponse(renderCaptchaSvg(code), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });

  response.cookies.set(CAPTCHA_COOKIE, signCaptcha(code), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(CAPTCHA_TTL_MS / 1000),
  });

  return response;
}
