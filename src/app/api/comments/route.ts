import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { comments, posts } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { stripHtml } from '@/lib/utils';

const schema = z.object({
  postId: z.number().int().positive(),
  content: z.string().min(1).max(1000),
  parentId: z.number().int().positive().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '请先登录后再评论' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '评论内容不合法' }, { status: 400 });
  }

  const content = stripHtml(parsed.data.content).slice(0, 1000);
  if (!content) {
    return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });
  }

  const postRows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, parsed.data.postId), eq(posts.status, 'published')))
    .limit(1);
  if (postRows.length === 0) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  let parentId: number | null = null;
  if (parsed.data.parentId) {
    const parentRows = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.id, parsed.data.parentId), eq(comments.postId, parsed.data.postId)))
      .limit(1);
    if (parentRows.length === 0) {
      return NextResponse.json({ error: '回复的评论不存在' }, { status: 400 });
    }
    parentId = parentRows[0].id;
  }

  await db.insert(comments).values({
    postId: parsed.data.postId,
    userId: session.id,
    parentId,
    content,
    status: 'pending',
  });

  return NextResponse.json({ ok: true, message: '评论已提交，等待管理员审核后展示' });
}
