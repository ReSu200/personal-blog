import Link from 'next/link';
import { Layers, Tags } from 'lucide-react';
import { Card } from '@/components/ui';
import { AuthorCard } from '@/components/author-card';
import { SiteStatsCard } from '@/components/site-stats-card';
import { getCategoriesWithCount, getSettings, getSiteStats, getTagsWithCount } from '@/lib/queries';

export async function SiteAside() {
  const [settings, categories, tags, stats] = await Promise.all([
    getSettings(),
    getCategoriesWithCount(),
    getTagsWithCount(),
    getSiteStats(),
  ]);

  return (
    <aside className="hidden w-72 shrink-0 xl:block">
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

        <SiteStatsCard posts={stats.posts} categories={categories.length} visits={settings.visitCount} />

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Layers className="h-4 w-4 text-primary" /> 文章分类
            </h3>
            <Link
              href="/posts"
              className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
            >
              全部
            </Link>
          </div>
          <div className="mt-3 space-y-0.5">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/posts?category=${category.slug}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate">{category.name}</span>
                <span className="text-[11px] tabular-nums opacity-60">{category.total}</span>
              </Link>
            ))}
            {categories.length === 0 && <p className="text-xs text-muted-foreground">暂无分类</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Tags className="h-4 w-4 text-primary" /> 热门标签
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/posts?tag=${tag.slug}`}
                className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                #{tag.name}
              </Link>
            ))}
            {tags.length === 0 && <p className="text-xs text-muted-foreground">暂无标签</p>}
          </div>
        </Card>
      </div>
    </aside>
  );
}
