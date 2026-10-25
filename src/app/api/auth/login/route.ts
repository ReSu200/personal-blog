import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { setSessionCookie, verifyPassword } from '@/lib/auth';
import { checkRateLimit, clientKey, recordFailure, resetRateLimit } from '@/lib/rate-limit';
import { CAPTCHA_COOKIE, verifyCaptcha } from '@/lib/captcha';

const schema = z.object({
  username: z.string().trim().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
  captcha: z.string().trim().min(1, '请输入验证码'),
});

export async function POST(req: Request) {
  const key = clientKey(req, 'login');
  const limit = checkRateLimit(key);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `尝试次数过多，请 ${limit.retryAfter} 秒后再试` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '参数不合法' }, { status: 400 });
  }

  const { username, password, captcha } = parsed.data;

  // 校验验证码（一次性，使用后立即失效）
  const cookieStore = cookies();
  const captchaCookie = cookieStore.get(CAPTCHA_COOKIE)?.value;
  const captchaOk = verifyCaptcha(captchaCookie, captcha);
  cookieStore.set(CAPTCHA_COOKIE, '', { path: '/', maxAge: 0 });

  if (!captchaOk) {
    return NextResponse.json({ error: '验证码错误或已过期，请刷新后重试' }, { status: 400 });
  }

  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    recordFailure(key);
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  resetRateLimit(key);
  await setSessionCookie({ id: user.id, username: user.username, role: user.role });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? user.username,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
}
