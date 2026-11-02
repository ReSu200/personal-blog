import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { PostCard, PostGridCard } from '@/components/post-card';
import { ViewToggle } from '@/components/view-toggle';
import { cn } from '@/lib/utils';
import type { PostListItem } from '@/lib/queries';

type ViewMode = 'list' | 'grid';

/** 服务端组件：按 Cookie 里的视图偏好直接渲染卡片，客户端只保留切换按钮 */
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
  const mode: ViewMode = initialMode;

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

          <ViewToggle mode={mode} />
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState text="还没有发布文章，登录后台开始创作吧" />
      ) : (
        <div
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
