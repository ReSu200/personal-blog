'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 文章页的阅读辅助：顶部阅读进度条 + 右下角悬浮按钮（直达评论 / 回到顶部）。
 * 进度按正文元素的滚动区间计算，读到底部时正好 100%。
 */
export function ArticleProgress({ targetId = 'article-body' }: { targetId?: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    let start = 0;
    let length = 0;

    // 只在元素尺寸变化时测量，避免每帧读取布局触发回流
    const measure = () => {
      const target = document.getElementById(targetId);
      start = target ? target.getBoundingClientRect().top + window.scrollY - 120 : 0;
      length = target ? target.offsetHeight - window.innerHeight + 240 : 0;
    };

    const update = () => {
      frame = 0;
      const ratio = length > 0 ? (window.scrollY - start) / length : 0;
      const clamped = Math.min(1, Math.max(0, ratio));
      // 直接写 transform，绕开 React 渲染且只走合成层
      if (barRef.current) barRef.current.style.transform = `scaleX(${clamped})`;
      setVisible(window.scrollY > 320);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // 图片等异步内容会改变正文高度，用 ResizeObserver 代替逐帧测量
    const target = document.getElementById(targetId);
    const observer = target ? new ResizeObserver(measure) : null;
    if (target && observer) observer.observe(target);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [targetId]);

  const scrollToComments = () => {
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent" aria-hidden>
        <div ref={barRef} className="h-full origin-left scale-x-0 bg-primary transition-transform duration-150 ease-out" />
      </div>

      <div
        className={cn(
          'fixed bottom-6 right-5 z-40 hidden flex-col gap-2 transition-all duration-300 sm:flex',
          visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        <button
          type="button"
          onClick={scrollToComments}
          title="直达评论区"
          aria-label="直达评论区"
          className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-md backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="回到顶部"
          aria-label="回到顶部"
          className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-md backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
