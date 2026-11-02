import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import { posts, postTags, tags } from '@/db/schema';
import { slugify } from '@/lib/utils';

/** 确保标签存在，返回标签 id 列表（批量查询 + 批量插入，避免逐条往返） */
export async function ensureTagIds(names: string[]) {
  const cleaned = Array.from(
    new Set(names.map((raw) => raw.trim().slice(0, 50)).filter(Boolean)),
  );
  if (cleaned.length === 0) return [];

  const existing = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(inArray(tags.name, cleaned));
  const existingIds = existing.map((row) => row.id);
  const existingNames = new Set(existing.map((row) => row.name));
  const missing = cleaned.filter((name) => !existingNames.has(name));
  if (missing.length === 0) return existingIds;

  // 一次性查出会冲突的 slug，保证批量插入时 slug 仍然唯一
  const baseSlugs = missing.map((name) => slugify(name) || `tag-${Date.now()}`);
  const takenRows = await db
    .select({ slug: tags.slug })
    .from(tags)
    .where(inArray(tags.slug, baseSlugs));
  const usedSlugs = new Set(takenRows.map((row) => row.slug));
  const values = missing.map((name, index) => {
    const base = baseSlugs[index];
    let slug = base;
    let suffix = 1;
    while (usedSlugs.has(slug)) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    usedSlugs.add(slug);
    return { name, slug };
  });

  try {
    const inserted = await db.insert(tags).values(values).returning({ id: tags.id });
    return Array.from(new Set([...existingIds, ...inserted.map((row) => row.id)]));
  } catch (error) {
    // 并发写入可能撞唯一索引：回退为按名称重新查询，避免整批失败
    console.error('[ensureTagIds] 批量创建标签失败，回退按名称查询', error);
    const again = await db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(inArray(tags.name, missing));
    return Array.from(new Set([...existingIds, ...again.map((row) => row.id)]));
  }
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
