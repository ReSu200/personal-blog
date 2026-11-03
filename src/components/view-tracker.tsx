'use client';

import { useEffect } from 'react';

// 同一篇文章在极短时间内重复挂载（如 dev 严格模式）只上报一次，避免阅读数翻倍
let lastPostId = -1;
let lastReportedAt = 0;
const DEDUPE_MS = 1000;

/** 文章页挂载后上报一次阅读，避免把写库留在服务端渲染路径上 */
export function ViewTracker({ postId }: { postId: number }) {
  useEffect(() => {
    const now = Date.now();
    if (postId === lastPostId && now - lastReportedAt < DEDUPE_MS) return;
    lastPostId = postId;
    lastReportedAt = now;

    fetch(`/api/posts/${postId}/view`, { method: 'POST', keepalive: true }).catch(() => {
      // 统计失败不影响阅读，静默忽略
    });
  }, [postId]);

  return null;
}
