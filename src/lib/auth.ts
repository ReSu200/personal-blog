import { cache } from 'react';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { COOKIE_NAME, SESSION_MAX_AGE, signSession, verifySession, type SessionUser } from './jwt';

export type { SessionUser };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// 布局与页面会各自读取会话，cache 保证同一请求只解析一次 JWT
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySession(token);
});

export async function requireAdmin(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}
