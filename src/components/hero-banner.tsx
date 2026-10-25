import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  siteName: string;
  siteDescription: string;
  backgroundImage: string | null;
  /** 背景板裁切焦点，对应 object-position */
  backgroundPosition?: string;
};

export function HeroBanner({ siteName, siteDescription, backgroundImage, backgroundPosition }: Props) {
  const hasImage = Boolean(backgroundImage);

  return (
    <section
      aria-label="站点欢迎"
      className="full-bleed relative isolate -mt-24 h-[440px] overflow-hidden sm:h-[520px] lg:h-[560px]"
    >
      {/* 背景层：后台设置的首页背景板图片，未设置时使用薄荷色画布 */}
      <div aria-hidden className="absolute inset-0">
        {hasImage ? (
          // 用 img 而非 CSS 背景，浏览器才能尽早发现并给予 LCP 高优先级
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImage!}
            alt=""
            aria-hidden
            fetchPriority="high"
            decoding="async"
            style={backgroundPosition ? { objectPosition: backgroundPosition } : undefined}
            className="absolute inset-0 h-full w-full animate-hero-zoom object-cover object-center"
          />
        ) : (
          <div className="hero-canvas absolute inset-0" />
        )}
      </div>

      {hasImage && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/40 to-slate-950/60"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/80 to-transparent"
          />
        </>
      )}

      {/* 装饰光斑 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-6 h-52 w-52 rounded-full bg-primary/20 blur-3xl animate-float-slow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 bottom-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-24 pt-24 text-center sm:px-10">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] backdrop-blur',
            hasImage
              ? 'border-white/25 bg-white/10 text-white/90'
              : 'border-primary/20 bg-card/70 text-primary',
          )}
        >
          <Sparkles className="h-3 w-3" /> Welcome
        </span>

        <div className="animate-fade-in-up">
          <h1
            className={cn(
              'mt-5 line-clamp-2 font-serif text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.9rem]',
              hasImage ? 'text-white drop-shadow-sm' : 'text-foreground',
            )}
          >
            {siteName}
          </h1>
          {siteDescription && (
            <p
              className={cn(
                'mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-[15px]',
                hasImage ? 'text-white/80' : 'text-muted-foreground',
              )}
            >
              {siteDescription}
            </p>
          )}
          <Link
            href="/posts"
            className={cn(
              'group mt-6 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300',
              hasImage
                ? 'bg-white/95 text-slate-900 hover:bg-white'
                : 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md',
            )}
          >
            开始阅读
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* 底部水波浪：双层错速平移，模拟水面流动 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 overflow-hidden sm:h-20 lg:h-24"
      >
        <div className="absolute inset-0 flex w-[200%] animate-wave-slow opacity-60">
          {[0, 1].map((i) => (
            <svg
              key={i}
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              className="h-full w-1/2 shrink-0 fill-card"
            >
              <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,120 L0,120 Z" />
            </svg>
          ))}
        </div>
        <div className="absolute inset-0 flex w-[200%] animate-wave-fast">
          {[0, 1].map((i) => (
            <svg
              key={i}
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              className="h-full w-1/2 shrink-0 fill-background"
            >
              <path d="M0,56 C240,96 480,16 720,56 C960,96 1200,16 1440,56 L1440,120 L0,120 Z" />
            </svg>
          ))}
        </div>
      </div>
    </section>
  );
}
