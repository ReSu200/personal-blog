import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';
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
  const { response } = await guardAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '参数不合法' }, { status: 400 });
  }

  const data = parsed.data;
  const { session } = await guardAdmin();
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
    .$returningId();

  const postId = inserted[0].id;
  await syncPostTags(postId, parseTagInput(data.tags));

  return NextResponse.json({ ok: true, id: postId, slug });
}
