'use client';

import { useEffect } from 'react';

/**
 * 进入通知页后把当前用户的通知全部标记为已读，并广播事件让顶栏红点立即清零。
 * 顶栏只在路由变化时拉取未读数，没有这个事件红点会一直留到下次导航。
 */
export function MarkNotificationsRead() {
  useEffect(() => {
    let alive = true;
    fetch('/api/account/comment-notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
      keepalive: true,
    })
      .then((res) => {
        if (res.ok && alive) window.dispatchEvent(new Event('notifications:read'));
      })
      .catch(() => {
        // 标记失败不影响浏览，下次进入会重试
      });
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
