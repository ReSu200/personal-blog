'use client';

import { useRouter } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';
import { cn, VIEW_COOKIE } from '@/lib/utils';

type ViewMode = 'list' | 'grid';

/**
 * 视图切换按钮：只把这一小块放进客户端。
 * 点击后写入 Cookie 再刷新服务端组件，文章卡片本身由服务端渲染，不参与水合。
 */
export function ViewToggle({ mode }: { mode: ViewMode }) {
  const router = useRouter();

  function changeMode(next: ViewMode) {
    if (next === mode) return;
    document.cookie = `${VIEW_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
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
          mode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
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
          mode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
