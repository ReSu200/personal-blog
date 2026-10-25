# 个人博客项目 — dsflash 开发提示词

> **使用方式**：将本文内容完整复制给 dsflash 执行
> **工作目录**：`d:\Backup\Documents\ai-agent\work-mode-projects\Personal Blog`
> **MySQL 连通性**：✅ 已验证通过（2026-10-22）

---

## 角色

你是一名资深全栈工程师，擅长独立完成从调研到部署的完整项目。你工作时遵循 **Loop Engineering** 方法论：遇到不确定的技术细节时，先通过联网搜索验证 → 消化信息 → 再动手实现 → 测试验证 → 迭代优化，绝不凭印象写代码。

## 任务目标

在当前工作目录下，从零搭建一个完整的个人博客网站（前端 + 后端 + 数据库 + 音乐播放小组件），并完成开发与测试验证。

## 项目背景

我想搭建一个个人博客，用于分享技术/生活相关内容。网站分前台（给游客用）和后台（管理员用），游客可以注册登录后在文章下方评论，但不能自己发帖。同时希望网站带有一个自动播放的背景音乐小组件，增加氛围。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 14 (App Router) + TypeScript | 前后端一体，SSR/SSG |
| 样式 | Tailwind CSS + shadcn/ui | 组件库 + 工具类 |
| 数据库 | MySQL 8.4 | 已部署，见下方连接信息 |
| ORM | Drizzle ORM + mysql2 | 类型安全，轻量 |
| 认证 | Better Auth（Cookie 会话） | 支持用户名+密码注册登录 |
| Markdown | react-markdown + remark-gfm + rehype-highlight + @tailwindcss/typography | 代码高亮、GFM |
| 编辑器 | @uiw/react-md-editor（后台） | Markdown 实时预览 |
| XSS 防护 | DOMPurify | 评论内容过滤 |
| 限流 | next-rate-limit（进程内） | 防暴力破解 |
| 音乐播放器 | HTML5 `<audio>` + 自封装 React 组件 | 无需额外第三方播放器库 |
| 文件上传 | Next.js API Route + multer 或原生 fs | 歌曲文件存本地 `public/music/` |
| 无 Redis | — | 个人博客体量无需，单实例部署 |

---

## 数据库连接信息（已验证 ✅）

| 项目 | 值 |
|------|-----|
| Host | `10.10.10.111` |
| Port | `3306` |
| User | `blog_user` |
| Password | `Blog@2026` |
| Database | `personal_blog` |
| 字符集 | `utf8mb4_unicode_ci` |

测试结果：MySQL 8.4.13，建表/写入/读取/删表权限全部 OK。

`.env` 文件内容：
```env
DB_HOST=10.10.10.111
DB_PORT=3306
DB_USER=blog_user
DB_PASSWORD=Blog@2026
DB_NAME=personal_blog

# Better Auth
BETTER_AUTH_SECRET=change-me-to-a-random-string
BETTER_AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

---

## 数据库表结构（Drizzle Schema）

数据库名：`personal_blog`，字符集 `utf8mb4`。

### users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | |
| username | VARCHAR(50) | UNIQUE NOT NULL | 用户名（登录用） |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 加密 |
| role | ENUM | DEFAULT 'user' | user / admin |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | |

### posts（文章表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | |
| title | VARCHAR(200) | NOT NULL | |
| slug | VARCHAR(200) | UNIQUE NOT NULL | URL 友好标识 |
| content | LONGTEXT | NOT NULL | Markdown 原文 |
| summary | VARCHAR(500) | | 摘要，自动截取前 200 字 |
| cover_image | VARCHAR(500) | | 头图 URL（可选） |
| category_id | BIGINT | FK → categories.id | |
| author_id | BIGINT | FK → users.id | |
| status | ENUM | DEFAULT 'draft' | draft / published |
| is_pinned | TINYINT(1) | DEFAULT 0 | 是否置顶 |
| view_count | INT | DEFAULT 0 | |
| published_at | DATETIME | | 定时发布时间 |
| created_at | DATETIME | | |
| updated_at | DATETIME | | |

### categories（分类表）

| 字段 | 类型 | 约束 |
|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT |
| name | VARCHAR(50) | UNIQUE NOT NULL |
| slug | VARCHAR(50) | UNIQUE NOT NULL |

### tags（标签表）

| 字段 | 类型 | 约束 |
|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT |
| name | VARCHAR(50) | UNIQUE NOT NULL |
| slug | VARCHAR(50) | UNIQUE NOT NULL |

### post_tags（文章-标签关联）

| 字段 | 类型 | 约束 |
|------|------|------|
| post_id | BIGINT | FK → posts.id |
| tag_id | BIGINT | FK → tags.id |

PK = (post_id, tag_id)

### comments（评论表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | |
| post_id | BIGINT | FK → posts.id NOT NULL | |
| user_id | BIGINT | FK → users.id NOT NULL | |
| parent_id | BIGINT | FK → comments.id | 支持嵌套回复，NULL = 顶级评论 |
| content | TEXT | NOT NULL | |
| status | ENUM | DEFAULT 'pending' | pending / approved / rejected |
| created_at | DATETIME | | |

### songs（歌曲表）🆕

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | |
| title | VARCHAR(200) | NOT NULL | 歌曲名 |
| artist | VARCHAR(100) | | 艺术家/歌手 |
| file_path | VARCHAR(500) | NOT NULL | 相对路径，如 `/music/song1.mp3` |
| cover_url | VARCHAR(500) | | 封面图 URL（可选） |
| duration | DECIMAL(10,2) | | 时长秒数（上传时通过 ffprobe 或前端 audio 元素获取） |
| is_default | TINYINT(1) | DEFAULT 0 | 是否为默认播放歌曲 |
| sort_order | INT | DEFAULT 0 | 播放顺序 |
| created_at | DATETIME | | |

### settings（站点设置表）

| 字段 | 类型 | 约束 |
|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT |
| site_name | VARCHAR(100) | |
| site_description | VARCHAR(500) | |
| author_name | VARCHAR(50) | |
| author_avatar | VARCHAR(500) | |
| github_url | VARCHAR(500) | |
| music_autoplay | TINYINT(1) | DEFAULT 1 | 🆕 是否自动播放音乐 |
| music_volume | DECIMAL(3,2) | DEFAULT 0.5 | 🆕 默认音量 0.0-1.0 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

---

## 功能需求

### 1. 前台功能（游客）

- **首页**
  - 最新文章列表（分页，每页 10 篇）
  - 置顶文章带醒目徽章，排在最上方
  - 文章卡片：头图、标题、摘要、分类标签、发布日期、浏览量、置顶标记
  - 右侧信息栏（窄屏隐藏）：博主简介卡片、热门标签云、友情链接、站点统计
  - 主色调清爽蓝绿/莫兰迪色系，圆角卡片，hover 微动效

- **文章详情页**
  - Markdown 渲染：代码高亮、GFM 表格、图片
  - 目录大纲（TOC），固定在侧边
  - 评论区：仅登录用户可评论，嵌套回复（两层），评论需管理员审核后显示
  - 上一篇 / 下一篇导航
  - 返回顶部按钮

- **文章列表页**
  - 按分类 / 标签筛选
  - 关键词搜索（标题 + 摘要）

- **注册 / 登录 / 登出**
  - **仅用户名 + 密码**（无需邮箱、手机号、验证码）
  - 表单校验：用户名 3-20 字符、密码 6-32 字符
  - 简单速率限制：同一 IP 5 次失败后锁定 5 分钟

- **RSS 订阅**

- **🆕 音乐播放器小组件**
  - **位置**：固定在页面**左下角**，默认显示为一个收起的小图标（类似悬浮球），不占用主要内容空间
  - **自动播放**：游客进入网站（任意页面）时自动播放站点设置的默认歌曲
    - ⚠️ 现代浏览器普遍阻止无用户交互的自动播放，需按以下策略处理：
      - Loop：搜索 `Next.js audio autoplay browser policy 2025` 获取最新处理方案
      - 策略：组件 mount 时尝试 `audio.play()`，如果被浏览器拦截则**静音自动播放**（`muted=true`），用户首次点击后恢复音量；或显示一个"点击开启音乐"的小提示气泡
  - **播放器展开态**：点击悬浮图标展开，显示：
    - 封面图（如有）
    - 当前歌曲名 + 艺术家
    - 播放/暂停按钮
    - 上一首/下一首切换按钮（循环播放列表）
    - 进度条（可拖动）
    - 音量控制
    - 收起按钮
  - **切换歌曲**：点击上一首/下一首在 songs 表中按 sort_order 循环切换
  - **状态持久化**：用户暂停/音量设置存 localStorage，下次访问保留
  - **移动端适配**：左下角悬浮图标在小屏幕上也要可点击、不被遮挡（注意避开浏览器底部 UI）

### 2. 后台功能（管理员）

- 安全登录（独立入口 `/admin`，中间件保护，需 admin 角色）
- **仪表盘**：文章数、评论数、待审核评论数、最近文章列表、歌曲数
- **文章管理**：Markdown 编辑器（@uiw/react-md-editor 实时预览）、发布/草稿/删除、分类标签管理、置顶开关、定时发布
- **评论管理**：审核/删除、批量操作、按状态筛选
- **分类/标签管理**：增删改
- **🆕 音乐管理**
  - 歌曲列表：展示所有已上传歌曲（标题、艺术家、时长、是否默认、操作按钮）
  - **上传歌曲**：支持 MP3 / WAV / OGG / FLAC 格式，最大 50MB
    - 文件保存到 `public/music/` 目录，用 UUID 重命名避免冲突
    - 上传成功后自动解析音频时长（利用 HTML5 `<audio>` 元素的 `loadedmetadata` 事件）
    - 可同时上传封面图（可选）
  - **设置默认歌曲**：点击某首歌的"设为默认"按钮，更新 songs.is_default
  - **排序**：拖拽或上下箭头调整 sort_order
  - **删除歌曲**：删除数据库记录 + 物理文件
  - **站点音乐设置**：是否自动播放、默认音量
- **站点设置**：站点名称、描述、博主昵称、头像 URL、GitHub 链接

---

## 主页设计参考

参考 `http://mrzym.top` 的三栏布局风格：

### 布局
- **左侧导航栏**（固定侧边栏）：站点 Logo/名称、导航入口、深色模式切换、社交图标
- **中间主内容区**：文章卡片列表 + 分页
- **右侧信息栏**（可选，窄屏隐藏）：博主简介、热门标签、友情链接、站点统计

### 视觉
- 主色调：清爽蓝绿 / 莫兰迪色系
- 文章卡片：圆角、hover 微动效（轻微上浮 + 阴影加深）
- 置顶文章带醒目 "置顶" 徽章
- 标签用小圆角徽章样式，可点击筛选
- 留白充足，不拥挤
- **注意：参考风格但不要完全照抄，融入自己的设计思考**

---

## Loop Engineering 工作流程（请严格遵守）

**Loop 1 — 技术栈验证（动手前必做）**
1. 搜索 `Next.js 14 App Router + Drizzle ORM + MySQL + Better Auth 集成 2025`，确认最新配置方式
2. 搜索 `shadcn/ui Next.js 14 安装步骤`，确认组件库安装命令
3. 搜索 `@uiw/react-md-editor Next.js 14 兼容性`，确认是否需 dynamic import
4. 搜索 `Next.js audio autoplay browser policy 2025`，确认音乐自动播放的最佳实践
5. 搜索 `Next.js API Route file upload mp3 multer 2025`，确认歌曲上传的处理方式
6. 把发现的配置要点记录清楚后再动手

**Loop 2 — 参考网站分析（动手前必做）**
1. 用 WebFetch 打开 `http://mrzym.top`，观察实际页面布局（栏比例、卡片间距、色彩、置顶样式）
2. 提取关键视觉元素，作为首页设计参考，但不要完全复制代码

**Loop 3 — 分步实现与验证**

按以下顺序逐步实现，每完成一个模块先本地启动验证再继续：

| 步骤 | 内容 | 验证点 |
|------|------|--------|
| 1 | **项目初始化** — Next.js 14 + TS + Tailwind + shadcn/ui + Drizzle + MySQL + Better Auth 基础骨架 | 能连上 MySQL，能注册/登录 |
| 2 | **数据库 Schema + Seed** — 所有表（含 songs）+ seed 脚本（管理员、分类、标签、测试文章/评论/示例歌曲） | `npm run db:push` 建表成功，seed 数据正确 |
| 3 | **前台布局** — 三栏布局跑通，首页文章卡片正常（置顶、标签、日期、摘要） | 首页视觉效果正常，响应式断点 OK |
| 4 | **文章详情页** — Markdown 渲染 + 代码高亮 + 目录 TOC + 评论区（pending 状态） | 详情页正常渲染，评论提交成功 |
| 5 | **认证完善** — Better Auth 中间件保护后台，admin 角色判断 | `/admin` 未登录跳转，普通用户进不去 |
| 6 | **🆕 音乐模块** — 上传 API + 后台音乐管理页面 + 前台播放器组件 | 上传歌曲成功、播放器自动播放、暂停/切换正常 |
| 7 | **后台管理** — 文章 CRUD、评论审核、分类标签、置顶开关 | 完整 CRUD 流程通畅 |
| 8 | **全流程联调 + 测试验证** | 见下方测试清单 |

---

## 测试验证清单

项目完成后，启动 `npm run dev`，逐一验证：

- [ ] **认证流程**：注册普通用户 → 登录 → 发表评论（pending）→ 登出 → 管理员登录 → 审核评论 → 前台显示
- [ ] **文章流程**：管理员创建文章（带分类、标签、置顶）→ 前台确认置顶在最上 → 详情页渲染正常
- [ ] **搜索/筛选**：分类筛选、标签筛选、关键词搜索正常
- [ ] **响应式**：桌面 / 平板 / 手机三端布局正常
- [ ] **深色模式**：切换深浅色，所有组件样式正确
- [ ] **XSS 过滤**：评论输入 `<script>alert(1)</script>` 不执行
- [ ] **限流**：连续 5 次错误登录后被锁定
- [ ] **🆕 音乐播放**：进入页面自动播放 → 点击暂停 → 下一首切换 → 进度条拖动 → 音量调整
- [ ] **🆕 音乐上传**：后台上传 MP3 → 设为默认 → 前台刷新自动播放新默认歌曲
- [ ] **🆕 音乐持久化**：暂停后刷新页面 → 恢复暂停状态；调整音量后刷新 → 音量保留

---

## 交付物

- 完整可运行的项目源代码（前端 + 后端在同一个 Next.js 项目中）
- `.env.example`（包含 MySQL 连接信息、Better Auth 配置）
- `README.md`（启动步骤、数据库初始化说明、默认管理员账号、功能列表）
- Drizzle migration 文件（`drizzle/` 目录）
- Seed 脚本（初始化管理员账号、测试文章、示例歌曲）
- `public/music/` 目录（存放上传的歌曲文件）

---

## 默认账号

Seed 脚本应创建以下管理员账号：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| admin | `admin` | `admin123` |

⚠️ 上线前务必修改默认密码。

---

## 注意事项

- 所有用户输入都做服务端 Zod 校验
- 密码使用 bcrypt 加密存储
- 评论内容用 DOMPurify 做 XSS 过滤
- 文章 slug 自动生成（去特殊字符、小写、连字符连接）
- 浏览量在文章详情页访问时 +1（用简单 UPDATE 即可，无 Redis）
- Next.js 自带 ISR，首页用 `revalidate = 60` 做增量静态再生成，替代 Redis 缓存
- Better Auth 使用 MySQL adapter（不要用 SQLite adapter）

### 🆕 音乐模块注意事项
- 上传接口要校验文件类型（audio/mpeg、audio/wav、audio/ogg、audio/flac）和大小（≤ 50MB）
- 文件重命名用 UUID 避免同名覆盖
- 物理删除歌曲时同步删除 `public/music/` 下的文件（用 Node.js `fs.unlinkSync`）
- 自动播放策略：先尝试正常播放，失败则降级为静音自动播放并在 UI 上提示用户点击开启
- 音乐播放器组件用 `'use client'` 声明，放在全局布局的最外层，确保所有页面都能看到
- 移动端注意：iOS Safari 限制自动播放 + 限制部分音频格式，优先用 MP3 格式

---

## 开始

现在请先执行 **Loop 1（技术栈验证）** 和 **Loop 2（参考网站分析）**，把调研发现的关键配置点展示给我，然后再开始写代码。

**记住：先搜索验证，再动手实现。**
