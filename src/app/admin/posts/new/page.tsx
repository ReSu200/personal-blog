import { PostEditor } from '@/components/post-editor';
import { listAllCategories, listAllTags } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = { title: '写新文章' };

export default async function NewPostPage() {
  const [categories, tags] = await Promise.all([listAllCategories(), listAllTags()]);
  return (
    <PostEditor
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      tags={tags.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}
