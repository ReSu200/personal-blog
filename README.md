# 青柠小站 · 个人博客

基于 Next.js 16（App Router）+ SQLite 的前后端一体个人博客，包含前台顶部导航阅读界面、后台管理系统、评论审核与背景音乐播放器。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 框架 | Next.js 16.4（App Router）+ React 19 + TypeScript 5.9 |
| 样式 | Tailwind CSS 4（CSS-first 配置）+ 自建 shadcn 风格组件 |
| 数据库 | SQLite（单文件，WAL 模式） |
| ORM | Drizzle ORM + better-sqlite3 |
| 认证 | 用户名 + 密码，bcrypt 加密，JWT 存 HttpOnly Cookie（jose） |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| 图标 | lucide-react |
| 主题 | next-themes（跟随系统 / 手动切换） |
| 校验 | Zod |
| 测试 | Vitest 5 + Testing Library + jsdom |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置数据库文件
#    复制 .env.example 为 .env.local 并按需修改
#    （仓库中已提供可直接使用的 .env.local，默认 DB_FILE=./data/blog.db）

# 3. 初始化数据库（建表 + 索引 + 初始数据，幂等）
npm run db:init

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 环境变量

```env
# SQLite 数据库文件（相对路径基于项目根目录，目录会自动创建）
DB_FILE=./data/blog.db

AUTH_SECRET=请替换为随机长字符串
AUTH_COOKIE_NAME=blog_session

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> 数据库是单个文件，备份只需复制 `data/blog.db`（连同 `blog.db-wal` / `blog.db-shm`，或先停服）。

> 历史数据：已从 MySQL（`10.10.10.111` 的 `personal_blog`）完整导入当前 SQLite，包含 3 个用户、5 篇文章、5 条评论、8 个标签、4 个分类、音乐与站点设置；导入前的库文件已备份为 `data/backup-*.db`。旧 `settings` 里的 `author_name` / `author_avatar` / `github_url` 已废弃，作者信息统一取自管理员账号资料。

## 默认账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | `admin` | `admin123` |
| 普通用户 | `xiaolin` | `123456` |

> 上线前请务必修改默认密码。

## 功能清单

### 前台

- 顶部固定导航：下滑后毛玻璃状态栏，左侧站名与 Logo，中间导航（首页 / 文章 / 关于我 / 友链），右侧个人中心与主题切换（移动端为下拉菜单）
- 首页：通栏首屏（从顶部状态栏那一行铺满到推荐位上方，背景板图片可在后台上传，底部双层水波浪过渡）、推荐位卡片、文章卡片列表（置顶徽章 / 分类 / 标签 / 日期 / 阅读量）、分页，右侧信息栏与「最新文章」标题行对齐
- 文章浏览模式：首页「最新文章」支持列表 / 九宫格切换，偏好存入 Cookie 由服务端直出，刷新不会闪跳
- 文章列表：关键词搜索（标题 + 摘要）、分类筛选、标签筛选、组合条件分页
- 文章详情：左侧粘性作者卡与目录、右侧 760px 正文三栏式版式，顶部 21:9 封面，Markdown 渲染 + 代码高亮，顶部阅读进度条与「直达评论 / 回到顶部」悬浮按钮，上一篇 / 下一篇、浏览量统计
- 作者卡：首页右侧栏与文章详情页左栏共用同一个 `AuthorCard` 组件（背景板 + 头像 + 昵称 + 个人描述 + GitHub / QQ / 微信徽章 + 了解更多），两处展示完全一致
- 关于我：顶部横幅复用首页背景板，底部「关于这个站点」正文与三栏统计（文章 / 分类 / 访问）与首页右侧统计卡一致
- 页脚：版权文案可在后台配置，支持 `{year}` / `{site}` / `{author}` 占位符，留空则按默认格式自动生成
- 评论：仅登录用户可评论，支持两层回复，**需管理员审核后展示**
- 注册 / 登录 / 登出：仅用户名 + 密码，注册需二次确认密码；登录需图形验证码（服务端 SVG 生成 + HMAC 签名 Cookie，5 分钟有效、一次性使用）
- 个人中心（`/account`）：上传头像（PNG / JPG / WEBP，≤1MB）或选择 4 款内置头像、修改昵称、修改登录用户名、修改密码；管理员可额外维护 GitHub / QQ / 微信（管理员的昵称、头像与联系方式会作为博主信息展示在「关于我」与右侧作者卡）
- 登录失败限流：同一 IP 连续 5 次失败锁定 5 分钟
- 深色 / 浅色主题切换（圆形扩散过渡动画）
- RSS 订阅：`/rss.xml`
- 左下角音乐播放器：自动播放默认歌曲、暂停 / 切换 / 进度 / 音量，按钮可拖拽移动，位置存入 Cookie 并在客户端读取恢复

### 后台（`/admin`）

- 仪表盘：文章 / 评论 / 待审核 / 音乐数量，最近更新文章
- 文章管理：Markdown 编辑 + 实时预览、草稿 / 发布、置顶、分类、标签、定时发布时间、删除；封面直接上传（≤4MB，不设则回退站点默认封面）并可在预览区拖拽 / 方向键调整显示焦点，标签为带搜索的多选下拉（数据来自「分类与标签」）
- 正文插图上传：编辑器工具条「插入图片」，上传后按当前光标位置插入 `![说明](/uploads/xxx.png)`，并自动补换行、光标落在插入内容末尾、只滚动编辑区定位到插入行
- 评论管理：待审核 / 已通过 / 已拒绝筛选，通过、拒绝、删除
- 分类与标签：新增、删除（删除分类时文章自动置为未分类）
- 音乐管理：上传 MP3/WAV/OGG/FLAC（≤50MB）、设置默认播放、排序、删除（同步删除本地文件）
- 站点设置：单列四段式布局（基本信息 / 品牌与背景 / 帖子默认封面 / 音乐播放），含站点名称、个人描述、关于这个站点（留空显示默认文案）、页脚版权文案、网站 Logo 上传（≤2MB，可恢复默认）、首页背景板上传（≤4MB，可拖拽调整显示位置，可移除恢复默认背景）、推荐位默认封面与最新文章默认封面（各 ≤4MB，可拖拽预览调整显示位置）、音乐自动播放开关与默认音量；底部为吸底保存条
- 删除确认：文章、评论、友链、音乐、分类与标签的删除统一使用页内确认弹层（遮罩 / Esc / 自动聚焦），不使用原生 `window.confirm` / `window.alert`，规避内嵌浏览器弹出原生对话框时崩溃

## 数据库表

SQLite 类型约定：主键为 `INTEGER PRIMARY KEY AUTOINCREMENT`，时间戳统一存 Unix 秒（Drizzle `integer({ mode: 'timestamp' })` 自动转 `Date`），布尔值用 `0/1`（`is_pinned`、`is_default`、`music_autoplay`），音乐时长为 `REAL`。连接层开启 `journal_mode = WAL` 与 `PRAGMA foreign_keys = ON`。

| 表 | 说明 |
| --- | --- |
| `users` | 用户（username、password_hash、display_name、avatar_url、github_url、qq、wechat、role） |
| `posts` | 文章（slug 唯一、status、is_pinned、view_count、cover_position 封面焦点） |
| `categories` | 分类 |
| `tags` | 标签 |
| `post_tags` | 文章-标签关联（联合主键） |
| `comments` | 评论（parent_id 支持两层回复、status 审核状态） |
| `songs` | 背景音乐（file_path、is_default、sort_order） |
| `settings` | 站点设置（单行，含 logo_url、hero_background 首页背景板与 hero_position、featured_cover / latest_cover 两处默认封面及其显示位置、about_site 关于站点文案、footer_text 页脚版权文案、visit_count 访问量） |

外键关系：

- `posts.category_id → categories.id`（ON DELETE SET NULL）
- `posts.author_id → users.id`
- `post_tags.post_id → posts.id`、`post_tags.tag_id → tags.id`（ON DELETE CASCADE）
- `comments.post_id → posts.id`、`comments.user_id → users.id`（ON DELETE CASCADE）

## 目录结构

```
src/
├── app/
│   ├── (site)/              # 前台路由组（共用顶部导航 + 音乐播放器）
│   │   ├── page.tsx         # 首页
│   │   ├── posts/           # 文章列表 / 详情
│   │   ├── login|register/  # 登录注册
│   │   ├── about/           # 关于我
│   │   └── rss.xml/         # RSS
│   ├── admin/               # 后台（独立布局，中间件保护）
│   ├── api/                 # 认证（含 /api/auth/session）/ 评论 / 后台 / 阅读上报
│   ├── icon.png             # 站点 favicon（Logo 居中裁方）
│   └── globals.css          # 设计令牌、通栏工具类、波浪动画
├── components/              # 布局、卡片、播放器、编辑器、管理组件（__tests__ 下为组件单元测试）
├── db/                      # Drizzle schema 与 better-sqlite3 连接
├── lib/                     # 认证、查询、限流、工具
└── proxy.ts                 # Next 16 Proxy，保护 /admin
scripts/init-db.mjs          # SQLite 建表 + 索引 + 初始数据
vitest.config.mts            # 单元测试配置（jsdom + Testing Library）
public/music/                # 上传的音频文件
data/blog.db                 # SQLite 数据库（已加入 .gitignore）
```

## 常用命令

```bash
npm run dev       # 开发模式（next dev --webpack）
npm run build     # 生产构建（next build --webpack）
npm run start     # 生产启动
npm run db:init   # 建表 + 索引 + 初始化数据（幂等）
npm run smoke     # 接口冒烟测试（需先启动 dev，共 23 项）
npm test          # 组件单元测试（Vitest + Testing Library）
```

> `better-sqlite3` 是原生模块，已在 `next.config.mjs` 中声明为 `serverExternalPackages`（交给 Node 直接加载、不参与打包）。当前开发环境下 Turbopack 复制外部模块时会生成不可用的 junction，因此 `dev` / `build` 显式使用 `--webpack`；在正常环境可自行去掉该参数。

## 实现说明

- **认证**：Better Auth 强制要求 email 字段，与「仅用户名注册」需求冲突，因此采用 bcrypt + jose JWT + HttpOnly Cookie 的轻量方案；`src/proxy.ts`（Next 16 Proxy，替代旧版 `middleware.ts`）校验 `role === 'admin'` 保护 `/admin`。
- **Next 16 约定**：`cookies()`、页面 `params` / `searchParams` 均为异步，统一 `await`；`proxy.ts` 只能导出 `proxy` 函数与 `config`，不做运行时裁剪。
- **Tailwind 4**：使用 CSS-first 配置，设计令牌集中在 `src/app/globals.css`（`@theme inline` + `@utility`），不再需要 `tailwind.config.ts`。
- **SQLite 访问**：`better-sqlite3` 为同步驱动，`src/db/index.ts` 用 `globalThis` 缓存连接避免开发热更新重复打开文件；时间戳比较请使用 Drizzle 的 `lt` / `gt`（会自动做 `Date → 秒` 转换），不要在 `sql` 模板里直接插 `Date`（驱动只接受 number / string / bigint / Buffer / null）。
- **MySQL → SQLite 字段映射**：`DATETIME` → `INTEGER`（Unix 秒）、`bigint` → `INTEGER`、`tinyint(1)` → `INTEGER`（0/1）、`decimal` → `REAL`、`enum` → `TEXT` + `CHECK`；主键保留原 id，关联表（`post_tags`、`comments.parent_id`）因此无需重算。
- **验证码**：`/api/auth/captcha` 返回随机 4 位字符的 SVG（含旋转、干扰线、噪点），答案经 HMAC 签名后写入 HttpOnly Cookie，登录时服务端校验并立即失效。
- **头像**：内置 4 款头像图片（`public/avatars/avatar-1.png` ~ `avatar-4.png`，标识 `avatar-1` ~ `avatar-4`），注册时默认分配第一款，个人中心可切换或上传自定义图片。
- **登录态同步**：登录态由 `GET /api/auth/session` 在客户端获取，顶部账号区与评论区不再依赖服务端 cookies；保存资料后用 `router.refresh()` 刷新服务端组件，退出登录仍是整页跳转。
- **评论安全**：服务端剥离 HTML 标签，前端以纯文本渲染（`whitespace-pre-wrap`），从根源避免 XSS。
- **自动播放**：先尝试有声播放，被浏览器策略拦截时降级为静音播放，并弹出「点击开启音乐」提示；用户首次点击后恢复音量。
- **数据一致性**：数据库层外键 + 应用层删除逻辑双保险。
- **封面焦点**：位置以 `"x% y%"` 字符串存储，前端直接用 `object-position` 渲染；文章自带封面时用文章自己的 `cover_position`，无封面时才回退站点默认封面的位置。
- **默认文案**：「关于这个站点」的默认内容定义在 `src/lib/utils.ts` 的 `DEFAULT_ABOUT_SITE`，数据库为空时前台用它兜底、后台输入框用它做占位提示（因此输入框默认是空的，无需手动清空）。
- **删除确认**：破坏性操作统一走 `src/components/confirm-dialog.tsx` 的 `ConfirmDialog`（遮罩点击 / Esc / 自动聚焦确认按钮，错误文案显示在弹层内），不再使用 `window.confirm` / `window.alert`；IDE 等内嵌浏览器弹出原生对话框时会直接崩溃。新增删除入口请复用该组件，勿回退到原生对话框。
- **缓存与无 Redis**：单实例个人博客，站点设置 / 分类标签 / 站点统计 / 文章列表 / 友链 / 音乐列表都走 `unstable_cache` + tag 失效；文章详情、关于我、友链是 `revalidate = 60` 的静态页，文章与友链的写操作分别用 `revalidatePath` 立即失效；首页与文章列表因视图偏好 Cookie / `searchParams` 保持动态；限流仍在进程内完成，无需 Redis。

## 性能约定

改动相关代码时请保持以下约束，它们对应实测有效的优化项：

- **请求内去重**：`getSettings` / `getSession` / `getPostBySlug` / 分类 / 标签 / 统计均用 `React.cache` 包裹，布局与页面各调一次也只查一次库。新增跨组件共用的查询请照此处理。
- **并行取数**：同一页面内互不依赖的查询走 `Promise.all`（如 `listPosts` 的列表与 `count()`）；阅读数不写进渲染路径，改由客户端 `POST /api/posts/[id]/view` 上报。
- **Cookie 常量必须放在服务端安全的模块**：从 `'use client'` 模块导入任何非组件导出，在 Server Component 中会变成 client reference 代理对象（`typeof 'object'`），`VIEW_COOKIE` / `PLAYER_POSITION_COOKIE` 因此放在 `src/lib/utils.ts`。
- **首屏偏好**：列表 / 九宫格视图仍用 Cookie + SSR 直出，避免先渲染默认值再跳变；播放器拖拽位置改由客户端读取 Cookie 恢复（服务端布局不再读 cookies，否则整条路由会退化为动态渲染）。
- **静态页面写后失效**：`/posts/[slug]`、`/about`、`/links` 为 `revalidate = 60` 的静态页，内容写操作必须调用 `revalidatePath`，否则最长滞后 60s 才更新。
- **缓存失效参数统一用 `{ expire: 0 }`**：后台写接口一律 `revalidateTag(tag, { expire: 0 })`，不要用 `'max'`。`'max'` 是 stale-while-revalidate，标签失效后仍会先返回旧数据，后台写完 `router.refresh()` 就会看到旧列表；`{ expire: 0 }` 让下一个请求阻塞式重校验、直接读到新数据。代价只落在写后的第一个请求，读取侧 60s TTL 与静态页 `revalidate` 均不受影响。
- **图片**：首屏 LCP 图用 `fetchPriority="high"`，首屏以下封面一律 `loading="lazy" decoding="async"`。
- **高频渲染**：播放器收起时不更新播放进度，阅读进度条直接写 `transform: scaleX()` 并用 `ResizeObserver` 代替逐帧测量。
- **格式化实例**：`Intl.DateTimeFormat` 在 `src/lib/utils.ts` 模块级共享，不要在渲染函数里新建。
- **拖拽交互**：拖动期间只在 `pointerdown` 量一次 `getBoundingClientRect()`，`pointermove` 里只做算术，避免每帧强制布局；拖动结束用 ref 提交最新坐标，不要读可能滞后一帧的 state。
- **连续输入触发的写请求要防抖**：站点设置里拖拽 / 方向键调整封面焦点会频繁触发 `onChange`，统一走 400ms 去抖再发 `PUT`，且不要在每次保存后调 `router.refresh()`；组件卸载时把未触发的保存立即补发。
- **条件渲染用三元**：`{cond ? <X /> : null}` 而非 `{cond && <X />}`，避免条件为假时把 `0` / 空字符串渲染进 DOM。
