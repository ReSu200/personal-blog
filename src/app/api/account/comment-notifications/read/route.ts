import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { commentNotifications } from '@/db/schema';
import { getSession } from '@/lib/auth';

const schema = z.object({
  all: z.boolean().optional(),
  ids: z.array(z.number().int().positive()).max(100).optional(),
});

/** 标记通知已读：all 表示全部，ids 表示指定几条；只操作当前用户的记录 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  }

  const { all, ids } = parsed.data;
  const where = all
    ? and(eq(commentNotifications.userId, session.id), isNull(commentNotifications.readAt))
    : ids && ids.length > 0
      ? and(eq(commentNotifications.userId, session.id), inArray(commentNotifications.id, ids))
      : null;

  if (where) {
    await db.update(commentNotifications).set({ readAt: new Date() }).where(where);
  }

  return NextResponse.json({ ok: true });
}
