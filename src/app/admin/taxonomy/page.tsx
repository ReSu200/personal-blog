import { TaxonomyManager } from '@/components/taxonomy-manager';
import { listAllCategories, listAllTags } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = { title: '分类与标签' };

export default async function AdminTaxonomyPage() {
  const [categories, tags] = await Promise.all([listAllCategories(), listAllTags()]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">分类与标签</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理文章的分类与标签体系</p>
      </div>
      <TaxonomyManager categories={categories} tags={tags} />
    </div>
  );
}
