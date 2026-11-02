'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// 播放器体积较大且不属于首屏关键内容，拆成独立 chunk 在客户端按需加载
const MusicPlayer = dynamic(
  () => import('@/components/music-player').then((mod) => ({ default: mod.MusicPlayer })),
  { ssr: false },
);

export function MusicPlayerLazy(props: ComponentProps<typeof MusicPlayer>) {
  return <MusicPlayer {...props} />;
}
