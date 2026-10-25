import { SignJWT, jwtVerify } from 'jose';

export type SessionUser = {
  id: number;
  username: string;
  role: 'user' | 'admin';
};

export const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'blog_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');

export async function signSession(user: SessionUser) {
  return new SignJWT({ id: user.id, username: user.username, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.id !== 'number' || typeof payload.username !== 'string') return null;
    if (payload.role !== 'admin' && payload.role !== 'user') return null;
    return { id: payload.id, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
