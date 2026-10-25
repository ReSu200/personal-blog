'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Move } from 'lucide-react';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

function parsePosition(position: string) {
  const [x, y] = position.split(/\s+/).map((part) => Number.parseFloat(part));
  return {
    x: Number.isFinite(x) ? clamp(x) : 50,
    y: Number.isFinite(y) ? clamp(y) : 50,
  };
}

/**
 * 封面预览（16:10）：按住图片拖动即可调整裁切焦点，相当于可视化的 object-position。
 * 松手后回调一次坐标百分比，避免拖动过程中反复写库。
 */
export function CoverPositionPreview({
  image,
  position,
  onChange,
  className,
}: {
  image: string;
  position: string;
  onChange: (next: { x: number; y: number }) => void;
  className?: string;
}) {
  const [point, setPoint] = useState(() => parsePosition(position));
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
  } | null>(null);
  // 记录最新坐标，pointerup 时不必依赖可能滞后一帧的 state
  const pointRef = useRef(point);

  useEffect(() => {
    const next = parsePosition(position);
    pointRef.current = next;
    setPoint(next);
  }, [position]);

  const commit = (next: { x: number; y: number }) => {
    onChange({ x: Math.round(next.x), y: Math.round(next.y) });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box) return;
    // 尺寸在拖动开始时量一次，避免每次 pointermove 都读取布局触发回流
    const rect = box.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: point.x,
      originY: point.y,
      width: rect.width,
      height: rect.height,
    };
    setDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 部分浏览器在元素被复用时无法捕获指针，拖拽仍可继续
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const next = {
      x: clamp(drag.originX - ((event.clientX - drag.startX) / drag.width) * 100),
      y: clamp(drag.originY - ((event.clientY - drag.startY) / drag.height) * 100),
    };
    pointRef.current = next;
    setPoint(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // 忽略已释放的指针
    }
    commit(pointRef.current);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 3;
    const delta: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    const next = { x: clamp(point.x + move.x), y: clamp(point.y + move.y) };
    pointRef.current = next;
    setPoint(next);
    commit(next);
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-muted', className)}>
      <div
        ref={boxRef}
        role="button"
        tabIndex={0}
        aria-label="拖动调整封面显示位置，也可用方向键微调"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          'group relative aspect-[16/10] w-full touch-none select-none outline-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt="封面预览"
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: `${point.x}% ${point.y}%` }}
        />
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/65 to-transparent px-3 pb-2 pt-8 text-[11px] text-white transition-opacity',
            dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
          )}
        >
          <span className="inline-flex items-center gap-1">
            <Move className="h-3 w-3" /> 拖动调整显示位置
          </span>
          <span className="tabular-nums text-white/70">
            {Math.round(point.x)}% / {Math.round(point.y)}%
          </span>
        </div>
      </div>
    </div>
  );
}
