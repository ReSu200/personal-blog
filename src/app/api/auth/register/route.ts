import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword, setSessionCookie } from '@/lib/auth';

const schema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, '用户名至少 3 个字符')
      .max(20, '用户名最多 20 个字符')
      .regex(/^[\p{L}\p{N}_-]+$/u, '用户名只能包含字母、数字、下划线或短横线'),
    password: z.string().min(6, '密码至少 6 位').max(32, '密码最多 32 位'),
    confirmPassword: z.string().min(1, '请再次输入密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '参数不合法' }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: '用户名已被占用' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const avatarUrl = 'avatar-1';

  const inserted = await db
    .insert(users)
    .values({ username, passwordHash, displayName: username, avatarUrl, role: 'user' })
    .$returningId();

  await setSessionCookie({ id: inserted[0].id, username, role: 'user' });
  return NextResponse.json({
    ok: true,
    user: { id: inserted[0].id, username, displayName: username, avatarUrl, role: 'user' },
  });
}
