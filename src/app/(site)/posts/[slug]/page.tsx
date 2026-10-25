import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, Eye, Timer } from 'lucide-react';
import { Markdown } from '@/components/markdown';
import { AuthorCard } from '@/components/author-card';
import { CommentSection } from '@/components/comment-section';
import { ArticleProgress } from '@/components/article-progress';
import { UserAvatar } from '@/components/user-avatar';
import {
  getAdjacentPosts,
  getApprovedComments,
  getPostBySlug,
  getSettings,
  incrementView,
} from '@/lib/queries';
import { getSession } from '@/lib/auth';
import { extractToc } from '@/lib/toc';
import { formatDate, readingTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const detail = await getPostBySlug(decodeURIComponent(params.slug));
  if (!detail) return { title: '文章不存在' };
  return {
    title: detail.post.title,
    description: detail.post.summary ?? undefined,
  };
}

export default async function PostDetailPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const detail = await getPostBySlug(slug);
  if (!detail || detail.post.status !== 'published') notFound();

  const post = detail.post;

  // 阅读计数只是副作用，与页面数据并行执行，不额外阻塞渲染
  const [comments, session, adjacent, settings] = await Promise.all([
    getApprovedComments(post.id),
    getSession(),
    getAdjacentPosts({ id: post.id, publishedAt: post.publishedAt }),
    getSettings(),
    incrementView(post.id),
  ]);
  const toc = extractToc(post.content);

  const cover = post.coverImage ?? settings.latestCover;
  // 自带封面用文章自己的裁切焦点，没有封面时才用站点默认封面的位置
  const coverPosition = post.coverImage ? post.coverPosition ?? undefined : settings.latestCoverPosition;

  return (
    <>
      <ArticleProgress />

      <div className="flex justify-center gap-10">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4">
            <AuthorCard
              name={settings.authorName}
              avatar={settings.authorAvatar}
              description={settings.siteDescription}
              githubUrl={settings.githubUrl}
              qq={settings.authorQq}
              wechat={settings.authorWechat}
              heroBackground={settings.heroBackground}
              heroPosition={settings.heroPosition}
            />

            {toc.length > 0 && (
              <nav className="max-h-[52vh] overflow-y-auto rounded-2xl border border-border/70 bg-card p-4">
                <p className="eyebrow">Contents</p>
                <div className="mt-3 space-y-0.5 text-[13px]">
                  {toc.map((item) => (
                    <a
                      key={`${item.id}-${item.text}`}
                      href={`#${item.id}`}
                      className={`block border-l-2 border-transparent py-1 text-muted-foreground transition-colors hover:border-primary hover:text-primary ${
                        item.level === 3 ? 'pl-4 text-xs' : 'pl-3'
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </div>
              </nav>
            )}
          </div>
        </aside>

        <article className="w-full min-w-0 max-w-[760px]">
          <Link
            href="/posts"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> 返回文章列表
          </Link>

          {cover && (
            <div className="mt-5 overflow-hidden rounded-2xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={post.title}
                fetchPriority="high"
                decoding="async"
                style={coverPosition ? { objectPosition: coverPosition } : undefined}
                className="aspect-[21/9] w-full object-cover"
              />
            </div>
          )}

          <header className="mt-7">
            <div className="flex flex-wrap items-center gap-2">
              {post.isPinned === 1 && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  置顶
                </span>
              )}
              {detail.categoryName && (
                <Link
                  href={`/posts?category=${detail.categorySlug ?? ''}`}
                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  {detail.categoryName}
                </Link>
              )}
            </div>

            <h1 className="mt-3 font-serif text-[28px] font-bold leading-[1.3] tracking-tight sm:text-[38px]">
              {post.title}
            </h1>

            {post.summary && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{post.summary}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {post.viewCount + 1} 次阅读
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" />
                约 {readingTime(post.content)} 分钟
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserAvatar
                  avatar={settings.authorAvatar}
                  name={settings.authorName}
                  className="h-4 w-4 text-[8px]"
                />
                {detail.authorName}
              </span>
            </div>
          </header>

          <div id="article-body" className="mt-8">
            <Markdown content={post.content} />
          </div>

          {detail.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border/60 pt-6">
              <span className="text-xs text-muted-foreground">标签</span>
              {detail.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/posts?tag=${tag.slug}`}
                  className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {adjacent.prev ? (
              <Link href={`/posts/${adjacent.prev.slug}`} className="card-surface card-hover block p-4">
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> 上一篇
                </p>
                <p className="mt-1.5 line-clamp-1 font-serif text-sm font-medium">
                  {adjacent.prev.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {adjacent.next && (
              <Link
                href={`/posts/${adjacent.next.slug}`}
                className="card-surface card-hover block p-4 sm:text-right"
              >
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground sm:justify-end">
                  下一篇 <ArrowRight className="h-3.5 w-3.5" />
                </p>
                <p className="mt-1.5 line-clamp-1 font-serif text-sm font-medium">
                  {adjacent.next.title}
                </p>
              </Link>
            )}
          </div>

          <div id="comments" className="mt-10 scroll-mt-24">
            <CommentSection postId={post.id} comments={comments} session={session} />
          </div>
        </article>
      </div>
    </>
  );
}
