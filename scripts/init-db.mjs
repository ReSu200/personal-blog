/**
 * 数据库初始化脚本（SQLite）：
 * 1. 创建所有数据表（IF NOT EXISTS）
 * 2. 写入初始数据（管理员、分类、标签、示例文章、评论、示例音乐、站点设置）
 *
 * 运行：node scripts/init-db.mjs
 */
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const dbFile = path.resolve(process.env.DB_FILE || path.join(process.cwd(), 'data', 'blog.db'));
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    github_url TEXT,
    qq TEXT,
    wechat TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uk_users_username ON users(username)`,

  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uk_categories_name ON categories(name)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uk_categories_slug ON categories(slug)`,

  `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uk_tags_name ON tags(name)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uk_tags_slug ON tags(slug)`,

  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    cover_image TEXT,
    cover_position TEXT DEFAULT '50% 50%',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    author_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    is_pinned INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    published_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uk_posts_slug ON posts(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id)`,

  `CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
  )`,

  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS idx_comments_post_status ON comments(post_id, status)`,

  `CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT,
    file_path TEXT NOT NULL,
    cover_url TEXT,
    duration REAL,
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS friend_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uk_friend_links_url ON friend_links(url)`,

  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name TEXT,
    site_description TEXT,
    about_site TEXT,
    footer_text TEXT,
    logo_url TEXT,
    hero_background TEXT,
    hero_position TEXT DEFAULT '50% 50%',
    featured_cover TEXT,
    featured_cover_position TEXT DEFAULT '50% 50%',
    latest_cover TEXT,
    latest_cover_position TEXT DEFAULT '50% 50%',
    visit_count INTEGER NOT NULL DEFAULT 0,
    music_autoplay INTEGER NOT NULL DEFAULT 1,
    music_volume REAL NOT NULL DEFAULT 0.50,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
];

/** 生成一段柔和的合成音轨（WAV），用于本地演示播放器 */
function writeDemoWav(filePath, frequencies, seconds = 8, sampleRate = 22050) {
  if (fs.existsSync(filePath)) return;
  const samples = Math.floor(seconds * sampleRate);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t / 1.2);
    const fadeOut = Math.min(1, (seconds - t) / 1.5);
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.22;
    let value = 0;
    for (const f of frequencies) {
      value += Math.sin(2 * Math.PI * f * t) / frequencies.length;
    }
    const sample = Math.max(-1, Math.min(1, value * envelope));
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
}

const POSTS = [
  {
    title: '用 Next.js 16 搭建个人博客：从零到上线',
    slug: 'build-blog-with-nextjs-14',
    category: '技术笔记',
    tags: ['Next.js', '教程'],
    pinned: 1,
    summary: '记录这个博客从技术选型、数据库设计到界面打磨的完整过程，包含踩过的坑与取舍。',
    content: `## 为什么重新做一个博客

市面上的博客模板很多，但真正做到「自己想怎么改就怎么改」的，还是得自己写。这一次我选择了 Next.js 16 的 App Router，配合 SQLite 与 Drizzle ORM，把前后端放在同一个项目里维护。

## 技术选型

- **框架**：Next.js 16（App Router）+ TypeScript + React 19
- **数据库**：SQLite（单文件，零运维）
- **ORM**：Drizzle ORM
- **样式**：Tailwind CSS 4
- **认证**：用户名 + 密码，JWT 存入 HttpOnly Cookie

### 为什么用 SQLite

个人博客读多写少、数据量小，SQLite 一个文件就能承载全部数据，备份只需要复制文件，也省掉了一台数据库服务器的运维成本。

## 三栏布局的取舍

左栏放导航，中间放内容，右栏放作者卡片与标签云。这个结构适合阅读型站点：导航始终可见，正文宽度受控，辅助信息不抢戏。

> 小屏时右栏自动隐藏，导航收进顶部，这是移动端最重要的一个断点。

## 开发节奏

1. 先把数据库表结构定下来
2. 再做认证与权限
3. 然后才是界面细节
4. 最后补音乐播放器这种「氛围型」功能

## 下一步

接下来会补充文章全文搜索、评论通知，以及更完善的 SEO 元信息。

\`\`\`ts
// 一个简单的服务端查询示例
const rows = await db
  .select()
  .from(posts)
  .where(eq(posts.status, 'published'))
  .orderBy(desc(posts.publishedAt))
  .limit(10);
\`\`\`
`,
  },
  {
    title: 'SQLite 单文件数据库实践',
    slug: 'sqlite-single-file',
    category: '技术笔记',
    tags: ['SQLite', '教程'],
    pinned: 0,
    summary: '一个文件承载全部数据，配合 WAL 与外键，小体量站点完全够用。',
    content: `## 为什么选单文件数据库

博客这类读多写少的场景，瓶颈往往不在数据库本身，而在部署与运维的复杂度。SQLite 把这两项成本压到了最低。

## 基础配置

\`\`\`sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
\`\`\`

- WAL 让读写互不阻塞，适合「页面渲染时顺便自增阅读数」这类混合操作
- SQLite 的外键约束默认关闭，每个连接都要显式打开

## 备份

停写或使用 \`VACUUM INTO\` 导出一份快照即可：

\`\`\`sql
VACUUM INTO 'backup/blog-2026-11-02.db';
\`\`\`

## 什么时候该换掉它

- 需要多台应用服务器同时写同一个库
- 数据量进入数十 GB，且查询模式复杂
- 需要主从复制、在线扩容等能力

个人博客基本不会碰到这些边界。
`,
  },
  {
    title: '三栏布局与阅读体验：一些细节',
    slug: 'three-column-layout-reading',
    category: '设计随笔',
    tags: ['设计', '随笔'],
    pinned: 0,
    summary: '行宽、行高、留白与动效，决定了读者愿意在页面上停留多久。',
    content: `## 行宽是第一位的

正文的单行字数控制在 30 到 40 个汉字之间最舒服。太宽会让眼睛在换行时丢失位置，太窄则频繁换行，阅读节奏被打断。

## 留白不是浪费

卡片之间的间距、段落之间的呼吸感，都是内容的一部分。把留白做够，信息密度反而更清晰。

## 动效要克制

卡片 hover 时上浮 2px、阴影加深一点，就足够了。过度的动画会让页面显得廉价。

## 深色模式

深色模式下不要直接用纯黑背景，用 \`hsl(215 26% 10%)\` 这类带一点蓝的深灰，配合降低饱和度的文字色，长时间阅读更舒服。
`,
  },
  {
    title: '我的 2026 阅读清单',
    slug: 'reading-list-2026',
    category: '生活随笔',
    tags: ['随笔'],
    pinned: 0,
    summary: '今年想认真读完的几本书，以及一点关于「读完」的执念。',
    content: `## 技术之外

- 《置身事内》
- 《万历十五年》
- 《设计中的设计》

## 一点想法

以前总觉得读书要「有用」，后来发现真正留下印象的，往往是那些当时看不出用途的段落。

今年给自己的要求很简单：不追求数量，读完一本写一段笔记就好。
`,
  },
];

/** 首次初始化时的默认友链，与前台原有内容保持一致 */
const FRIEND_LINKS = [
  {
    name: 'Next.js',
    url: 'https://nextjs.org',
    description: 'React 全栈框架，本站的技术底座。',
  },
  {
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    description: '原子化 CSS，快速搭建整洁的界面。',
  },
  {
    name: 'Drizzle ORM',
    url: 'https://orm.drizzle.team',
    description: 'TypeScript ORM，类型安全地访问 SQLite。',
  },
  {
    name: 'Lucide',
    url: 'https://lucide.dev',
    description: '简洁一致的开源图标库。',
  },
];

function count(sql) {
  return db.prepare(sql).get().cnt;
}

function main() {
  console.log(`→ 使用数据库文件：${dbFile}`);
  console.log('→ 创建数据表...');
  for (const sql of DDL) {
    db.exec(sql);
  }

  console.log('→ 写入初始账号...');
  const now = Math.floor(Date.now() / 1000);
  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('123456', 10);

  db.prepare(
    `INSERT INTO users (username, password_hash, display_name, avatar_url, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'admin', ?, ?)
     ON CONFLICT(username) DO UPDATE SET role = 'admin'`,
  ).run('admin', adminHash, '管理员', 'avatar-1', now, now);

  db.prepare(
    `INSERT INTO users (username, password_hash, display_name, avatar_url, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'user', ?, ?)
     ON CONFLICT(username) DO NOTHING`,
  ).run('xiaolin', userHash, '小林', 'avatar-2', now, now);

  // 老数据补齐默认昵称与内置头像
  db.exec("UPDATE users SET display_name = username WHERE display_name IS NULL OR display_name = ''");
  db.exec("UPDATE users SET avatar_url = 'avatar-' || ((id % 4) + 1) WHERE avatar_url IS NULL OR avatar_url = ''");
  db.exec("UPDATE users SET display_name = '管理员' WHERE username = 'admin' AND display_name = 'admin'");
  db.exec("UPDATE users SET display_name = '小林' WHERE username = 'xiaolin' AND display_name = 'xiaolin'");

  if (count('SELECT COUNT(*) AS cnt FROM posts') > 0) {
    console.log('→ 已存在文章数据，跳过内容初始化。');
    ensureSettings();
    ensureFriendLinks();
    db.close();
    console.log('✅ 数据库检查完成。');
    return;
  }

  console.log('→ 写入分类与标签...');
  const categoryNames = ['技术笔记', '设计随笔', '生活随笔'];
  const categorySlugs = ['tech', 'design', 'life'];
  const categoryIds = {};
  const insertCategory = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  for (const [i, name] of categoryNames.entries()) {
    categoryIds[name] = Number(insertCategory.run(name, categorySlugs[i]).lastInsertRowid);
  }

  const tagNames = ['Next.js', '教程', 'SQLite', '设计', '随笔'];
  const tagSlugs = ['nextjs', 'tutorial', 'sqlite', 'design', 'essay'];
  const tagIds = {};
  const insertTag = db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)');
  for (const [i, name] of tagNames.entries()) {
    tagIds[name] = Number(insertTag.run(name, tagSlugs[i]).lastInsertRowid);
  }

  console.log('→ 写入示例文章...');
  const admin = db.prepare("SELECT id FROM users WHERE username = 'admin' LIMIT 1").get();
  const postIds = [];
  const insertPost = db.prepare(
    `INSERT INTO posts
      (title, slug, content, summary, category_id, author_id, status, is_pinned, view_count, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`,
  );
  const insertPostTag = db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)');

  for (const post of POSTS) {
    const result = insertPost.run(
      post.title,
      post.slug,
      post.content,
      post.summary,
      categoryIds[post.category],
      admin.id,
      post.pinned,
      Math.floor(Math.random() * 240) + 30,
      now,
      now,
      now,
    );
    const postId = Number(result.lastInsertRowid);
    postIds.push(postId);
    for (const tag of post.tags) {
      insertPostTag.run(postId, tagIds[tag]);
    }
  }

  console.log('→ 写入示例评论...');
  const demoUser = db.prepare("SELECT id FROM users WHERE username = 'xiaolin' LIMIT 1").get();
  const insertComment = db.prepare(
    `INSERT INTO comments (post_id, user_id, parent_id, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insertComment.run(
    postIds[0],
    demoUser.id,
    null,
    '布局很清爽，右栏的标签云挺实用的，期待后续的文章搜索功能。',
    'approved',
    now,
  );
  const topComment = insertComment.run(
    postIds[0],
    admin.id,
    null,
    '谢谢！搜索功能已经在计划里了。',
    'approved',
    now,
  );
  insertComment.run(
    postIds[0],
    demoUser.id,
    Number(topComment.lastInsertRowid),
    '太好了，等更新。',
    'approved',
    now,
  );
  insertComment.run(
    postIds[1],
    demoUser.id,
    null,
    '这条评论还在等待管理员审核，前台暂时看不到。',
    'pending',
    now,
  );

  console.log('→ 生成示例音乐...');
  const musicDir = path.join(process.cwd(), 'public', 'music');
  writeDemoWav(path.join(musicDir, 'demo-ambient-1.wav'), [220, 277.18, 329.63]);
  writeDemoWav(path.join(musicDir, 'demo-ambient-2.wav'), [196, 246.94, 293.66]);
  if (count('SELECT COUNT(*) AS cnt FROM songs') === 0) {
    const insertSong = db.prepare(
      `INSERT INTO songs (title, artist, file_path, duration, is_default, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    insertSong.run('午后微风', 'Demo Studio', '/music/demo-ambient-1.wav', 8, 1, 0, now);
    insertSong.run('夜色渐凉', 'Demo Studio', '/music/demo-ambient-2.wav', 8, 0, 1, now);
  }

  ensureSettings();
  ensureFriendLinks();
  db.close();
  console.log('✅ 初始化完成！');
  console.log('   管理员：admin / admin123');
  console.log('   测试用户：xiaolin / 123456');
}

function ensureSettings() {
  if (count('SELECT COUNT(*) AS cnt FROM settings') > 0) return;
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO settings (site_name, site_description, music_autoplay, music_volume, created_at, updated_at)
     VALUES (?, ?, 1, 0.50, ?, ?)`,
  ).run('青柠小站', '记录技术、生活与思考的个人博客', now, now);
}

/** 友链表为空时写入默认友链，后台已有数据时保持原样 */
function ensureFriendLinks() {
  if (count('SELECT COUNT(*) AS cnt FROM friend_links') > 0) return;
  const now = Math.floor(Date.now() / 1000);
  const insert = db.prepare(
    `INSERT INTO friend_links (name, url, description, sort_order, is_visible, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
  );
  FRIEND_LINKS.forEach((link, index) => {
    insert.run(link.name, link.url, link.description, index, now, now);
  });
}

try {
  main();
} catch (err) {
  console.error('❌ 初始化失败：', err);
  process.exit(1);
}
