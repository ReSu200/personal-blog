'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, LayoutGrid, List } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { PostCard, PostGridCard } from '@/components/post-card';
import { cn, VIEW_COOKIE } from '@/lib/utils';
import type { PostListItem } from '@/lib/queries';

type ViewMode = 'list' | 'grid';

export function LatestPosts({
  posts,
  total,
  defaultCover,
  coverPosition,
  initialMode = 'list',
}: {
  posts: PostListItem[];
  total: number;
  defaultCover?: string | null;
  coverPosition?: string;
  initialMode?: ViewMode;
}) {
  // 初始值由服务端按 Cookie 渲染，避免先显示列表再跳到九宫格
  const [mode, setMode] = useState<ViewMode>(initialMode);

  function changeMode(next: ViewMode) {
    setMode(next);
    document.cookie = `${VIEW_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Latest</p>
          <h2 className="mt-1.5 font-serif text-2xl font-semibold">
            最新文章
            <span className="ml-2 align-middle text-xs font-normal tracking-normal text-muted-foreground">
              共 {total} 篇
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/posts"
            className="link-underline hidden items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary sm:inline-flex"
          >
            查看全部 <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <div
            role="group"
            aria-label="切换浏览模式"
            className="flex items-center gap-0.5 rounded-full border border-border/70 bg-card p-0.5"
          >
            <button
              type="button"
              onClick={() => changeMode('list')}
              aria-pressed={mode === 'list'}
              aria-label="列表视图"
              title="列表视图"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                mode === 'list'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeMode('grid')}
              aria-pressed={mode === 'grid'}
              aria-label="九宫格视图"
              title="九宫格视图"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                mode === 'grid'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState text="还没有发布文章，登录后台开始创作吧" />
      ) : (
        <div
          key={mode}
          className={cn(mode === 'grid' ? 'grid gap-5 sm:grid-cols-2 2xl:grid-cols-3' : 'space-y-4')}
        >
          {posts.map((post) =>
            mode === 'grid' ? (
              <PostGridCard
                key={post.id}
                post={post}
                defaultCover={defaultCover}
                coverPosition={coverPosition}
              />
            ) : (
              <PostCard
                key={post.id}
                post={post}
                defaultCover={defaultCover}
                coverPosition={coverPosition}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}
