import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { PostCard } from '@/components/post-card';
import { Pagination } from '@/components/pagination';
import { SiteAside } from '@/components/site-aside';
import { getCategoriesWithCount, getSettings, getTagsWithCount, listPosts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '全部文章',
};

type SearchParams = {
  page?: string;
  q?: string;
  category?: string;
  tag?: string;
};

export default async function PostsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q?.trim() || '';
  const category = searchParams.category || '';
  const tag = searchParams.tag || '';

  const [data, categories, tags, settings] = await Promise.all([
    listPosts({ page, pageSize: 10, q, category, tag }),
    getCategoriesWithCount(),
    getTagsWithCount(),
    getSettings(),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);
  const activeTag = tags.find((t) => t.slug === tag);

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Archive</p>
            <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">全部文章</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              共 {data.total} 篇{q ? ` · 搜索「${q}」` : ' · 按时间倒序排列'}
              {activeCategory ? ` · 分类「${activeCategory.name}」` : ''}
              {activeTag ? ` · 标签「${activeTag.name}」` : ''}
            </p>
          </div>

          <form action="/posts" method="get" className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder="搜索文章标题或摘要"
              className="h-10 w-full rounded-full border border-input bg-card pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
            {category && <input type="hidden" name="category" value={category} />}
            {tag && <input type="hidden" name="tag" value={tag} />}
          </form>
        </header>

        {(q || category || tag) && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {q && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                关键词：{q}
              </span>
            )}
            {activeCategory && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                分类：{activeCategory.name}
              </span>
            )}
            {activeTag && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                标签：#{activeTag.name}
              </span>
            )}
            <Link
              href="/posts"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <X className="h-3 w-3" /> 清除筛选
            </Link>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {data.items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              defaultCover={settings.latestCover}
              coverPosition={settings.latestCoverPosition}
            />
          ))}
          {data.items.length === 0 && <EmptyState text="没有找到匹配的文章" />}
        </div>

        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          basePath="/posts"
          query={{ q: q || undefined, category: category || undefined, tag: tag || undefined }}
        />
      </div>

      <SiteAside />
    </div>
  );
}
