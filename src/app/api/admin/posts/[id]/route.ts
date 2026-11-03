import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { posts } from '@/db/schema';
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

  // 读取旧文章与解析请求体互不依赖，一起发起
  const [existingRows, body] = await Promise.all([
    db.select().from(posts).where(eq(posts.id, id)).limit(1),
    req.json().catch(() => null),
  ]);
  const existing = existingRows[0];
  if (!existing) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

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

  revalidateTag(CACHE_TAGS.taxonomy, { expire: 0 });
  revalidateTag(CACHE_TAGS.stats, { expire: 0 });
  // 立即过期，保证编辑/删除后首次刷新即可见（'max' 会先返回旧数据）
  revalidateTag(CACHE_TAGS.posts, { expire: 0 });
  revalidatePath(`/posts/${slug}`);
  if (existing.slug !== slug) revalidatePath(`/posts/${existing.slug}`);
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

  // 先取 slug 用于清理该文章的路由缓存，再依赖外键级联删除
  const rows = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, id)).limit(1);
  if (!rows[0]) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  await db.delete(posts).where(eq(posts.id, id));

  revalidateTag(CACHE_TAGS.taxonomy, { expire: 0 });
  revalidateTag(CACHE_TAGS.stats, { expire: 0 });
  // 立即过期，保证编辑/删除后首次刷新即可见（'max' 会先返回旧数据）
  revalidateTag(CACHE_TAGS.posts, { expire: 0 });
  revalidatePath(`/posts/${rows[0].slug}`);
  return NextResponse.json({ ok: true });
}
