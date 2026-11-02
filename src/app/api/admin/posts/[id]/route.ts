import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { comments, posts, postTags } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';
import { CACHE_TAGS } from '@/lib/queries';
import { parseTagInput, syncPostTags, uniquePostSlug } from '@/lib/post-service';

const schema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(200),
  slug: z.string().trim().max(200).optional(),
  content: z.string().min(1, '正文不能为空'),
  summary: z.string().max(500).optional().nullable(),
  coverImage: z.string().max(500).optional().nullable(),
  coverPosition: z.string().max(30).optional().nullable(),
  categoryId: z.number().int().positive().nullable().optional(),
  status: z.enum(['draft', 'published']),
  isPinned: z.boolean().optional(),
  publishedAt: z.string().optional().nullable(),
  tags: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await guardAdmin();
  if (response) return response;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '文章 ID 不合法' }, { status: 400 });
  }

  const existingRows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  const existing = existingRows[0];
  if (!existing) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '参数不合法' }, { status: 400 });
  }

  const data = parsed.data;
  const slug = data.slug?.trim()
    ? await uniquePostSlug(data.slug.trim(), id)
    : existing.slug;

  let publishedAt: Date | null = null;
  if (data.status === 'published') {
    if (data.publishedAt) {
      const date = new Date(data.publishedAt);
      publishedAt = Number.isNaN(date.getTime()) ? existing.publishedAt ?? new Date() : date;
    } else {
      publishedAt = existing.publishedAt ?? new Date();
    }
  }

  await db
    .update(posts)
    .set({
      title: data.title,
      slug,
      content: data.content,
      summary: data.summary || null,
      coverImage: data.coverImage || null,
      coverPosition: data.coverPosition || existing.coverPosition || '50% 50%',
      categoryId: data.categoryId ?? null,
      status: data.status,
      isPinned: data.isPinned ? 1 : 0,
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  await syncPostTags(id, parseTagInput(data.tags));

  revalidateTag(CACHE_TAGS.taxonomy, 'max');
  revalidateTag(CACHE_TAGS.stats, 'max');
  // 立即过期，保证编辑/删除后首次刷新即可见（'max' 会先返回旧数据）
  revalidateTag(CACHE_TAGS.posts, { expire: 0 });
  return NextResponse.json({ ok: true, id, slug });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await guardAdmin();
  if (response) return response;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '文章 ID 不合法' }, { status: 400 });
  }

  await db.delete(postTags).where(eq(postTags.postId, id));
  await db.delete(comments).where(eq(comments.postId, id));
  await db.delete(posts).where(eq(posts.id, id));

  revalidateTag(CACHE_TAGS.taxonomy, 'max');
  revalidateTag(CACHE_TAGS.stats, 'max');
  // 立即过期，保证编辑/删除后首次刷新即可见（'max' 会先返回旧数据）
  revalidateTag(CACHE_TAGS.posts, { expire: 0 });
  return NextResponse.json({ ok: true });
}
