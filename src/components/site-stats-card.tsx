'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui';

const VISIT_KEY = 'blog_visit_tracked';

type Props = {
  posts: number;
  categories: number;
  visits: number;
};

export function SiteStatsCard({ posts, categories, visits }: Props) {
  const [visitCount, setVisitCount] = useState(visits);
  const tracked = useRef(false);

  // 页面访问后累加访问量，并用最新值替换服务端渲染的旧值
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    // 同一次会话只上报一次，避免站内跳转反复累加
    try {
      if (sessionStorage.getItem(VISIT_KEY) === '1') return;
      sessionStorage.setItem(VISIT_KEY, '1');
    } catch {
      // 会话存储不可用时退化为每次上报
    }

    fetch('/api/visit', { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.count === 'number') setVisitCount(data.count);
      })
      .catch(() => {});
  }, []);

  const items = [
    { label: '文章', value: posts },
    { label: '分类', value: categories },
    { label: '访问', value: visitCount },
  ];

  return (
    <Card className="px-5 py-4">
      <p className="eyebrow">Stats</p>
      <div className="mt-3 grid grid-cols-3 divide-x divide-border/70 text-center">
        {items.map((item) => (
          <div key={item.label} className="px-1">
            <p className="font-serif text-xl font-semibold tabular-nums text-primary">{item.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
