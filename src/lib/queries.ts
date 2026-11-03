import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { and, asc, count, desc, eq, gt, inArray, isNull, like, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  categories,
  commentNotifications,
  comments,
  friendLinks,
  posts,
  postTags,
  settings,
  songs,
  tags,
  users,
} from '@/db/schema';
import { DEFAULT_ABOUT_SITE } from '@/lib/utils';

/** 跨请求缓存标签：后台写操作完成后调用 revalidateTag 失效对应缓存 */
export const CACHE_TAGS = {
  settings: 'site-settings',
  taxonomy: 'taxonomy',
  links: 'friend-links',
  music: 'music',
  stats: 'site-stats',
  posts: 'posts',
} as const;

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
  musicVolume: number;
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
  musicVolume: 0.5,
};

async function loadSettings(): Promise<SettingsData> {
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
          musicVolume: row.musicVolume ?? 0.5,
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
  } catch (error) {
    // 数据库异常时退回默认配置，但要留下日志，便于定位“设置丢失”类问题
    console.error('[loadSettings] 读取站点设置失败，使用默认配置', error);
    return fallbackSettings;
  }
}

// 站点全局配置：请求内用 cache 去重，跨请求用 unstable_cache；
// 后台保存站点设置 / 个人资料后调用 revalidateTag(CACHE_TAGS.settings) 立即失效
export const getSettings = cache(
  unstable_cache(loadSettings, ['site-settings'], {
    tags: [CACHE_TAGS.settings],
    // 访问量等字段会持续变化，保留 30 秒兜底刷新
    revalidate: 30,
  }),
);

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
  excludePinned?: boolean;
};

function buildWhere(opts: ListOptions) {
  const conditions = [];
  if (!opts.includeDrafts) conditions.push(eq(posts.status, 'published'));
  if (opts.excludePinned) conditions.push(eq(posts.isPinned, 0));
  if (opts.q) {
    conditions.push(
      or(like(posts.title, `%${opts.q}%`), like(posts.summary, `%${opts.q}%`)) as ReturnType<typeof eq>,
    );
  }
  // 用子查询过滤分类，避免计数查询依赖 categories 表（该查询已去掉 join）
  if (opts.category) {
    conditions.push(
      sql`${posts.categoryId} IN (SELECT id FROM categories WHERE slug = ${opts.category})`,
    );
  }
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

// 搜索参数组合不可枚举，跳过量化的缓存直接查库，避免缓存条目随关键词无限增长
export async function listPostsUncached(opts: ListOptions = {}) {
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
    // 计数只需要 posts 表，多余的分类 join 会白白放大扫描成本
    db.select({ value: count() }).from(posts).where(where),
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

// 列表数据跨请求缓存 60s，文章增删改时用 CACHE_TAGS.posts 主动失效
const listPostsCached = unstable_cache(listPostsUncached, ['posts-list'], {
  revalidate: 60,
  tags: [CACHE_TAGS.posts],
});

// 过大的 page 直接查库、不进缓存，避免任意参数撑大缓存键空间
const MAX_CACHED_PAGE = 50;

export async function listPosts(opts: ListOptions = {}) {
  return (opts.page ?? 1) > MAX_CACHED_PAGE ? listPostsUncached(opts) : listPostsCached(opts);
}

async function listPinnedPostsQuery(limit = 2): Promise<PostListItem[]> {
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

export const listPinnedPosts = unstable_cache(listPinnedPostsQuery, ['pinned-posts'], {
  revalidate: 60,
  tags: [CACHE_TAGS.posts],
});

// 供 generateStaticParams 使用：只取已发布文章的 slug
export async function listPublishedSlugs() {
  const rows = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.status, 'published'));
  return rows.map((row) => ({ slug: row.slug }));
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

async function getAdjacentPostsQuery(post: { id: number; publishedAt: Date | null }) {
  const currentTime = post.publishedAt ?? new Date();
  const [prevRows, nextRows] = await Promise.all([
    db
      .select({ title: posts.title, slug: posts.slug })
      .from(posts)
      .where(and(eq(posts.status, 'published'), lt(posts.publishedAt, currentTime)))
      .orderBy(desc(posts.publishedAt))
      .limit(1),
    db
      .select({ title: posts.title, slug: posts.slug })
      .from(posts)
      .where(and(eq(posts.status, 'published'), gt(posts.publishedAt, currentTime)))
      .orderBy(asc(posts.publishedAt))
      .limit(1),
  ]);
  return { prev: prevRows[0] ?? null, next: nextRows[0] ?? null };
}

export const getAdjacentPosts = unstable_cache(getAdjacentPostsQuery, ['adjacent-posts'], {
  revalidate: 60,
  tags: [CACHE_TAGS.posts],
});

// 阅读数只写库、不失效 posts 缓存标签：列表上的 viewCount 最多滞后 60s，属有意取舍
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
    .where(and(eq(comments.postId, postId), eq(comments.status, 'approved'), isNull(comments.deletedAt)))
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

// 标签聚合低频变化：请求内去重 + 跨请求缓存，后台增删标签或文章后失效
export const getTagsWithCount = cache(
  unstable_cache(
    async () => {
      const rows = await db
        .select({ name: tags.name, slug: tags.slug, total: count(postTags.postId) })
        .from(tags)
        .leftJoin(postTags, eq(postTags.tagId, tags.id))
        .groupBy(tags.id, tags.name, tags.slug);
      return rows.map((r) => ({ ...r, total: Number(r.total) })).sort((a, b) => b.total - a.total);
    },
    ['tags-with-count'],
    { tags: [CACHE_TAGS.taxonomy], revalidate: 60 },
  ),
);

export const getCategoriesWithCount = cache(
  unstable_cache(
    async () => {
      const rows = await db
        .select({ name: categories.name, slug: categories.slug, total: count(posts.id) })
        .from(categories)
        .leftJoin(posts, and(eq(posts.categoryId, categories.id), eq(posts.status, 'published')))
        .groupBy(categories.id, categories.name, categories.slug)
        .orderBy(asc(categories.id));
      return rows.map((r) => ({ ...r, total: Number(r.total) }));
    },
    ['categories-with-count'],
    { tags: [CACHE_TAGS.taxonomy], revalidate: 60 },
  ),
);

export const getSiteStats = cache(
  unstable_cache(
    async () => {
      const [postRows, commentRows, songRows] = await Promise.all([
        db.select({ value: count() }).from(posts).where(eq(posts.status, 'published')),
        db
          .select({ value: count() })
          .from(comments)
          .where(and(eq(comments.status, 'approved'), isNull(comments.deletedAt))),
        db.select({ value: count() }).from(songs),
      ]);
      return {
        posts: Number(postRows[0]?.value ?? 0),
        comments: Number(commentRows[0]?.value ?? 0),
        songs: Number(songRows[0]?.value ?? 0),
      };
    },
    ['site-stats'],
    { tags: [CACHE_TAGS.stats], revalidate: 60 },
  ),
);

/* ============ 后台查询 ============ */

export const adminListPosts = async (page = 1, pageSize = 20) => {
  const currentPage = Math.max(1, page);
  const [items, totalRows] = await Promise.all([
    db
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
      .orderBy(desc(posts.isPinned), desc(posts.updatedAt))
      .limit(pageSize)
      .offset((currentPage - 1) * pageSize),
    db.select({ value: count() }).from(posts),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    items,
    total,
    page: currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

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

export async function adminListComments(
  status?: 'pending' | 'approved' | 'rejected',
  page = 1,
  pageSize = 20,
) {
  const currentPage = Math.max(1, page);
  // 软删除的评论不再出现在后台列表与统计里
  const where = status
    ? and(eq(comments.status, status), isNull(comments.deletedAt))
    : isNull(comments.deletedAt);
  const [items, totalRows] = await Promise.all([
    db
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
      .orderBy(desc(comments.createdAt))
      .limit(pageSize)
      .offset((currentPage - 1) * pageSize),
    db.select({ value: count() }).from(comments).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    items,
    total,
    page: currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 待审核数量：只做一次聚合查询，避免把全部评论读进内存再统计 */
export async function adminPendingCommentCount() {
  const rows = await db
    .select({ value: count() })
    .from(comments)
    .where(and(eq(comments.status, 'pending'), isNull(comments.deletedAt)));
  return Number(rows[0]?.value ?? 0);
}

/** 我的评论：含待审核 / 已拒绝 / 已被删除，按发表时间倒序 */
export async function listMyComments(userId: number, page = 1, pageSize = 20) {
  const currentPage = Math.max(1, page);
  const where = eq(comments.userId, userId);
  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: comments.id,
        content: comments.content,
        status: comments.status,
        deletedAt: comments.deletedAt,
        createdAt: comments.createdAt,
        postTitle: posts.title,
        postSlug: posts.slug,
      })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(where)
      .orderBy(desc(comments.createdAt))
      .limit(pageSize)
      .offset((currentPage - 1) * pageSize),
    db.select({ value: count() }).from(comments).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    items,
    total,
    page: currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 我的通知：审核 / 删除结果，按时间倒序 */
export async function listMyCommentNotifications(userId: number, page = 1, pageSize = 20) {
  const currentPage = Math.max(1, page);
  const where = eq(commentNotifications.userId, userId);
  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: commentNotifications.id,
        type: commentNotifications.type,
        readAt: commentNotifications.readAt,
        createdAt: commentNotifications.createdAt,
        commentId: commentNotifications.commentId,
        postTitle: posts.title,
        postSlug: posts.slug,
        commentContent: comments.content,
      })
      .from(commentNotifications)
      .leftJoin(posts, eq(commentNotifications.postId, posts.id))
      .leftJoin(comments, eq(commentNotifications.commentId, comments.id))
      .where(where)
      .orderBy(desc(commentNotifications.createdAt))
      .limit(pageSize)
      .offset((currentPage - 1) * pageSize),
    db.select({ value: count() }).from(commentNotifications).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    items,
    total,
    page: currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 未读通知数：顶栏红点用，游客不调用 */
export async function countUnreadCommentNotifications(userId: number) {
  const rows = await db
    .select({ value: count() })
    .from(commentNotifications)
    .where(and(eq(commentNotifications.userId, userId), isNull(commentNotifications.readAt)));
  return Number(rows[0]?.value ?? 0);
}

export async function adminDashboard() {
  const [postRows, publishedRows, commentRows, pendingRows, songRows, recent] = await Promise.all([
    db.select({ value: count() }).from(posts),
    db.select({ value: count() }).from(posts).where(eq(posts.status, 'published')),
    db.select({ value: count() }).from(comments).where(isNull(comments.deletedAt)),
    db
      .select({ value: count() })
      .from(comments)
      .where(and(eq(comments.status, 'pending'), isNull(comments.deletedAt))),
    db.select({ value: count() }).from(songs),
    db
      .select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .orderBy(desc(posts.updatedAt))
      .limit(5),
  ]);

  return {
    posts: Number(postRows[0]?.value ?? 0),
    published: Number(publishedRows[0]?.value ?? 0),
    comments: Number(commentRows[0]?.value ?? 0),
    pending: Number(pendingRows[0]?.value ?? 0),
    songs: Number(songRows[0]?.value ?? 0),
    recent,
  };
}

// 歌曲列表每个页面都会由布局读取：跨请求缓存，后台增删改歌曲后失效
export const listSongs = cache(
  unstable_cache(
    async () => db.select().from(songs).orderBy(asc(songs.sortOrder), asc(songs.id)),
    ['list-songs'],
    { tags: [CACHE_TAGS.music], revalidate: 60 },
  ),
);

/** 后台友链列表：包含隐藏项，后台改友链后由 links 标签失效 */
export const listFriendLinks = unstable_cache(
  async () => db.select().from(friendLinks).orderBy(asc(friendLinks.sortOrder), asc(friendLinks.id)),
  ['admin-friend-links'],
  { tags: [CACHE_TAGS.links], revalidate: 60 },
);

// 前台友链只展示可见项：请求内去重 + 跨请求缓存，后台改友链后失效
export const listVisibleFriendLinks = cache(
  unstable_cache(
    async () => {
      return db
        .select({
          id: friendLinks.id,
          name: friendLinks.name,
          url: friendLinks.url,
          description: friendLinks.description,
        })
        .from(friendLinks)
        .where(eq(friendLinks.isVisible, 1))
        .orderBy(asc(friendLinks.sortOrder), asc(friendLinks.id));
    },
    ['visible-friend-links'],
    { tags: [CACHE_TAGS.links], revalidate: 60 },
  ),
);

// 分类/标签选项在后台多个页面复用，分类写操作已失效 taxonomy 标签
export const listAllCategories = unstable_cache(
  async () => db.select().from(categories).orderBy(asc(categories.id)),
  ['all-categories'],
  { tags: [CACHE_TAGS.taxonomy], revalidate: 60 },
);

export const listAllTags = unstable_cache(
  async () => db.select().from(tags).orderBy(asc(tags.id)),
  ['all-tags'],
  { tags: [CACHE_TAGS.taxonomy], revalidate: 60 },
);
