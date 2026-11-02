import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
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

function resolvePublishedAt(status: 'draft' | 'published', value?: string | null) {
  if (status !== 'published') return null;
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

export async function POST(req: Request) {
  const { session, response } = await guardAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '参数不合法' }, { status: 400 });
  }

  const data = parsed.data;
  const slug = await uniquePostSlug(data.slug?.trim() || data.title);

  const inserted = await db
    .insert(posts)
    .values({
      title: data.title,
      slug,
      content: data.content,
      summary: data.summary || null,
      coverImage: data.coverImage || null,
      coverPosition: data.coverPosition || '50% 50%',
      categoryId: data.categoryId ?? null,
      authorId: session!.id,
      status: data.status,
      isPinned: data.isPinned ? 1 : 0,
      publishedAt: resolvePublishedAt(data.status, data.publishedAt),
    })
    .returning({ id: posts.id });

  const postId = inserted[0].id;
  await syncPostTags(postId, parseTagInput(data.tags));

  // 文章会影响分类/标签聚合、站点统计与前台列表缓存
  revalidateTag(CACHE_TAGS.taxonomy, 'max');
  revalidateTag(CACHE_TAGS.stats, 'max');
  // 文章相关缓存用立即过期（而非 'max' 的先返回旧值），保证发布后首次刷新即可见
  revalidateTag(CACHE_TAGS.posts, { expire: 0 });
  return NextResponse.json({ ok: true, id: postId, slug });
}
