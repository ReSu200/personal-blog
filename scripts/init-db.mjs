/**
 * 数据库初始化脚本：
 * 1. 创建所有数据表（IF NOT EXISTS）
 * 2. 写入初始数据（管理员、分类、标签、示例文章、评论、示例音乐、站点设置）
 *
 * 运行：node scripts/init-db.mjs
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(50) NULL,
    avatar_url VARCHAR(500) NULL,
    github_url VARCHAR(500) NULL,
    qq VARCHAR(20) NULL,
    wechat VARCHAR(50) NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_categories_name (name),
    UNIQUE KEY uk_categories_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS tags (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tags_name (name),
    UNIQUE KEY uk_tags_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS posts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    content LONGTEXT NOT NULL,
    summary VARCHAR(500) NULL,
    cover_image VARCHAR(500) NULL,
    category_id BIGINT UNSIGNED NULL,
    author_id BIGINT UNSIGNED NOT NULL,
    status ENUM('draft','published') NOT NULL DEFAULT 'draft',
    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_posts_slug (slug),
    KEY idx_posts_status_published (status, published_at),
    KEY idx_posts_category (category_id),
    CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS post_tags (
    post_id BIGINT UNSIGNED NOT NULL,
    tag_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS comments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    parent_id BIGINT UNSIGNED NULL,
    content TEXT NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_comments_post_status (post_id, status),
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS songs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(100) NULL,
    file_path VARCHAR(500) NOT NULL,
    cover_url VARCHAR(500) NULL,
    duration DECIMAL(10,2) NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    site_name VARCHAR(100) NULL,
    site_description VARCHAR(500) NULL,
    logo_url VARCHAR(500) NULL,
    hero_background VARCHAR(500) NULL,
    featured_cover VARCHAR(500) NULL,
    featured_cover_position VARCHAR(30) NOT NULL DEFAULT '50% 50%',
    latest_cover VARCHAR(500) NULL,
    latest_cover_position VARCHAR(30) NOT NULL DEFAULT '50% 50%',
    visit_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
    music_autoplay TINYINT(1) NOT NULL DEFAULT 1,
    music_volume DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
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
    title: '用 Next.js 14 搭建个人博客：从零到上线',
    slug: 'build-blog-with-nextjs-14',
    category: '技术笔记',
    tags: ['Next.js', '教程'],
    pinned: 1,
    summary: '记录这个博客从技术选型、数据库设计到界面打磨的完整过程，包含踩过的坑与取舍。',
    content: `## 为什么重新做一个博客

市面上的博客模板很多，但真正做到「自己想怎么改就怎么改」的，还是得自己写。这一次我选择了 Next.js 14 的 App Router，配合 MySQL 与 Drizzle ORM，把前后端放在同一个项目里维护。

## 技术选型

- **框架**：Next.js 14（App Router）+ TypeScript
- **数据库**：MySQL 8.4
- **ORM**：Drizzle ORM
- **样式**：Tailwind CSS
- **认证**：用户名 + 密码，JWT 存入 HttpOnly Cookie

### 为什么不用 SQLite

个人博客用 SQLite 完全够用，但我想顺便练习一下生产环境常见的 MySQL 部署方式，于是把数据库单独放在了一台内网主机上。

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
    title: 'MySQL 8.4 最小权限账号实践',
    slug: 'mysql-least-privilege',
    category: '技术笔记',
    tags: ['MySQL', '教程'],
    pinned: 0,
    summary: '给应用单独建账号，只授予必要的库权限，比直接用 root 连接安全得多。',
    content: `## 为什么要单独建账号

用 root 连接应用数据库，等于把整台数据库服务器的钥匙交给了应用。一旦应用出现注入漏洞，攻击者就能拿到所有库的读写权限。

## 创建账号

\`\`\`sql
CREATE DATABASE IF NOT EXISTS personal_blog
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER 'blog_user'@'%' IDENTIFIED BY 'YourStrongPassword';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER
  ON personal_blog.* TO 'blog_user'@'%';

FLUSH PRIVILEGES;
\`\`\`

## 还需要注意什么

- \`bind-address\` 要允许外部连接，但最好配合防火墙只放行应用服务器 IP
- 开启慢查询日志，方便排查索引问题
- 定期备份，并在另一台机器上演练恢复

## 小结

最小权限不是麻烦，而是一次性的成本。配置好之后，后续所有开发都不用再碰 root。
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

/** 为已存在的旧表补建外键（新建表时已包含在 DDL 中） */
async function ensureForeignKeys(conn) {
  const foreignKeys = [
    {
      table: 'posts',
      name: 'fk_posts_category',
      sql: 'ALTER TABLE posts ADD CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL',
    },
    {
      table: 'posts',
      name: 'fk_posts_author',
      sql: 'ALTER TABLE posts ADD CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id)',
    },
    {
      table: 'post_tags',
      name: 'fk_post_tags_post',
      sql: 'ALTER TABLE post_tags ADD CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE',
    },
    {
      table: 'post_tags',
      name: 'fk_post_tags_tag',
      sql: 'ALTER TABLE post_tags ADD CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE',
    },
    {
      table: 'comments',
      name: 'fk_comments_post',
      sql: 'ALTER TABLE comments ADD CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE',
    },
    {
      table: 'comments',
      name: 'fk_comments_user',
      sql: 'ALTER TABLE comments ADD CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    },
  ];

  for (const fk of foreignKeys) {
    const [rows] = await conn.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
      [process.env.DB_NAME, fk.table, fk.name],
    );
    if (rows.length > 0) continue;

    try {
      await conn.query(fk.sql);
      console.log(`  + 已补建外键 ${fk.name}`);
    } catch (error) {
      console.warn(`  ! 外键 ${fk.name} 添加失败：${error.message}`);
    }
  }
}

/** 为已存在的旧表补齐新增字段 */
async function ensureColumns(conn) {
  const columns = [
    {
      table: 'users',
      name: 'display_name',
      sql: 'ALTER TABLE users ADD COLUMN display_name VARCHAR(50) NULL AFTER password_hash',
    },
    {
      table: 'users',
      name: 'avatar_url',
      sql: 'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER display_name',
    },
    {
      table: 'users',
      name: 'github_url',
      sql: 'ALTER TABLE users ADD COLUMN github_url VARCHAR(500) NULL AFTER avatar_url',
    },
    {
      table: 'users',
      name: 'qq',
      sql: 'ALTER TABLE users ADD COLUMN qq VARCHAR(20) NULL AFTER github_url',
    },
    {
      table: 'users',
      name: 'wechat',
      sql: 'ALTER TABLE users ADD COLUMN wechat VARCHAR(50) NULL AFTER qq',
    },
    {
      table: 'settings',
      name: 'logo_url',
      sql: 'ALTER TABLE settings ADD COLUMN logo_url VARCHAR(500) NULL AFTER site_description',
    },
    {
      table: 'settings',
      name: 'hero_background',
      sql: 'ALTER TABLE settings ADD COLUMN hero_background VARCHAR(500) NULL AFTER logo_url',
    },
    {
      table: 'settings',
      name: 'featured_cover',
      sql: 'ALTER TABLE settings ADD COLUMN featured_cover VARCHAR(500) NULL AFTER hero_background',
    },
    {
      table: 'settings',
      name: 'featured_cover_position',
      sql: "ALTER TABLE settings ADD COLUMN featured_cover_position VARCHAR(30) NOT NULL DEFAULT '50% 50%' AFTER featured_cover",
    },
    {
      table: 'settings',
      name: 'latest_cover',
      sql: 'ALTER TABLE settings ADD COLUMN latest_cover VARCHAR(500) NULL AFTER featured_cover_position',
    },
    {
      table: 'settings',
      name: 'latest_cover_position',
      sql: "ALTER TABLE settings ADD COLUMN latest_cover_position VARCHAR(30) NOT NULL DEFAULT '50% 50%' AFTER latest_cover",
    },
    {
      table: 'settings',
      name: 'visit_count',
      sql: 'ALTER TABLE settings ADD COLUMN visit_count BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER latest_cover_position',
    },
  ];

  for (const column of columns) {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME, column.table, column.name],
    );
    if (rows.length > 0) continue;
    await conn.query(column.sql);
    console.log(`  + 已补充字段 ${column.table}.${column.name}`);
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
    charset: 'utf8mb4',
  });

  console.log('→ 创建数据表...');
  for (const sql of DDL) {
    await conn.query(sql);
  }
  await ensureForeignKeys(conn);
  await ensureColumns(conn);

  console.log('→ 写入初始账号...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('123456', 10);
  await conn.execute(
    `INSERT INTO users (username, password_hash, display_name, avatar_url, role) VALUES (?, ?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE role = 'admin'`,
    ['admin', adminHash, '管理员', 'avatar-1'],
  );
  await conn.execute(
    `INSERT INTO users (username, password_hash, display_name, avatar_url, role) VALUES (?, ?, ?, ?, 'user')
     ON DUPLICATE KEY UPDATE username = username`,
    ['xiaolin', userHash, '小林', 'avatar-2'],
  );

  // 老数据补齐默认昵称与内置头像
  await conn.query("UPDATE users SET display_name = username WHERE display_name IS NULL OR display_name = ''");
  await conn.query("UPDATE users SET avatar_url = CONCAT('avatar-', (id % 4) + 1) WHERE avatar_url IS NULL OR avatar_url = ''");
  // 内置演示账号：昵称仍是登录名时，替换为可读昵称
  await conn.query("UPDATE users SET display_name = '管理员' WHERE username = 'admin' AND display_name = 'admin'");
  await conn.query("UPDATE users SET display_name = '小林' WHERE username = 'xiaolin' AND display_name = 'xiaolin'");

  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM posts');
  if (cnt > 0) {
    console.log('→ 已存在文章数据，跳过内容初始化。');
    await ensureSettings(conn);
    await conn.end();
    console.log('✅ 数据库检查完成。');
    return;
  }

  console.log('→ 写入分类与标签...');
  const categoryIds = {};
  for (const [i, name] of ['技术笔记', '设计随笔', '生活随笔'].entries()) {
    const slug = ['tech', 'design', 'life'][i];
    const [res] = await conn.execute('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    categoryIds[name] = res.insertId;
  }

  const tagIds = {};
  for (const [i, name] of ['Next.js', '教程', 'MySQL', '设计', '随笔'].entries()) {
    const slug = ['nextjs', 'tutorial', 'mysql', 'design', 'essay'][i];
    const [res] = await conn.execute('INSERT INTO tags (name, slug) VALUES (?, ?)', [name, slug]);
    tagIds[name] = res.insertId;
  }

  console.log('→ 写入示例文章...');
  const [[admin]] = await conn.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
  const postIds = [];
  for (const post of POSTS) {
    const [res] = await conn.execute(
      `INSERT INTO posts
        (title, slug, content, summary, category_id, author_id, status, is_pinned, view_count, published_at)
       VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, NOW())`,
      [
        post.title,
        post.slug,
        post.content,
        post.summary,
        categoryIds[post.category],
        admin.id,
        post.pinned,
        Math.floor(Math.random() * 240) + 30,
      ],
    );
    postIds.push(res.insertId);
    for (const tag of post.tags) {
      await conn.execute('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [res.insertId, tagIds[tag]]);
    }
  }

  console.log('→ 写入示例评论...');
  const [[demoUser]] = await conn.query("SELECT id FROM users WHERE username = 'xiaolin' LIMIT 1");
  await conn.execute(
    `INSERT INTO comments (post_id, user_id, content, status) VALUES (?, ?, ?, 'approved')`,
    [postIds[0], demoUser.id, '布局很清爽，右栏的标签云挺实用的，期待后续的文章搜索功能。'],
  );
  const [topComment] = await conn.execute(
    `INSERT INTO comments (post_id, user_id, content, status) VALUES (?, ?, ?, 'approved')`,
    [postIds[0], admin.id, '谢谢！搜索功能已经在计划里了。'],
  );
  await conn.execute(
    `INSERT INTO comments (post_id, user_id, parent_id, content, status) VALUES (?, ?, ?, ?, 'approved')`,
    [postIds[0], demoUser.id, topComment.insertId, '太好了，等更新。'],
  );
  await conn.execute(
    `INSERT INTO comments (post_id, user_id, content, status) VALUES (?, ?, ?, 'pending')`,
    [postIds[1], demoUser.id, '这条评论还在等待管理员审核，前台暂时看不到。'],
  );

  console.log('→ 生成示例音乐...');
  const musicDir = path.join(process.cwd(), 'public', 'music');
  writeDemoWav(path.join(musicDir, 'demo-ambient-1.wav'), [220, 277.18, 329.63]);
  writeDemoWav(path.join(musicDir, 'demo-ambient-2.wav'), [196, 246.94, 293.66]);
  const [[{ songCnt }]] = await conn.query('SELECT COUNT(*) AS songCnt FROM songs');
  if (songCnt === 0) {
    await conn.execute(
      `INSERT INTO songs (title, artist, file_path, duration, is_default, sort_order)
       VALUES ('午后微风', 'Demo Studio', '/music/demo-ambient-1.wav', 8.00, 1, 0),
              ('夜色渐凉', 'Demo Studio', '/music/demo-ambient-2.wav', 8.00, 0, 1)`,
    );
  }

  await ensureSettings(conn);
  await conn.end();
  console.log('✅ 初始化完成！');
  console.log('   管理员：admin / admin123');
  console.log('   测试用户：xiaolin / 123456');
}

async function ensureSettings(conn) {
  const [[row]] = await conn.query('SELECT COUNT(*) AS cnt FROM settings');
  if (row.cnt === 0) {
    await conn.execute(
      `INSERT INTO settings
        (site_name, site_description, music_autoplay, music_volume)
       VALUES (?, ?, 1, 0.50)`,
      ['青柠小站', '记录技术、生活与思考的个人博客'],
    );
  }
}

main().catch((err) => {
  console.error('❌ 初始化失败：', err);
  process.exit(1);
});
