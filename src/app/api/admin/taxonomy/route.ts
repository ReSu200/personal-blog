import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { categories, postTags, tags } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';
import { slugify } from '@/lib/utils';
import { CACHE_TAGS } from '@/lib/queries';

const schema = z.object({
  type: z.enum(['category', 'tag']),
  name: z.string().trim().min(1, '名称不能为空').max(50),
});

export async function POST(req: Request) {
  const { response } = await guardAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '参数不合法' }, { status: 400 });
  }

  const { type, name } = parsed.data;
  const table = type === 'category' ? categories : tags;
  const baseSlug = slugify(name) || `item-${Date.now()}`;

  const existing = await db.select({ id: table.id }).from(table).where(eq(table.name, name)).limit(1);
  if (existing[0]) {
    return NextResponse.json({ error: '名称已存在' }, { status: 409 });
  }
  const slugExisting = await db.select({ id: table.id }).from(table).where(eq(table.slug, baseSlug)).limit(1);
  const slug = slugExisting[0] ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

  await db.insert(table).values({ name, slug });
  // 立即过期，保证新增后刷新即可见（'max' 会先返回旧列表）
  revalidateTag(CACHE_TAGS.taxonomy, { expire: 0 });
  revalidateTag(CACHE_TAGS.stats, 'max');
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { response } = await guardAdmin();
  if (response) return response;

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const id = Number(url.searchParams.get('id'));

  if ((type !== 'category' && type !== 'tag') || !Number.isFinite(id)) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  }

  if (type === 'category') {
    // posts.category_id 已声明 ON DELETE SET NULL，删分类即可自动置空
    await db.delete(categories).where(eq(categories.id, id));
  } else {
    await db.delete(postTags).where(eq(postTags.tagId, id));
    await db.delete(tags).where(eq(tags.id, id));
  }

  revalidateTag(CACHE_TAGS.taxonomy, { expire: 0 });
  revalidateTag(CACHE_TAGS.stats, 'max');
  // 分类/标签变更会影响列表上的分类名与标签，需要一起失效（立即过期，与 'max' 语义不同）
  revalidateTag(CACHE_TAGS.posts, { expire: 0 });
  return NextResponse.json({ ok: true });
}
