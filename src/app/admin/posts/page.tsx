import Link from 'next/link';
import { PencilLine, Plus } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import { adminListPosts } from '@/lib/queries';
import { formatDate } from '@/lib/utils';
import { DeletePostButton } from '@/components/delete-post-button';

export const dynamic = 'force-dynamic';

export const metadata = { title: '文章管理' };

export default async function AdminPostsPage() {
  const posts = await adminListPosts();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">文章管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">共 {posts.length} 篇文章</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> 写新文章
        </Link>
      </div>

      <Card className="overflow-hidden">
        {posts.length === 0 ? (
          <div className="p-6">
            <EmptyState text="还没有文章，点击右上角开始创作" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-[1fr_100px_110px_130px_100px] gap-3 bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
              <span>标题</span>
              <span>状态</span>
              <span>分类</span>
              <span>更新时间</span>
              <span className="text-right">操作</span>
            </div>
            {posts.map((post) => (
              <div
                key={post.id}
                className="grid gap-2 px-5 py-3.5 text-sm sm:grid-cols-[1fr_100px_110px_130px_100px] sm:items-center sm:gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {post.isPinned === 1 && <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">置顶</Badge>}
                  <Link href={`/admin/posts/${post.id}`} className="truncate font-medium hover:text-primary">
                    {post.title}
                  </Link>
                </div>
                <div>
                  {post.status === 'published' ? (
                    <Badge variant="secondary">已发布</Badge>
                  ) : (
                    <Badge variant="outline">草稿</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{post.categoryName ?? '未分类'}</span>
                <span className="text-xs text-muted-foreground">{formatDate(post.updatedAt, true)}</span>
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/admin/posts/${post.id}`}>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent">
                      <PencilLine className="h-4 w-4" />
                    </span>
                  </Link>
                  <DeletePostButton id={post.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
