/**
 * 接口级冒烟测试：认证（含验证码）、个人中心、评论审核、文章 CRUD、音乐配置
 * 前置：npm run dev 已启动（默认 3000 端口，可用 BASE_URL 覆盖）
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];

function pass(name, extra = '') {
  results.push({ name, ok: true, extra });
  console.log(`✅ ${name}${extra ? ` — ${extra}` : ''}`);
}

function fail(name, extra = '') {
  results.push({ name, ok: false, extra });
  console.log(`❌ ${name}${extra ? ` — ${extra}` : ''}`);
}

class Client {
  constructor() {
    this.cookie = '';
  }

  async request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });

    const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    if (setCookies.length > 0) {
      this.cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, text, json, location: res.headers.get('location') };
  }

  async captcha() {
    const res = await fetch(`${BASE}/api/auth/captcha`, {
      headers: { ...(this.cookie ? { Cookie: this.cookie } : {}) },
      cache: 'no-store',
    });
    const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    if (setCookies.length > 0) {
      const merged = new Map();
      for (const raw of [...this.cookie.split('; ').filter(Boolean), ...setCookies.map((c) => c.split(';')[0])]) {
        const [key, ...rest] = raw.split('=');
        merged.set(key, rest.join('='));
      }
      this.cookie = Array.from(merged.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    }
    const svg = await res.text();
    return [...svg.matchAll(/<text[^>]*>([^<])<\/text>/g)].map((m) => m[1]).join('');
  }

  async login(username, password, overrideCode) {
    const code = overrideCode ?? (await this.captcha());
    return this.request('/api/auth/login', { method: 'POST', body: { username, password, captcha: code } });
  }
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
});

let testUsername = '';

try {
  console.log(`\n=== 冒烟测试 ${BASE} ===\n`);

  // 1. 管理员登录（带验证码）
  const admin = new Client();
  const login = await admin.login('admin', 'admin123');
  if (login.status === 200 && login.json?.user?.role === 'admin') pass('管理员登录（含验证码）');
  else fail('管理员登录（含验证码）', `status=${login.status} ${login.text.slice(0, 100)}`);

  // 2. 验证码缺失应被拒绝
  const noCaptcha = new Client();
  const noCaptchaRes = await noCaptcha.request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' },
  });
  if (noCaptchaRes.status === 400) pass('缺少验证码被拒绝');
  else fail('缺少验证码被拒绝', `status=${noCaptchaRes.status}`);

  // 3. 验证码错误应被拒绝
  const wrongCaptcha = new Client();
  const wrongCaptchaRes = await wrongCaptcha.login('admin', 'admin123', 'ZZZZ');
  if (wrongCaptchaRes.status === 400 && wrongCaptchaRes.json?.error?.includes('验证码')) {
    pass('验证码错误被拒绝');
  } else {
    fail('验证码错误被拒绝', `status=${wrongCaptchaRes.status}`);
  }

  // 4. 后台页面访问
  const adminPage = await admin.request('/admin');
  if (adminPage.status === 200) pass('管理员访问 /admin');
  else fail('管理员访问 /admin', `status=${adminPage.status}`);

  // 5. 未登录访问后台应被拦截
  const guest = new Client();
  const guestAdmin = await guest.request('/admin');
  if (guestAdmin.status === 307 && guestAdmin.location?.includes('/login')) pass('未登录访问 /admin 被拦截');
  else fail('未登录访问 /admin 被拦截', `status=${guestAdmin.status}`);

  // 6. 注册：两次密码不一致
  const mismatchClient = new Client();
  const mismatch = await mismatchClient.request('/api/auth/register', {
    method: 'POST',
    body: { username: `mm${Date.now().toString().slice(-6)}`, password: '123456', confirmPassword: '654321' },
  });
  if (mismatch.status === 400 && mismatch.json?.error?.includes('不一致')) pass('注册两次密码不一致被拒绝');
  else fail('注册两次密码不一致被拒绝', `status=${mismatch.status}`);

  // 7. 注册普通用户（带确认密码）
  const normal = new Client();
  const username = `tester${Date.now().toString().slice(-6)}`;
  testUsername = username;
  const reg = await normal.request('/api/auth/register', {
    method: 'POST',
    body: { username, password: '123456', confirmPassword: '123456' },
  });
  if (reg.status === 200 && reg.json?.ok) pass('注册普通用户（确认密码）', username);
  else fail('注册普通用户（确认密码）', `status=${reg.status} ${reg.text.slice(0, 120)}`);

  // 8. 新用户默认获得第一款内置头像
  const [regRows] = await conn.query('SELECT display_name, avatar_url FROM users WHERE username = ?', [username]);
  if (regRows[0]?.avatar_url === 'avatar-1' && regRows[0]?.display_name) {
    pass('新用户默认头像与昵称', `${regRows[0].avatar_url} / ${regRows[0].display_name}`);
  } else {
    fail('新用户默认头像与昵称', JSON.stringify(regRows[0]));
  }

  // 9. 个人中心：修改昵称与头像
  const profileUpdate = await normal.request('/api/account', {
    method: 'PUT',
    body: { displayName: '测试小鱼', avatar: 'avatar-3' },
  });
  const [profileRows] = await conn.query('SELECT display_name, avatar_url FROM users WHERE username = ?', [username]);
  if (
    profileUpdate.status === 200 &&
    profileRows[0]?.display_name === '测试小鱼' &&
    profileRows[0]?.avatar_url === 'avatar-3'
  ) {
    pass('个人中心修改昵称与头像');
  } else {
    fail('个人中心修改昵称与头像', `status=${profileUpdate.status} ${JSON.stringify(profileRows[0])}`);
  }

  // 10. 个人中心：修改密码（错误当前密码应失败）
  const wrongPasswordChange = await normal.request('/api/account', {
    method: 'PUT',
    body: { currentPassword: 'wrong-pass', newPassword: 'newpass123' },
  });
  if (wrongPasswordChange.status === 400) pass('修改密码时校验当前密码');
  else fail('修改密码时校验当前密码', `status=${wrongPasswordChange.status}`);

  // 11. 个人中心：修改密码成功后用新密码登录
  const passwordChange = await normal.request('/api/account', {
    method: 'PUT',
    body: { currentPassword: '123456', newPassword: 'newpass123' },
  });
  const relogin = new Client();
  const newLogin = await relogin.login(username, 'newpass123');
  if (passwordChange.status === 200 && newLogin.status === 200) pass('修改密码后用新密码登录');
  else fail('修改密码后用新密码登录', `change=${passwordChange.status} login=${newLogin.status}`);

  // 12. 普通用户发表评论（含 XSS 载荷）
  const payload = '<script>alert(1)</script>冒烟测试评论';
  const commentRes = await normal.request('/api/comments', {
    method: 'POST',
    body: { postId: 1, content: payload },
  });
  if (commentRes.status === 200) pass('普通用户提交评论', '待审核');
  else fail('普通用户提交评论', `status=${commentRes.status} ${commentRes.text.slice(0, 120)}`);

  // 13. 未登录不能评论
  const guestComment = await guest.request('/api/comments', {
    method: 'POST',
    body: { postId: 1, content: '未登录评论' },
  });
  if (guestComment.status === 401) pass('未登录评论被拒绝');
  else fail('未登录评论被拒绝', `status=${guestComment.status}`);

  // 14. 评论入库状态与内容过滤
  const [commentRows] = await conn.query(
    'SELECT id, content, status FROM comments WHERE content LIKE ? ORDER BY id DESC LIMIT 1',
    ['%冒烟测试评论%'],
  );
  const comment = commentRows[0];
  if (comment && comment.status === 'pending') pass('评论状态为待审核');
  else fail('评论状态为待审核', JSON.stringify(comment));

  if (comment && !comment.content.includes('<script>')) pass('评论 HTML 标签已过滤');
  else fail('评论 HTML 标签已过滤', comment?.content);

  // 15. 管理员审核通过
  const approve = await admin.request(`/api/admin/comments/${comment.id}`, {
    method: 'PATCH',
    body: { status: 'approved' },
  });
  if (approve.status === 200) pass('管理员审核评论');
  else fail('管理员审核评论', `status=${approve.status}`);

  // 16. 前台详情页展示审核通过的评论（显示昵称，且不执行脚本）
  const detail = await guest.request('/posts/build-blog-with-nextjs-14');
  const hasComment = detail.text.includes('冒烟测试评论');
  const hasScript = detail.text.includes('<script>alert(1)</script>');
  const hasNickname = detail.text.includes('测试小鱼');
  if (detail.status === 200 && hasComment && !hasScript && hasNickname) {
    pass('详情页展示评论与昵称且无脚本注入');
  } else {
    fail('详情页展示评论与昵称且无脚本注入', `comment=${hasComment} nick=${hasNickname} script=${hasScript}`);
  }

  // 17. 管理员创建文章
  const createPost = await admin.request('/api/admin/posts', {
    method: 'POST',
    body: {
      title: '冒烟测试文章',
      content: '## 测试标题\n\n这是一篇用于验证接口的文章。',
      summary: '冒烟测试摘要',
      status: 'published',
      isPinned: true,
      tags: '测试,自动化',
      categoryId: null,
    },
  });
  const createdSlug = createPost.json?.slug;
  if (createPost.status === 200 && createdSlug) pass('管理员创建文章', createdSlug);
  else fail('管理员创建文章', `status=${createPost.status} ${createPost.text.slice(0, 120)}`);

  // 18. 置顶文章出现在首页
  const home = await guest.request('/');
  if (home.status === 200 && home.text.includes('冒烟测试文章')) pass('首页展示新文章');
  else fail('首页展示新文章');

  // 19. 删除文章
  const deletePost = await admin.request(`/api/admin/posts/${createPost.json?.id}`, { method: 'DELETE' });
  if (deletePost.status === 200) pass('管理员删除文章');
  else fail('管理员删除文章', `status=${deletePost.status}`);

  // 20. 音乐配置接口
  const music = await guest.request('/api/music');
  if (music.status === 200 && Array.isArray(music.json?.songs) && music.json.songs.length >= 1) {
    pass('音乐接口返回播放列表', `${music.json.songs.length} 首，自动播放=${music.json.autoplay}`);
  } else {
    fail('音乐接口返回播放列表', `status=${music.status}`);
  }

  // 21. 非管理员调用后台接口应被拒绝
  const forbidden = await normal.request('/api/admin/posts', {
    method: 'POST',
    body: { title: 'x', content: 'x', status: 'draft' },
  });
  if (forbidden.status === 403) pass('普通用户调用后台接口被拒绝');
  else fail('普通用户调用后台接口被拒绝', `status=${forbidden.status}`);

  // 22. 退出登录后后台不可访问
  const logoutRes = await admin.request('/api/auth/logout', { method: 'POST' });
  const afterLogout = await admin.request('/admin');
  if (logoutRes.status === 200 && afterLogout.status === 307) pass('退出登录后会话失效');
  else fail('退出登录后会话失效', `logout=${logoutRes.status} admin=${afterLogout.status}`);

  // 23. RSS
  const rss = await guest.request('/rss.xml');
  if (rss.status === 200 && rss.text.includes('<rss')) pass('RSS 输出正常');
  else fail('RSS 输出正常', `status=${rss.status}`);

  // 清理测试评论
  if (comment) await conn.query('DELETE FROM comments WHERE id = ?', [comment.id]);
} catch (error) {
  console.error('\n测试执行异常：', error);
} finally {
  // 清理本次注册的测试账号（评论会随外键级联删除），保证脚本可重复执行不留垃圾数据
  if (testUsername) {
    try {
      await conn.query('DELETE FROM users WHERE username = ?', [testUsername]);
    } catch (cleanupError) {
      console.error('清理测试账号失败：', cleanupError.message);
    }
  }
  await conn.end();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== 结果：${results.length - failed.length}/${results.length} 通过 ===`);
  process.exit(failed.length === 0 ? 0 : 1);
}
