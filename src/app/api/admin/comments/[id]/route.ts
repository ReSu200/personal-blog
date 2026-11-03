import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { commentNotifications, comments, posts } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';
import { CACHE_TAGS } from '@/lib/queries';

const schema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
});

type NotifyType = 'approved' | 'rejected' | 'deleted';

/** 读取评论上下文（作者、文章、当前状态）；软删除的评论视为不存在 */
async function loadComment(id: number) {
  const rows = await db
    .select({
      userId: comments.userId,
      postId: comments.postId,
      status: comments.status,
      deletedAt: comments.deletedAt,
      slug: posts.slug,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(eq(comments.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 给评论作者写一条站内通知；管理员操作自己的评论时跳过，避免自己给自己弹红点。
 */
async function notify(
  comment: { userId: number; postId: number },
  commentId: number,
  type: NotifyType,
  actorId: number,
) {
  if (comment.userId === actorId) return;
  await db.insert(commentNotifications).values({
    userId: comment.userId,
    commentId,
    postId: comment.postId,
    type,
  });
}

/** 审核结果会影响文章详情页（revalidate = 60 的静态页），需要按 slug 立即失效 */
function revalidateCommentViews(slug: string) {
  revalidateTag(CACHE_TAGS.stats, { expire: 0 });
  revalidatePath(`/posts/${slug}`);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await guardAdmin();
  if (response || !session) return response ?? NextResponse.json({ error: '无权限' }, { status: 403 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '评论 ID 不合法' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '状态不合法' }, { status: 400 });
  }

  const comment = await loadComment(id);
  if (!comment || comment.deletedAt) {
    return NextResponse.json({ error: '评论不存在' }, { status: 404 });
  }

  // 状态没变化时重复点击直接返回，不重复写通知
  if (comment.status === parsed.data.status) {
    return NextResponse.json({ ok: true });
  }

  await db.update(comments).set({ status: parsed.data.status }).where(eq(comments.id, id));

  if (parsed.data.status === 'approved' || parsed.data.status === 'rejected') {
    await notify(comment, id, parsed.data.status, session.id);
  }

  revalidateCommentViews(comment.slug);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await guardAdmin();
  if (response || !session) return response ?? NextResponse.json({ error: '无权限' }, { status: 403 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '评论 ID 不合法' }, { status: 400 });
  }

  const comment = await loadComment(id);
  if (!comment) {
    return NextResponse.json({ error: '评论不存在' }, { status: 404 });
  }
  // 已软删除的评论保持幂等，不重复通知
  if (comment.deletedAt) {
    return NextResponse.json({ ok: true });
  }

  // 改为软删除：前台与后台列表不再展示，作者仍可在「我的评论」看到记录
  await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, id));
  await notify(comment, id, 'deleted', session.id);
  revalidateCommentViews(comment.slug);
  return NextResponse.json({ ok: true });
}
