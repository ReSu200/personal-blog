import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowRight } from 'lucide-react';
import { HeroBanner } from '@/components/hero-banner';
import { LatestPosts } from '@/components/latest-posts';
import { Pagination } from '@/components/pagination';
import { SiteAside } from '@/components/site-aside';
import { FeaturedPostCard } from '@/components/post-card';
import { getSettings, listPinnedPosts, listPosts } from '@/lib/queries';
import { VIEW_COOKIE } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [settings, data, pinned] = await Promise.all([
    getSettings(),
    listPosts({ page, pageSize: 6 }),
    listPinnedPosts(2),
  ]);

  // 置顶文章已在推荐位展示，避免在最新列表里重复出现
  const pinnedIds = new Set(pinned.map((post) => post.id));
  const latest = data.items.filter((post) => !pinnedIds.has(post.id));

  return (
    <div>
      <HeroBanner
        siteName={settings.siteName}
        siteDescription={settings.siteDescription}
        backgroundImage={settings.heroBackground}
        backgroundPosition={settings.heroPosition}
      />

      {pinned.length > 0 && (
        <section className="mt-8" aria-labelledby="featured-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 id="featured-title" className="mt-1.5 font-serif text-2xl font-semibold">
                推荐位
              </h2>
            </div>
            <Link
              href="/posts"
              className="link-underline hidden items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary sm:inline-flex"
            >
              更多推荐 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {pinned.map((post) => (
              <FeaturedPostCard
                key={post.id}
                post={post}
                defaultCover={settings.featuredCover}
                coverPosition={settings.featuredCoverPosition}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <LatestPosts
            posts={latest}
            total={data.total}
            defaultCover={settings.latestCover}
            coverPosition={settings.latestCoverPosition}
            initialMode={cookies().get(VIEW_COOKIE)?.value === 'grid' ? 'grid' : 'list'}
          />
          <Pagination page={data.page} totalPages={data.totalPages} basePath="/" />
        </div>

        <SiteAside />
      </div>
    </div>
  );
}
