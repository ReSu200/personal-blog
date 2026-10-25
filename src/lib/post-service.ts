import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { posts, postTags, tags } from '@/db/schema';
import { slugify } from '@/lib/utils';

/** 确保标签存在，返回标签 id 列表 */
export async function ensureTagIds(names: string[]) {
  const ids: number[] = [];
  for (const raw of names) {
    const name = raw.trim().slice(0, 50);
    if (!name) continue;

    const existing = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).limit(1);
    if (existing[0]) {
      ids.push(existing[0].id);
      continue;
    }

    const baseSlug = slugify(name) || `tag-${Date.now()}`;
    const slugTaken = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, baseSlug)).limit(1);
    const finalSlug = slugTaken[0] ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

    try {
      const inserted = await db.insert(tags).values({ name, slug: finalSlug }).$returningId();
      ids.push(inserted[0].id);
    } catch {
      const again = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).limit(1);
      if (again[0]) ids.push(again[0].id);
    }
  }
  return Array.from(new Set(ids));
}

export async function syncPostTags(postId: number, tagNames: string[]) {
  const ids = await ensureTagIds(tagNames);
  await db.delete(postTags).where(eq(postTags.postId, postId));
  if (ids.length > 0) {
    await db.insert(postTags).values(ids.map((tagId) => ({ postId, tagId })));
  }
}

/** 生成唯一 slug，排除指定文章 id */
export async function uniquePostSlug(input: string, excludeId?: number) {
  const base = slugify(input) || `post-${Date.now()}`;
  let candidate = base.slice(0, 180);
  let suffix = 1;

  // 最多尝试 50 次，避免极端情况下死循环
  for (let i = 0; i < 50; i += 1) {
    const where = excludeId
      ? and(eq(posts.slug, candidate), ne(posts.id, excludeId))
      : eq(posts.slug, candidate);
    const rows = await db.select({ id: posts.id }).from(posts).where(where).limit(1);
    if (rows.length === 0) return candidate;
    suffix += 1;
    candidate = `${base.slice(0, 180)}-${suffix}`;
  }

  return `${base.slice(0, 160)}-${Date.now()}`;
}

export function parseTagInput(input: string | undefined | null) {
  if (!input) return [];
  return Array.from(
    new Set(
      input
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}
