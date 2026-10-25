'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronDown, Eye, ImagePlus, Loader2, Save, Search, Send, Trash2, X } from 'lucide-react';
import { Button, Card, Input, Label, Textarea } from '@/components/ui';
import { Markdown } from '@/components/markdown';
import { CoverPositionPreview } from '@/components/cover-position-preview';

type Category = { id: number; name: string };
type Tag = { id: number; name: string };

const MAX_COVER_SIZE = 4 * 1024 * 1024;
const DEFAULT_COVER_POSITION = '50% 50%';

export type EditorPost = {
  id?: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  coverImage: string | null;
  coverPosition?: string | null;
  categoryId: number | null;
  status: 'draft' | 'published';
  isPinned: number;
  publishedAt: string | Date | null;
  tagNames: string;
};

function toLocalInput(value: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function PostEditor({
  post,
  categories,
  tags: allTags,
}: {
  post?: EditorPost;
  categories: Category[];
  tags: Tag[];
}) {
  const router = useRouter();
  const isEdit = Boolean(post?.id);

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [summary, setSummary] = useState(post?.summary ?? '');
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');
  const [coverPosition, setCoverPosition] = useState(post?.coverPosition || DEFAULT_COVER_POSITION);
  const [categoryId, setCategoryId] = useState(post?.categoryId ? String(post.categoryId) : '');
  const [tags, setTags] = useState<string[]>(
    (post?.tagNames ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  );
  const [tagOpen, setTagOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const tagBoxRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const [bodyUploading, setBodyUploading] = useState(false);
  const [bodyImageError, setBodyImageError] = useState('');
  // 光标位置持续跟随编辑区（切换预览/点击按钮都会让 textarea 失焦，只靠按钮点击时读取会丢位置）
  const bodyCaretRef = useRef<{ start: number; end: number } | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status ?? 'draft');
  const [isPinned, setIsPinned] = useState(post?.isPinned === 1);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(post?.publishedAt ?? null));
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tagOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!tagBoxRef.current?.contains(event.target as Node)) setTagOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [tagOpen]);

  function toggleTag(name: string) {
    setTags((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  }

  async function uploadCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCoverError('');
    if (file.size > MAX_COVER_SIZE) {
      setCoverError('封面图不能超过 4MB');
      return;
    }

    setCoverLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setCoverError(data.error ?? '上传失败');
        return;
      }
      setCoverImage(data.url);
    } catch {
      setCoverError('网络异常，请稍后再试');
    } finally {
      setCoverLoading(false);
    }
  }

  /** 同步编辑区当前的光标位置 */
  function trackCaret() {
    const textarea = bodyRef.current;
    if (!textarea) return;
    bodyCaretRef.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
  }

  /** 在光标处插入 Markdown 图片语法，光标停在插入内容的末尾 */
  function insertImage(url: string) {
    const textarea = bodyRef.current;
    const cursor = bodyCaretRef.current;
    // 以上传完成时的真实内容为准，避免异步等待期间闭包里的 content 过期
    const current = textarea?.value ?? content;
    // 从未在正文里定位过光标时，才退化为追加到末尾
    const base = cursor ? Math.min(cursor.start, current.length) : current.length;
    const end = cursor ? Math.min(cursor.end, current.length) : base;
    const atLineStart = base === 0 || current.slice(0, base).endsWith('\n');
    const prefix = atLineStart ? '' : '\n';
    const alt = '图片说明';
    const markdown = `${prefix}![${alt}](${url})`;
    const next = current.slice(0, base) + markdown + current.slice(end);
    const caret = base + markdown.length;

    setContent(next);
    bodyCaretRef.current = { start: caret, end: caret };
    // 在预览模式下插入也能立刻看到结果
    setTab('edit');

    // 等 React 把新内容写进 DOM 后再恢复焦点；双 rAF 确保值已提交，浏览器才能按光标滚到正确位置
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = bodyRef.current;
        if (!el) return;
        // 先把编辑区整体滚入视口，再由 focus + 选区让浏览器把光标滚进 textarea 内部可视野
        el.scrollIntoView({ block: 'center' });
        // 先设选区再聚焦，聚焦时浏览器会以当前光标位置为准滚动；聚焦后再设一次，兼容被重置的情况
        el.setSelectionRange(caret, caret);
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    });
  }

  async function uploadBodyImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBodyImageError('');
    if (file.size > MAX_COVER_SIZE) {
      setBodyImageError('图片不能超过 4MB');
      return;
    }

    setBodyUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setBodyImageError(data.error ?? '上传失败');
        return;
      }
      insertImage(data.url);
    } catch {
      setBodyImageError('网络异常，请稍后再试');
    } finally {
      setBodyUploading(false);
    }
  }

  async function save(nextStatus: 'draft' | 'published') {
    setError('');
    if (!title.trim()) {
      setError('请填写标题');
      return;
    }
    if (!content.trim()) {
      setError('请填写正文');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        slug: slug || undefined,
        content,
        summary: summary || null,
        coverImage: coverImage || null,
        coverPosition,
        categoryId: categoryId ? Number(categoryId) : null,
        status: nextStatus,
        isPinned,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        tags: tags.join(','),
      };

      const res = await fetch(isEdit ? `/api/admin/posts/${post!.id}` : '/api/admin/posts', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '保存失败');
        return;
      }
      router.push('/admin/posts');
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!isEdit) return;
    if (!window.confirm('确定要删除这篇文章吗？该操作不可恢复。')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/posts/${post!.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '删除失败');
        return;
      }
      router.push('/admin/posts');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{isEdit ? '编辑文章' : '写新文章'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">支持 Markdown 语法，可实时预览</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/posts">
            <Button variant="ghost" size="sm">
              返回列表
            </Button>
          </Link>
          {isEdit && (
            <Button variant="danger" size="sm" onClick={remove} disabled={loading}>
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => save('draft')} disabled={loading}>
            <Save className="h-3.5 w-3.5" /> 保存草稿
          </Button>
          <Button size="sm" onClick={() => save('published')} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {status === 'published' ? '更新发布' : '发布'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Card className="p-5">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给文章起一个标题"
            />
            <div className="mt-4">
              <Label htmlFor="slug">Slug（可选，留空自动生成）</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly-slug"
              />
            </div>
            <div className="mt-4">
              <Label htmlFor="summary">摘要（可选）</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="展示在文章列表卡片中"
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <span className="text-sm font-medium">正文（Markdown）</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    trackCaret();
                    bodyInputRef.current?.click();
                  }}
                  disabled={bodyUploading}
                >
                  {bodyUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  插入图片
                </Button>
                <div className="flex rounded-lg border border-border p-0.5">
                  <button
                    onClick={() => setTab('edit')}
                    className={`rounded-md px-3 py-1 text-xs transition-colors ${
                      tab === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setTab('preview')}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs transition-colors ${
                      tab === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <Eye className="h-3 w-3" /> 预览
                  </button>
                </div>
              </div>
            </div>

            {bodyImageError ? (
              <p className="border-b border-border bg-red-500/10 px-4 py-2 text-xs text-red-600 dark:text-red-400">
                {bodyImageError}
              </p>
            ) : null}

            {tab === 'edit' ? (
              <textarea
                ref={bodyRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  trackCaret();
                }}
                onSelect={trackCaret}
                onClick={trackCaret}
                onKeyUp={trackCaret}
                placeholder={'## 二级标题\n\n开始写作吧，支持 **加粗**、`代码`、列表与表格…'}
                className="min-h-[460px] w-full resize-y bg-card px-4 py-4 font-mono text-sm leading-relaxed outline-none"
              />
            ) : (
              <div className="min-h-[460px] px-5 py-4">
                {content ? <Markdown content={content} /> : <p className="text-sm text-muted-foreground">还没有内容</p>}
              </div>
            )}
            <input
              ref={bodyInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={uploadBodyImage}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold">发布设置</p>

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="status">状态</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary/60"
                >
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                </select>
              </div>

              <div>
                <Label htmlFor="category">分类</Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary/60"
                >
                  <option value="">未分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={tagBoxRef} className="relative">
                <Label>标签（可多选）</Label>
                <button
                  type="button"
                  onClick={() => setTagOpen((prev) => !prev)}
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm outline-none transition-colors focus:border-primary/60"
                >
                  <span className={tags.length ? 'text-foreground' : 'text-muted-foreground'}>
                    {tags.length ? `已选 ${tags.length} 个标签` : '从分类与标签中选择'}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      tagOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {tagOpen && (
                  <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        placeholder="搜索标签"
                        className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1">
                      {allTags.length === 0 && (
                        <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                          还没有标签，可先在「分类与标签」中创建
                        </p>
                      )}
                      {allTags
                        .filter((tag) =>
                          tag.name.toLowerCase().includes(tagQuery.trim().toLowerCase()),
                        )
                        .map((tag) => {
                          const active = tags.includes(tag.name);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.name)}
                              className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                                active ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                              }`}
                            >
                              <span>#{tag.name}</span>
                              {active && <Check className="h-3.5 w-3.5" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                      >
                        #{name}
                        <button
                          type="button"
                          onClick={() => toggleTag(name)}
                          aria-label={`移除标签 ${name}`}
                          className="text-primary/70 transition-colors hover:text-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="publishedAt">发布时间（可选）</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                置顶这篇文章
              </label>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <Label>封面图（可选）</Label>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverLoading}
                >
                  {coverLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  {coverImage ? '更换' : '上传'}
                </Button>
                {coverImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCoverImage('');
                      setCoverPosition(DEFAULT_COVER_POSITION);
                    }}
                    disabled={coverLoading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              不上传则使用「站点设置」中的默认封面（推荐位与最新文章各有一张）；上传后以此处为准。拖动图片可调整显示位置，也可用方向键微调
            </p>
            {coverImage ? (
              <CoverPositionPreview
                image={coverImage}
                position={coverPosition}
                onChange={({ x, y }) => setCoverPosition(`${x}% ${y}%`)}
                className="mt-3"
              />
            ) : null}
            {coverError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{coverError}</p>}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={uploadCover}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
