import Link from 'next/link';
import { CalendarDays, Eye, Pin } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { PostListItem } from '@/lib/queries';

const cardBase =
  'group relative overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_44px_-30px_rgba(20,80,70,0.45)]';

function CategoryChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
      {name}
    </span>
  );
}

function PinnedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
      <Pin className="h-3 w-3" /> 置顶
    </span>
  );
}

export function PostCard({
  post,
  defaultCover,
  coverPosition,
}: {
  post: PostListItem;
  defaultCover?: string | null;
  coverPosition?: string;
}) {
  const cover = post.coverImage ?? defaultCover ?? null;
  // 文章自带封面时用文章自己存的位置，没有封面时才回退站点默认封面的位置
  const position = post.coverImage ? post.coverPosition ?? undefined : coverPosition;

  return (
    <article className="animate-fade-in-up">
      <Link href={`/posts/${post.slug}`} className={`${cardBase} flex flex-col gap-4 p-4 sm:flex-row sm:gap-6 sm:p-5`}>
        {cover ? (
          <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-[132px] sm:w-48 lg:w-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={post.title}
              loading="lazy"
              decoding="async"
              style={position ? { objectPosition: position } : undefined}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {post.isPinned === 1 && <PinnedChip />}
            {post.categoryName && <CategoryChip name={post.categoryName} />}
          </div>

          <h2 className="mt-2 line-clamp-2 font-serif text-[17px] font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
            {post.title}
          </h2>

          {post.summary && (
            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {post.summary}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {post.viewCount}
            </span>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.slice(0, 3).map((tag) => (
                  <span key={tag.slug} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function PostGridCard({
  post,
  defaultCover,
  coverPosition,
}: {
  post: PostListItem;
  defaultCover?: string | null;
  coverPosition?: string;
}) {
  const cover = post.coverImage ?? defaultCover ?? null;
  // 文章自带封面时用文章自己存的位置，没有封面时才回退站点默认封面的位置
  const position = post.coverImage ? post.coverPosition ?? undefined : coverPosition;

  return (
    <article className="animate-fade-in-up">
      <Link href={`/posts/${post.slug}`} className={`${cardBase} flex h-full flex-col`}>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={post.title}
              loading="lazy"
              decoding="async"
              style={position ? { objectPosition: position } : undefined}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="hero-canvas flex h-full w-full items-center justify-center">
              <span className="font-serif text-4xl font-bold text-primary/40">
                {post.title.slice(0, 1)}
              </span>
            </div>
          )}
          {post.isPinned === 1 && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm">
              <Pin className="h-3 w-3" /> 置顶
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          {post.categoryName && <CategoryChip name={post.categoryName} />}
          <h3 className="mt-2 line-clamp-2 font-serif text-[15px] font-semibold leading-snug transition-colors group-hover:text-primary">
            {post.title}
          </h3>
          {post.summary && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {post.summary}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.viewCount}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** 首页推荐位：自带背景图的横向大卡片，没有封面时退化为薄荷色画布 */
export function FeaturedPostCard({
  post,
  defaultCover,
  coverPosition,
}: {
  post: PostListItem;
  defaultCover?: string | null;
  coverPosition?: string;
}) {
  const cover = post.coverImage ?? defaultCover ?? null;
  // 文章自带封面时用文章自己存的位置，没有封面时才回退站点默认封面的位置
  const position = post.coverImage ? post.coverPosition ?? undefined : coverPosition;

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group relative flex min-h-[190px] flex-col justify-end overflow-hidden rounded-2xl border border-border/60 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(20,80,70,0.5)]"
    >
      {cover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={post.title}
            decoding="async"
            style={position ? { objectPosition: position } : undefined}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-slate-950/10" />
        </>
      ) : (
        <div className="hero-canvas absolute inset-0" />
      )}

      <div className="relative">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            cover ? 'bg-white/20 text-white/90 backdrop-blur' : 'bg-card/70 text-primary'
          }`}
        >
          <Pin className="h-3 w-3" /> 推荐
        </span>
        <h3
          className={`mt-3 line-clamp-2 font-serif text-xl font-semibold leading-snug transition-colors ${
            cover ? 'text-white group-hover:text-primary-foreground' : 'text-foreground group-hover:text-primary'
          }`}
        >
          {post.title}
        </h3>
        {post.summary && (
          <p
            className={`mt-2 line-clamp-2 text-xs leading-relaxed ${
              cover ? 'text-white/75' : 'text-muted-foreground'
            }`}
          >
            {post.summary}
          </p>
        )}
        <div
          className={`mt-3 flex items-center gap-4 text-[11px] ${
            cover ? 'text-white/70' : 'text-muted-foreground'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(post.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {post.viewCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
