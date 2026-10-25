'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ChevronDown,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { cn, formatDuration, PLAYER_POSITION_COOKIE } from '@/lib/utils';

type Song = {
  id: number;
  title: string;
  artist: string | null;
  filePath: string;
  coverUrl: string | null;
  duration: string | null;
  isDefault: number;
};

type Props = {
  songs: Song[];
  autoplay: boolean;
  volume: number;
  initialPosition: { left: number; top: number } | null;
};

const EXPANDED_WIDTH = 288;
const EXPANDED_HEIGHT = 340;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function MusicPlayer({ songs, autoplay, volume: initialVolume, initialPosition }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
  } | null>(null);
  const lastPositionRef = useRef<{ left: number; top: number } | null>(null);
  const skipClickRef = useRef(false);
  const expandedRef = useRef(false);
  // 位置来自服务端读取的 Cookie，首屏即为最终位置，不会先出现在默认角落再跳走
  const [position, setPosition] = useState<{ left: number; top: number } | null>(initialPosition);
  const [index, setIndex] = useState(() => {
    const defaultIndex = songs.findIndex((song) => song.isDefault === 1);
    return defaultIndex >= 0 ? defaultIndex : 0;
  });
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(() =>
    Number.isFinite(initialVolume) ? Math.min(1, Math.max(0, initialVolume)) : 0.5,
  );
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const current = songs[index];
  const hasSongs = songs.length > 0;

  // 上次手动调过的音量优先于站点默认值
  useEffect(() => {
    const stored = Number(localStorage.getItem('blog_volume'));
    if (Number.isFinite(stored) && stored > 0) setVolume(Math.min(1, Math.max(0, stored)));
  }, []);

  // 收起状态下进度条不可见，不必为它持续重渲染
  useEffect(() => {
    expandedRef.current = expanded;
    if (!expanded) return;
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  }, [expanded]);

  // 窗口尺寸变化时保证按钮仍在可视区（首屏也校正一次，防止换了更小的屏幕）
  useEffect(() => {
    function clampToViewport() {
      setPosition((prev) => {
        if (!prev) return prev;
        const next = {
          left: clamp(prev.left, 8, window.innerWidth - 56),
          top: clamp(prev.top, 8, window.innerHeight - 56),
        };
        lastPositionRef.current = next;
        return next;
      });
    }
    clampToViewport();
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, []);

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    skipClickRef.current = false;
    const box = playerRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 某些环境下指针已失效，忽略即可，拖拽逻辑仍可继续
    }
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    // 小于阈值视为点击，避免轻微抖动误触发拖拽
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;

    const rect = playerRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 48;
    const height = rect?.height ?? 48;
    const next = {
      left: clamp(drag.originLeft + dx, 8, window.innerWidth - width - 8),
      top: clamp(drag.originTop + dy, 8, window.innerHeight - height - 8),
    };
    lastPositionRef.current = next;
    setPosition(next);
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const saved = lastPositionRef.current;
    if (drag.moved && saved) {
      skipClickRef.current = true;
      // 存 Cookie 而非 localStorage，服务端下次即可直接渲染到该位置
      document.cookie = `${PLAYER_POSITION_COOKIE}=${Math.round(saved.left)}-${Math.round(saved.top)};path=/;max-age=31536000;samesite=lax`;
    }
  }

  function openPlayer() {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    // 展开后的面板更宽，先把按钮拉回可视区，避免面板溢出屏幕
    if (position) {
      setPosition((prev) =>
        prev
          ? {
              left: clamp(prev.left, 8, window.innerWidth - EXPANDED_WIDTH - 8),
              top: clamp(prev.top, 8, window.innerHeight - EXPANDED_HEIGHT - 8),
            }
          : prev,
      );
    }
    setExpanded(true);
  }

  const tryPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      // 浏览器拦截了有声自动播放，降级为静音播放并提示用户
      try {
        audio.muted = true;
        setMuted(true);
        await audio.play();
        setPlaying(true);
        setShowHint(true);
      } catch {
        setPlaying(false);
      }
    }
  }, []);

  // 切换歌曲 / 首次加载后尝试播放
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.volume = volume;
    audio.muted = muted;
    audio.src = current.filePath;
    audio.load();
    setCurrentTime(0);
    setDuration(Number(current.duration ?? 0));
    if (!autoplay) return;
    if (localStorage.getItem('blog_paused') === '1') return;
    const timer = window.setTimeout(() => {
      void tryPlay();
    }, 120);
    return () => window.clearTimeout(timer);
    // songs 由服务端直出，仅依赖 index 才能避免路由刷新时打断正在播放的音频
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, autoplay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    // 静音自动播放状态下，点击播放优先恢复声音
    if (muted) {
      audio.muted = false;
      setMuted(false);
      setShowHint(false);
      localStorage.setItem('blog_paused', '0');
      if (!audio.paused) {
        setPlaying(true);
        return;
      }
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      localStorage.setItem('blog_paused', '1');
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
      localStorage.setItem('blog_paused', '0');
    } catch {
      setPlaying(false);
    }
  }

  function changeSong(nextIndex: number) {
    if (songs.length === 0) return;
    const normalized = (nextIndex + songs.length) % songs.length;
    setIndex(normalized);
    localStorage.setItem('blog_paused', '0');
    setMuted(false);
    setShowHint(false);
  }

  function changeVolume(nextVolume: number) {
    setVolume(nextVolume);
    localStorage.setItem('blog_volume', String(nextVolume));
    if (nextVolume > 0 && muted) {
      const audio = audioRef.current;
      if (audio) audio.muted = false;
      setMuted(false);
      setShowHint(false);
    }
  }

  function seek(nextTime: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <>
      <audio
        ref={audioRef}
        className="hidden"
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          if (expandedRef.current) setCurrentTime(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => changeSong(index + 1)}
      />

      {hasSongs && current && (
        <div
          ref={playerRef}
          className={cn('fixed z-40', !position && 'bottom-4 left-4 lg:bottom-6 lg:left-6')}
          style={position ? { left: position.left, top: position.top } : undefined}
        >
          {showHint && (
            <div className="mb-2 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-md">
              <span>浏览器限制了自动播放，点击开启音乐</span>
              <button onClick={() => setShowHint(false)} aria-label="关闭提示">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

          {expanded ? (
            <div className="w-72 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Music2 className="h-3.5 w-3.5" /> {playing ? '正在播放' : '已暂停'}
                </span>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="收起播放器"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-600/20">
                    {current.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={current.coverUrl} alt={current.title} decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Music2 className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{current.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{current.artist || '未知艺术家'}</p>
                    {muted && (
                      <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                        已静音，点击播放按钮恢复声音
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={Math.min(currentTime, duration || 0)}
                    onChange={(e) => seek(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[hsl(var(--primary))]"
                    aria-label="播放进度"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center gap-4">
                  <button
                    onClick={() => changeSong(index - 1)}
                    className="text-muted-foreground transition-colors hover:text-primary"
                    aria-label="上一首"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    onClick={toggle}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
                    aria-label={playing ? '暂停' : '播放'}
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => changeSong(index + 1)}
                    className="text-muted-foreground transition-colors hover:text-primary"
                    aria-label="下一首"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => changeVolume(muted ? 0.5 : 0)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={muted ? '取消静音' : '静音'}
                  >
                    {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={muted ? 0 : volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-[hsl(var(--primary))]"
                    aria-label="音量"
                  />
                  <span className="w-8 text-right text-[10px] text-muted-foreground">
                    {Math.round((muted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openPlayer}
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="group flex h-12 w-12 cursor-grab touch-none select-none items-center justify-center rounded-full border border-border bg-card/95 text-primary shadow-lg backdrop-blur transition-transform hover:scale-105 active:cursor-grabbing"
              aria-label="打开音乐播放器（可拖动）"
              title="可拖动调整位置"
            >
              {playing ? (
                <span className="flex items-end gap-0.5" aria-hidden>
                  <span className="h-3 w-0.5 animate-pulse rounded-full bg-primary" />
                  <span className="h-4 w-0.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                </span>
              ) : (
                <Music2 className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      )}
    </>
  );
}
