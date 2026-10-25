import {
  bigint,
  datetime,
  decimal,
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  tinyint,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

const createdAt = () => datetime('created_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () => datetime('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`);

export const users = mysqlTable('users', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 50 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  githubUrl: varchar('github_url', { length: 500 }),
  qq: varchar('qq', { length: 20 }),
  wechat: varchar('wechat', { length: 50 }),
  role: mysqlEnum('role', ['user', 'admin']).notNull().default('user'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const categories = mysqlTable('categories', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
});

export const tags = mysqlTable('tags', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
});

export const posts = mysqlTable('posts', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  content: longtext('content').notNull(),
  summary: varchar('summary', { length: 500 }),
  coverImage: varchar('cover_image', { length: 500 }),
  coverPosition: varchar('cover_position', { length: 30 }).default('50% 50%'),
  categoryId: bigint('category_id', { mode: 'number', unsigned: true }).references(() => categories.id),
  authorId: bigint('author_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => users.id),
  status: mysqlEnum('status', ['draft', 'published']).notNull().default('draft'),
  isPinned: tinyint('is_pinned').notNull().default(0),
  viewCount: int('view_count').notNull().default(0),
  publishedAt: datetime('published_at', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const postTags = mysqlTable(
  'post_tags',
  {
    postId: bigint('post_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: bigint('tag_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.tagId] }) }),
);

export const comments = mysqlTable('comments', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  postId: bigint('post_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentId: bigint('parent_id', { mode: 'number', unsigned: true }),
  content: text('content').notNull(),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
  createdAt: createdAt(),
});

export const songs = mysqlTable('songs', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  artist: varchar('artist', { length: 100 }),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  coverUrl: varchar('cover_url', { length: 500 }),
  duration: decimal('duration', { precision: 10, scale: 2 }),
  isDefault: tinyint('is_default').notNull().default(0),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: createdAt(),
});

export const settings = mysqlTable('settings', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  siteName: varchar('site_name', { length: 100 }),
  siteDescription: varchar('site_description', { length: 500 }),
  aboutSite: text('about_site'),
  footerText: varchar('footer_text', { length: 300 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  heroBackground: varchar('hero_background', { length: 500 }),
  heroPosition: varchar('hero_position', { length: 30 }).default('50% 50%'),
  featuredCover: varchar('featured_cover', { length: 500 }),
  featuredCoverPosition: varchar('featured_cover_position', { length: 30 }).default('50% 50%'),
  latestCover: varchar('latest_cover', { length: 500 }),
  latestCoverPosition: varchar('latest_cover_position', { length: 30 }).default('50% 50%'),
  visitCount: bigint('visit_count', { mode: 'number', unsigned: true }).notNull().default(0),
  musicAutoplay: tinyint('music_autoplay').notNull().default(1),
  musicVolume: decimal('music_volume', { precision: 3, scale: 2 }).notNull().default('0.50'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Settings = typeof settings.$inferSelect;
