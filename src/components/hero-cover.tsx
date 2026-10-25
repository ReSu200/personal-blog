import { cn } from '@/lib/utils';

/**
 * 复用首页背景板图片（作者卡 / 关于页顶部横幅）。
 * 图片做轻微柔化（1.5px 模糊）压制细节，保持可辨识但不抢眼；
 * 仅在下缘约 1/3 高度渐隐到卡片底色，使叠在上方的头像有干净衬底。
 */
export function HeroCover({
  image,
  position,
  className,
}: {
  image: string | null;
  /** 背景板裁切焦点，对应 object-position */
  position?: string;
  className?: string;
}) {
  if (!image) {
    return <div className={cn('hero-canvas', className)} />;
  }

  return (
    <div className={cn('relative isolate overflow-hidden bg-secondary/60', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        aria-hidden
        decoding="async"
        style={position ? { objectPosition: position } : undefined}
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-80 blur-[1.5px] dark:opacity-65"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent"
      />
    </div>
  );
}
