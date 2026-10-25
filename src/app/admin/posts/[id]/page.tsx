import { notFound } from 'next/navigation';
import { PostEditor } from '@/components/post-editor';
import { adminGetPost, listAllCategories, listAllTags } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = { title: '编辑文章' };

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [post, categories, tags] = await Promise.all([
    adminGetPost(id),
    listAllCategories(),
    listAllTags(),
  ]);
  if (!post) notFound();

  return (
    <PostEditor
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      tags={tags.map((t) => ({ id: t.id, name: t.name }))}
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        summary: post.summary,
        coverImage: post.coverImage,
        coverPosition: post.coverPosition,
        categoryId: post.categoryId,
        status: post.status,
        isPinned: post.isPinned,
        publishedAt: post.publishedAt,
        tagNames: post.tagNames,
      }}
    />
  );
}
