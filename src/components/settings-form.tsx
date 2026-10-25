'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Loader2, Music, Palette, RotateCcw, Save, Store, Upload, X } from 'lucide-react';
import { Button, Card, Input, Label, Textarea } from '@/components/ui';
import { SiteLogo } from '@/components/site-logo';
import { CoverPositionPreview } from '@/components/cover-position-preview';
import { DEFAULT_ABOUT_SITE } from '@/lib/utils';

type SettingsValues = {
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
  musicAutoplay: boolean;
  musicVolume: number;
};

type CoverKind = 'featured' | 'latest';

type CoverState = {
  url: string | null;
  position: string;
  loading: boolean;
  message: string;
  error: string;
};

const COVER_META: Record<CoverKind, { title: string; hint: string; empty: string }> = {
  featured: {
    title: '推荐位（首页大卡片）',
    hint: '帖子没有封面时，首页推荐位使用这张图',
    empty: '暂无推荐位封面',
  },
  latest: {
    title: '最新文章（列表与九宫格）',
    hint: '帖子没有封面时，首页最新文章与文章列表页使用这张图',
    empty: '暂无最新文章封面',
  },
};

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const MAX_HERO_SIZE = 4 * 1024 * 1024;
const MAX_COVER_SIZE = 4 * 1024 * 1024;

/** 统一的卡片小节标题：图标 + 标题 + 一句话说明 */
function SectionTitle({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoMessage, setLogoMessage] = useState('');
  const [logoError, setLogoError] = useState('');

  const heroInputRef = useRef<HTMLInputElement>(null);
  const [heroBackground, setHeroBackground] = useState(initial.heroBackground);
  const [heroPosition, setHeroPosition] = useState(initial.heroPosition);
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroMessage, setHeroMessage] = useState('');
  const [heroError, setHeroError] = useState('');

  const featuredInputRef = useRef<HTMLInputElement>(null);
  const latestInputRef = useRef<HTMLInputElement>(null);
  const [covers, setCovers] = useState<Record<CoverKind, CoverState>>({
    featured: {
      url: initial.featuredCover,
      position: initial.featuredCoverPosition,
      loading: false,
      message: '',
      error: '',
    },
    latest: {
      url: initial.latestCover,
      position: initial.latestCoverPosition,
      loading: false,
      message: '',
      error: '',
    },
  });

  const coverInputs: Record<CoverKind, React.RefObject<HTMLInputElement>> = {
    featured: featuredInputRef,
    latest: latestInputRef,
  };

  // 方向键每按一次都会触发 onChange，直接请求会打满接口，因此统一延迟提交
  const positionTimers = useRef<Record<string, number>>({});
  const pendingRequests = useRef<Record<string, () => Promise<void>>>({});
  useEffect(
    () => () => {
      // 卸载时把尚未触发的保存立即执行，避免刚拖完就切换页面导致位置丢失
      Object.entries(positionTimers.current).forEach(([key, timer]) => {
        window.clearTimeout(timer);
        void pendingRequests.current[key]?.();
      });
    },
    [],
  );

  function update<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: values.siteName,
          siteDescription: values.siteDescription,
          aboutSite: values.aboutSite,
          footerText: values.footerText,
          musicAutoplay: values.musicAutoplay,
          musicVolume: values.musicVolume,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '保存失败');
        return;
      }
      setMessage('保存成功');
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setLogoError('');
    setLogoMessage('');
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError('图片不能超过 2MB');
      return;
    }

    setLogoLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/logo', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setLogoError(data.error ?? '上传失败');
        return;
      }
      setLogoUrl(data.logoUrl);
      setLogoMessage('Logo 已更新，前台与后台同步生效');
      router.refresh();
    } catch {
      setLogoError('网络异常，请稍后再试');
    } finally {
      setLogoLoading(false);
    }
  }

  async function resetLogo() {
    setLogoError('');
    setLogoMessage('');
    setLogoLoading(true);
    try {
      const res = await fetch('/api/admin/logo', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setLogoError(data.error ?? '恢复失败');
        return;
      }
      setLogoUrl(null);
      setLogoMessage('已恢复默认 Logo');
      router.refresh();
    } catch {
      setLogoError('网络异常，请稍后再试');
    } finally {
      setLogoLoading(false);
    }
  }

  async function uploadHeroBackground(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setHeroError('');
    setHeroMessage('');
    if (file.size > MAX_HERO_SIZE) {
      setHeroError('背景图不能超过 4MB');
      return;
    }

    setHeroLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/site-image?kind=hero', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setHeroError(data.error ?? '上传失败');
        return;
      }
      setHeroBackground(data.url);
      setHeroMessage('首页背景板已更新，刷新前台即可看到效果');
      router.refresh();
    } catch {
      setHeroError('网络异常，请稍后再试');
    } finally {
      setHeroLoading(false);
    }
  }

  async function resetHeroBackground() {
    setHeroError('');
    setHeroMessage('');
    setHeroLoading(true);
    try {
      const res = await fetch('/api/admin/site-image?kind=hero', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setHeroError(data.error ?? '恢复失败');
        return;
      }
      setHeroBackground(null);
      setHeroPosition('50% 50%');
      setHeroMessage('已移除背景板，恢复默认欢迎区');
      router.refresh();
    } catch {
      setHeroError('网络异常，请稍后再试');
    } finally {
      setHeroLoading(false);
    }
  }

  /** 拖动或方向键调整位置：本地立即生效，接口按 key 去抖提交，避免连续请求与整页刷新 */
  function schedulePositionSave(key: string, request: () => Promise<void>) {
    window.clearTimeout(positionTimers.current[key]);
    pendingRequests.current[key] = request;
    positionTimers.current[key] = window.setTimeout(() => {
      delete pendingRequests.current[key];
      void request();
    }, 400);
  }

  function saveHeroPosition(next: { x: number; y: number }) {
    setHeroPosition(`${next.x}% ${next.y}%`);
    setHeroError('');
    setHeroMessage('');
    schedulePositionSave('hero', async () => {
      try {
        const res = await fetch('/api/admin/site-image?kind=hero', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        const data = await res.json();
        if (!res.ok) {
          setHeroError(data.error ?? '位置保存失败');
          return;
        }
        setHeroMessage('显示位置已保存，刷新前台即可看到效果');
      } catch {
        setHeroError('网络异常，请稍后再试');
      }
    });
  }

  function patchCover(kind: CoverKind, patch: Partial<CoverState>) {
    setCovers((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));
  }

  async function uploadCover(kind: CoverKind, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    patchCover(kind, { error: '', message: '' });
    if (file.size > MAX_COVER_SIZE) {
      patchCover(kind, { error: '封面图不能超过 4MB' });
      return;
    }

    patchCover(kind, { loading: true });
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/admin/site-image?kind=${kind}`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        patchCover(kind, { error: data.error ?? '上传失败' });
        return;
      }
      patchCover(kind, { url: data.url, message: '封面已更新，可拖动预览调整显示位置' });
      router.refresh();
    } catch {
      patchCover(kind, { error: '网络异常，请稍后再试' });
    } finally {
      patchCover(kind, { loading: false });
    }
  }

  async function resetCover(kind: CoverKind) {
    patchCover(kind, { error: '', message: '', loading: true });
    try {
      const res = await fetch(`/api/admin/site-image?kind=${kind}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        patchCover(kind, { error: data.error ?? '移除失败' });
        return;
      }
      patchCover(kind, { url: null, position: '50% 50%', message: '已移除，未设置封面的帖子恢复薄荷色背景' });
      router.refresh();
    } catch {
      patchCover(kind, { error: '网络异常，请稍后再试' });
    } finally {
      patchCover(kind, { loading: false });
    }
  }

  function saveCoverPosition(kind: CoverKind, next: { x: number; y: number }) {
    patchCover(kind, { position: `${next.x}% ${next.y}%`, error: '', message: '' });
    schedulePositionSave(`cover-${kind}`, async () => {
      try {
        const res = await fetch(`/api/admin/site-image?kind=${kind}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        const data = await res.json();
        if (!res.ok) {
          patchCover(kind, { error: data.error ?? '位置保存失败' });
          return;
        }
        patchCover(kind, { message: '显示位置已保存' });
      } catch {
        patchCover(kind, { error: '网络异常，请稍后再试' });
      }
    });
  }

  return (
    <div className="max-w-4xl space-y-5 pb-6">
      <Card className="divide-y divide-border/70">
        <section className="p-5 sm:p-6">
          <SectionTitle
            icon={<Store className="h-4 w-4" />}
            title="基本信息"
            desc="出现在浏览器标题、顶部导航、页脚与站点统计里"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="siteName">站点名称</Label>
              <Input
                id="siteName"
                value={values.siteName}
                onChange={(e) => update('siteName', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="siteDescription">个人描述</Label>
              <Textarea
                id="siteDescription"
                value={values.siteDescription}
                onChange={(e) => update('siteDescription', e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="一句话介绍自己，会显示在首页首屏、侧栏与页脚"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="aboutSite">关于这个站点</Label>
              <Textarea
                id="aboutSite"
                value={values.aboutSite}
                onChange={(e) => update('aboutSite', e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder={DEFAULT_ABOUT_SITE}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                留空则显示默认的介绍文案；修改后需点击底部「保存」生效
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="footerText">页脚版权文案</Label>
              <Input
                id="footerText"
                value={values.footerText}
                onChange={(e) => update('footerText', e.target.value)}
                maxLength={300}
                placeholder="© 年份 站点名称 · 湘ICP备000000号"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                支持占位符 {'{year}'}、{'{site}'}、{'{author}'}，例如：© {'{year}'} {'{author}'} · 湘ICP备xxxxxxxx号
              </p>
            </div>
          </div>
        </section>

        <section className="p-5 sm:p-6">
          <SectionTitle
            icon={<Palette className="h-4 w-4" />}
            title="品牌与背景"
            desc="网站 Logo 与首页背景板，上传后立即生效"
          />

          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-4">
              <SiteLogo
                name={values.siteName || '博客'}
                logoUrl={logoUrl}
                className="h-14 w-14 rounded-2xl text-xl"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoLoading}
                >
                  {logoLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  上传 Logo
                </Button>
                {logoUrl && (
                  <Button variant="ghost" size="sm" onClick={resetLogo} disabled={logoLoading}>
                    <RotateCcw className="h-4 w-4" /> 恢复默认
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              PNG / JPG / WEBP / GIF，2MB 以内；未上传时显示站点名称首字
            </p>
            {logoMessage && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{logoMessage}</p>
            )}
            {logoError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{logoError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={uploadLogo}
            />
          </div>

          <div className="mt-5 border-t border-border/70 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">首页背景板</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  同时用于首页首屏、首页右侧作者卡片顶部与「关于我」顶部横幅
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => heroInputRef.current?.click()}
                  disabled={heroLoading}
                >
                  {heroLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  上传图片
                </Button>
                {heroBackground && (
                  <Button variant="ghost" size="sm" onClick={resetHeroBackground} disabled={heroLoading}>
                    <X className="h-4 w-4" /> 移除
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3">
              {heroBackground ? (
                <CoverPositionPreview image={heroBackground} position={heroPosition} onChange={saveHeroPosition} />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-muted">
                  <div className="flex aspect-[16/7] items-center justify-center text-xs text-muted-foreground">
                    暂无背景板图片，未设置时显示薄荷色渐变背景
                  </div>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              PNG / JPG / WEBP / GIF，4MB 以内；建议使用横向宽图（如 1920×900）。上传后可拖动图片调整显示位置，也可用方向键微调
            </p>
            {heroMessage ? (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{heroMessage}</p>
            ) : null}
            {heroError ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{heroError}</p>
            ) : null}
            <input
              ref={heroInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={uploadHeroBackground}
            />
          </div>
        </section>

        <section className="p-5 sm:p-6">
          <SectionTitle
            icon={<ImageIcon className="h-4 w-4" />}
            title="帖子默认封面"
            desc="按首页的两个区域分别设置；帖子自己填了封面时，以帖子封面为准"
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(['featured', 'latest'] as const).map((kind) => {
              const meta = COVER_META[kind];
              const state = covers[kind];

              return (
                <div key={kind} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{meta.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {meta.hint}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => coverInputs[kind].current?.click()}
                        disabled={state.loading}
                      >
                        {state.loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        上传
                      </Button>
                      {state.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetCover(kind)}
                          disabled={state.loading}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {state.url ? (
                    <div className="mt-3">
                      <CoverPositionPreview
                        image={state.url}
                        position={state.position}
                        onChange={(next) => saveCoverPosition(kind, next)}
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        按住图片拖动可调整裁切焦点，也可聚焦后用方向键微调
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 flex aspect-[16/10] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/60 text-xs text-muted-foreground">
                      {meta.empty}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">
                    PNG / JPG / WEBP / GIF，4MB 以内；建议 16:10 横图（如 1200×750）
                  </p>

                  {state.message && (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                      {state.message}
                    </p>
                  )}
                  {state.error && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
                  )}

                  <input
                    ref={coverInputs[kind]}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => uploadCover(kind, event)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="p-5 sm:p-6">
          <SectionTitle
            icon={<Music className="h-4 w-4" />}
            title="音乐播放"
            desc="左下角播放器的默认行为，修改后需点击下方保存"
          />
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                进入页面自动播放
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  浏览器可能拦截有声自动播放，此时会静音播放并提示用户开启
                </span>
              </span>
              <input
                type="checkbox"
                checked={values.musicAutoplay}
                onChange={(e) => update('musicAutoplay', e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
            </label>

            <div>
              <Label htmlFor="musicVolume">默认音量：{Math.round(values.musicVolume * 100)}%</Label>
              <input
                id="musicVolume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={values.musicVolume}
                onChange={(e) => update('musicVolume', Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[hsl(var(--primary))]"
              />
            </div>
          </div>
        </section>
      </Card>

      <div className="sticky bottom-4 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/85 px-4 py-3 shadow-lg backdrop-blur">
          <div className="min-w-0">
            <p className="text-sm font-medium">保存更改</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              仅保存站点名称、描述与音乐设置；Logo、背景板和封面在上传时已即时生效
            </p>
            {message && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{message}</p>}
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <Button onClick={save} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
