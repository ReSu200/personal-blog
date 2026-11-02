import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// SQLite 没有 DATETIME 类型，统一用整数存 Unix 时间戳（秒），Drizzle 读取时转成 Date
const createdAt = () =>
  integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  githubUrl: text('github_url'),
  qq: text('qq'),
  wechat: text('wechat'),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    content: text('content').notNull(),
    summary: text('summary'),
    coverImage: text('cover_image'),
    coverPosition: text('cover_position').default('50% 50%'),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    isPinned: integer('is_pinned').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_posts_status_published').on(t.status, t.publishedAt),
    index('idx_posts_category').on(t.categoryId),
  ],
);

export const postTags = sqliteTable(
  'post_tags',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id'),
    content: text('content').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] })
      .notNull()
      .default('pending'),
    createdAt: createdAt(),
  },
  (t) => [index('idx_comments_post_status').on(t.postId, t.status)],
);

export const songs = sqliteTable('songs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  artist: text('artist'),
  filePath: text('file_path').notNull(),
  coverUrl: text('cover_url'),
  duration: real('duration'),
  isDefault: integer('is_default').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
});

export const friendLinks = sqliteTable('friend_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull().unique(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible').notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  siteName: text('site_name'),
  siteDescription: text('site_description'),
  aboutSite: text('about_site'),
  footerText: text('footer_text'),
  logoUrl: text('logo_url'),
  heroBackground: text('hero_background'),
  heroPosition: text('hero_position').default('50% 50%'),
  featuredCover: text('featured_cover'),
  featuredCoverPosition: text('featured_cover_position').default('50% 50%'),
  latestCover: text('latest_cover'),
  latestCoverPosition: text('latest_cover_position').default('50% 50%'),
  visitCount: integer('visit_count').notNull().default(0),
  musicAutoplay: integer('music_autoplay').notNull().default(1),
  musicVolume: real('music_volume').notNull().default(0.5),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type FriendLink = typeof friendLinks.$inferSelect;
export type Settings = typeof settings.$inferSelect;
