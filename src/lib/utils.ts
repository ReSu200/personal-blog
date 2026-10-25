import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 首屏偏好用 Cookie 保存，服务端可直接读取并渲染初始状态，避免先渲染默认值再跳变。
// 这两个常量不能放在带 'use client' 的组件文件里：服务端导入后会变成 client reference 代理对象。
export const VIEW_COOKIE = 'blog_post_view';
export const PLAYER_POSITION_COOKIE = 'blog_player_pos';

// 「关于这个站点」的默认文案：后台留空时前台显示该内容，后台输入框也用它做占位提示
export const DEFAULT_ABOUT_SITE =
  '这是一个完全使用 AI手搓 搭建的个人博客，前台采用顶部导航与内容区布局，支持文章分类、标签筛选、评论审核与背景音乐播放。游客可以注册账号并在文章下方留言，管理员在后台完成内容与评论的管理。';

// Intl.DateTimeFormat 构造开销明显，列表页每次渲染会调用几十次，因此共享实例
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** 固定的时区格式化，避免服务端/客户端渲染不一致 */
export function formatDate(value: Date | string | null | undefined, withTime = false) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return (withTime ? dateTimeFormatter : dateFormatter).format(date).replace(/\//g, '-');
}

export function formatDuration(seconds: number | string | null | undefined) {
  if (seconds === null || seconds === undefined) return '--:--';
  const total = Math.floor(Number(seconds));
  if (!Number.isFinite(total) || total <= 0) return '--:--';
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 生成 URL 友好 slug，中文会保留（现代浏览器 URL 编码后仍可读） */
export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 标题锚点 id，与目录保持一致 */
export function headingId(text: string) {
  return slugify(text) || 'section';
}

export function stripHtml(input: string) {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function excerpt(markdown: string, length = 120) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

export function readingTime(markdown: string) {
  const plain = markdown.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, '');
  return Math.max(1, Math.round(plain.length / 400));
}
