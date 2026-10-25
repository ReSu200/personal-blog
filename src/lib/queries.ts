import { cache } from 'react';
import { and, asc, desc, eq, inArray, like, or, sql, count } from 'drizzle-orm';
import { db } from '@/db';
import { categories, comments, posts, postTags, settings, songs, tags, users } from '@/db/schema';
import { DEFAULT_ABOUT_SITE } from '@/lib/utils';

export type SettingsData = {
  id: number;
  siteName: string;
  siteDescription: string;
  aboutSite: string;
  footerText: string;
  logoUrl: string | null;
  heroBackground: string | null;
  heroPosition: string;
  featuredCover: string | null;
  featuredCoverPosition: string;
  latestCover: string | null;
  latestCoverPosition: string;
  visitCount: number;
  authorName: string;
  authorAvatar: string | null;
  authorQq: string | null;
  authorWechat: string | null;
  githubUrl: string | null;
  musicAutoplay: number;
  musicVolume: string;
};

const fallbackSettings: SettingsData = {
  id: 0,
  siteName: '青柠小站',
  siteDescription: '记录技术、生活与思考的个人博客',
  aboutSite: DEFAULT_ABOUT_SITE,
  footerText: '',
  logoUrl: null,
  heroBackground: null,
  heroPosition: '50% 50%',
  featuredCover: null,
  featuredCoverPosition: '50% 50%',
  latestCover: null,
  latestCoverPosition: '50% 50%',
  visitCount: 0,
  authorName: '博主',
  authorAvatar: null,
  authorQq: null,
  authorWechat: null,
  githubUrl: null,
  musicAutoplay: 1,
  musicVolume: '0.50',
};

// 同一请求内 layout / page / 侧栏都会读取设置，用 cache 去重，避免重复查询
export const getSettings = cache(async (): Promise<SettingsData> => {
  try {
    // 作者信息已合并到管理员个人资料，站点设置只保留站点级配置
    const [rows, admins] = await Promise.all([
      db.select().from(settings).limit(1),
      db
        .select({
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          githubUrl: users.githubUrl,
          qq: users.qq,
          wechat: users.wechat,
        })
        .from(users)
        .where(eq(users.role, 'admin'))
        .orderBy(asc(users.id))
        .limit(1),
    ]);

    const row = rows[0];
    const admin = admins[0];
    const base: Omit<
      SettingsData,
      'authorName' | 'authorAvatar' | 'authorQq' | 'authorWechat' | 'githubUrl'
    > = row
      ? {
          id: row.id,
          siteName: row.siteName ?? fallbackSettings.siteName,
          siteDescription: row.siteDescription ?? fallbackSettings.siteDescription,
          aboutSite: row.aboutSite?.trim() ? row.aboutSite : fallbackSettings.aboutSite,
          footerText: row.footerText ?? '',
          logoUrl: row.logoUrl,
          heroBackground: row.heroBackground,
          heroPosition: row.heroPosition ?? '50% 50%',
          featuredCover: row.featuredCover,
          featuredCoverPosition: row.featuredCoverPosition ?? '50% 50%',
          latestCover: row.latestCover,
          latestCoverPosition: row.latestCoverPosition ?? '50% 50%',
          visitCount: Number(row.visitCount ?? 0),
          musicAutoplay: row.musicAutoplay ?? 1,
          musicVolume: String(row.musicVolume ?? '0.50'),
        }
      : {
          id: fallbackSettings.id,
          siteName: fallbackSettings.siteName,
          siteDescription: fallbackSettings.siteDescription,
          aboutSite: fallbackSettings.aboutSite,
          footerText: fallbackSettings.footerText,
          logoUrl: fallbackSettings.logoUrl,
          heroBackground: fallbackSettings.heroBackground,
          heroPosition: fallbackSettings.heroPosition,
          featuredCover: fallbackSettings.featuredCover,
          featuredCoverPosition: fallbackSettings.featuredCoverPosition,
          latestCover: fallbackSettings.latestCover,
          latestCoverPosition: fallbackSettings.latestCoverPosition,
          visitCount: fallbackSettings.visitCount,
          musicAutoplay: fallbackSettings.musicAutoplay,
          musicVolume: fallbackSettings.musicVolume,
        };

    return {
      ...base,
      authorName: admin?.displayName?.trim() || fallbackSettings.authorName,
      authorAvatar: admin?.avatarUrl ?? null,
      authorQq: admin?.qq ?? null,
      authorWechat: admin?.wechat ?? null,
      githubUrl: admin?.githubUrl ?? null,
    };
  } catch {
    return fallbackSettings;
  }
});

export type TagItem = { name: string; slug: string };
export type PostListItem = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  coverImage: string | null;
  coverPosition: string | null;
  isPinned: number;
  viewCount: number;
  publishedAt: Date | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: TagItem[];
};

type ListOptions = {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  tag?: string;
  includeDrafts?: boolean;
};

function buildWhere(opts: ListOptions) {
  const conditions = [];
  if (!opts.includeDrafts) conditions.push(eq(posts.status, 'published'));
  if (opts.q) {
    conditions.push(
      or(like(posts.title, `%${opts.q}%`), like(posts.summary, `%${opts.q}%`)) as ReturnType<typeof eq>,
    );
  }
  if (opts.category) conditions.push(eq(categories.slug, opts.category));
  if (opts.tag) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM post_tags pt INNER JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = ${posts.id} AND t.slug = ${opts.tag})`,
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

async function attachTags(items: Omit<PostListItem, 'tags'>[]): Promise<PostListItem[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);
  const tagRows = await db
    .select({ postId: postTags.postId, name: tags.name, slug: tags.slug })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(inArray(postTags.postId, ids));

  const map = new Map<number, TagItem[]>();
  for (const row of tagRows) {
    const list = map.get(row.postId) ?? [];
    list.push({ name: row.name, slug: row.slug });
    map.set(row.postId, list);
  }
  return items.map((item) => ({ ...item, tags: map.get(item.id) ?? [] }));
}

export async function listPosts(opts: ListOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;
  const where = buildWhere(opts);

  // 列表与总数互不依赖，并行执行；标签只依赖列表结果
  const [baseRows, totalRows] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        summary: posts.summary,
        coverImage: posts.coverImage,
        coverPosition: posts.coverPosition,
        isPinned: posts.isPinned,
        viewCount: posts.viewCount,
        publishedAt: posts.publishedAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(where)
      .orderBy(desc(posts.isPinned), desc(posts.publishedAt), desc(posts.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  const items = await attachTags(baseRows);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listPinnedPosts(limit = 2): Promise<PostListItem[]> {
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      summary: posts.summary,
      coverImage: posts.coverImage,
      coverPosition: posts.coverPosition,
      isPinned: posts.isPinned,
      viewCount: posts.viewCount,
      publishedAt: posts.publishedAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(eq(posts.status, 'published'), eq(posts.isPinned, 1)))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  return attachTags(rows);
}

// generateMetadata 与页面渲染会各调用一次，cache 保证只查一次库
export const getPostBySlug = cache(async (slug: string) => {
  const rows = await db
    .select({
      post: posts,
      categoryName: categories.name,
      categorySlug: categories.slug,
      authorName: users.username,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const tagRows = await db
    .select({ name: tags.name, slug: tags.slug })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, row.post.id));

  return { ...row, tags: tagRows };
});

export async function getAdjacentPosts(post: { id: number; publishedAt: Date | null }) {
  const currentTime = post.publishedAt ?? new Date();
  const [prevRows, nextRows] = await Promise.all([
    db
      .select({ title: posts.title, slug: posts.slug })
      .from(posts)
      .where(and(eq(posts.status, 'published'), sql`${posts.publishedAt} < ${currentTime}`))
      .orderBy(desc(posts.publishedAt))
      .limit(1),
    db
      .select({ title: posts.title, slug: posts.slug })
      .from(posts)
      .where(and(eq(posts.status, 'published'), sql`${posts.publishedAt} > ${currentTime}`))
      .orderBy(asc(posts.publishedAt))
      .limit(1),
  ]);
  return { prev: prevRows[0] ?? null, next: nextRows[0] ?? null };
}

export async function incrementView(postId: number) {
  await db
    .update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, postId));
}

export type CommentItem = {
  id: number;
  content: string;
  createdAt: Date;
  parentId: number | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export async function getApprovedComments(postId: number): Promise<CommentItem[]> {
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.postId, postId), eq(comments.status, 'approved')))
    .orderBy(asc(comments.createdAt));
  return rows;
}

export async function getUserById(id: number) {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      githubUrl: users.githubUrl,
      qq: users.qq,
      wechat: users.wechat,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// 侧栏与列表页会同时调用，cache 避免同一请求重复聚合
export const getTagsWithCount = cache(async () => {
  const rows = await db
    .select({ name: tags.name, slug: tags.slug, total: count(postTags.postId) })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .groupBy(tags.id, tags.name, tags.slug);
  return rows.map((r) => ({ ...r, total: Number(r.total) })).sort((a, b) => b.total - a.total);
});

export const getCategoriesWithCount = cache(async () => {
  const rows = await db
    .select({ name: categories.name, slug: categories.slug, total: count(posts.id) })
    .from(categories)
    .leftJoin(posts, and(eq(posts.categoryId, categories.id), eq(posts.status, 'published')))
    .groupBy(categories.id, categories.name, categories.slug)
    .orderBy(asc(categories.id));
  return rows.map((r) => ({ ...r, total: Number(r.total) }));
});

export const getSiteStats = cache(async () => {
  const [postRows, commentRows, songRows] = await Promise.all([
    db.select({ value: count() }).from(posts).where(eq(posts.status, 'published')),
    db.select({ value: count() }).from(comments).where(eq(comments.status, 'approved')),
    db.select({ value: count() }).from(songs),
  ]);
  return {
    posts: Number(postRows[0]?.value ?? 0),
    comments: Number(commentRows[0]?.value ?? 0),
    songs: Number(songRows[0]?.value ?? 0),
  };
});

/* ============ 后台查询 ============ */

export async function adminListPosts() {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      status: posts.status,
      isPinned: posts.isPinned,
      viewCount: posts.viewCount,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      categoryName: categories.name,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .orderBy(desc(posts.isPinned), desc(posts.updatedAt));
}

export async function adminGetPost(id: number) {
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const tagRows = await db
    .select({ name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, id));
  return { ...row, tagNames: tagRows.map((t) => t.name).join(', ') };
}

export async function adminListComments(status?: 'pending' | 'approved' | 'rejected') {
  const where = status ? eq(comments.status, status) : undefined;
  return db
    .select({
      id: comments.id,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      username: users.username,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(where)
    .orderBy(desc(comments.createdAt));
}

export async function adminDashboard() {
  const [postRows, publishedRows, commentRows, pendingRows, songRows] = await Promise.all([
    db.select({ value: count() }).from(posts),
    db.select({ value: count() }).from(posts).where(eq(posts.status, 'published')),
    db.select({ value: count() }).from(comments),
    db.select({ value: count() }).from(comments).where(eq(comments.status, 'pending')),
    db.select({ value: count() }).from(songs),
  ]);
  const recent = await db
    .select({
      id: posts.id,
      title: posts.title,
      status: posts.status,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .orderBy(desc(posts.updatedAt))
    .limit(5);

  return {
    posts: Number(postRows[0]?.value ?? 0),
    published: Number(publishedRows[0]?.value ?? 0),
    comments: Number(commentRows[0]?.value ?? 0),
    pending: Number(pendingRows[0]?.value ?? 0),
    songs: Number(songRows[0]?.value ?? 0),
    recent,
  };
}

export async function listSongs() {
  return db.select().from(songs).orderBy(asc(songs.sortOrder), asc(songs.id));
}

export async function listAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.id));
}

export async function listAllTags() {
  return db.select().from(tags).orderBy(asc(tags.id));
}
