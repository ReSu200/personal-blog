import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getSession, hashPassword, setSessionCookie, verifyPassword } from '@/lib/auth';

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, '用户名至少 3 个字符')
    .max(20, '用户名最多 20 个字符')
    .regex(/^[\p{L}\p{N}_-]+$/u, '用户名只能包含字母、数字、下划线或短横线')
    .optional(),
  displayName: z.string().trim().min(1, '昵称不能为空').max(30, '昵称最多 30 个字符').optional(),
  avatar: z.string().max(500).optional().nullable(),
  githubUrl: z.string().trim().max(500).optional().nullable(),
  qq: z.string().trim().max(20).optional().nullable(),
  wechat: z.string().trim().max(50).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, '新密码至少 6 位').max(32, '新密码最多 32 位').optional(),
});

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '参数不合法' }, { status: 400 });
  }

  const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: '账号不存在' }, { status: 404 });
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.displayName !== undefined) updates.displayName = data.displayName;
  if (data.avatar !== undefined) updates.avatarUrl = data.avatar || null;
  if (data.githubUrl !== undefined) updates.githubUrl = data.githubUrl || null;
  if (data.qq !== undefined) updates.qq = data.qq || null;
  if (data.wechat !== undefined) updates.wechat = data.wechat || null;

  if (data.username && data.username !== user.username) {
    const taken = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, data.username), ne(users.id, user.id)))
      .limit(1);
    if (taken.length > 0) {
      return NextResponse.json({ error: '该用户名已被占用' }, { status: 409 });
    }
    updates.username = data.username;
  }

  if (data.newPassword) {
    if (!data.currentPassword) {
      return NextResponse.json({ error: '修改密码需先输入当前密码' }, { status: 400 });
    }
    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: '当前密码不正确' }, { status: 400 });
    }
    updates.passwordHash = await hashPassword(data.newPassword);
  }

  await db.update(users).set(updates).where(eq(users.id, user.id));

  const nextUsername = (updates.username as string) ?? user.username;
  if (nextUsername !== user.username) {
    await setSessionCookie({ id: user.id, username: nextUsername, role: user.role });
  }

  return NextResponse.json({ ok: true, usernameChanged: nextUsername !== user.username });
}
