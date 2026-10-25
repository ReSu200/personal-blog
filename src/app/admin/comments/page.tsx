import Link from 'next/link';
import { Badge, Card, EmptyState } from '@/components/ui';
import { CommentActions } from '@/components/comment-actions';
import { adminListComments } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = { title: '评论管理' };

const filters = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
];

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = ['pending', 'approved', 'rejected'].includes(searchParams.status ?? '')
    ? (searchParams.status as 'pending' | 'approved' | 'rejected')
    : undefined;

  const comments = await adminListComments(status);
  const pendingCount = status === undefined ? comments.filter((c) => c.status === 'pending').length : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">评论管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          游客评论需审核后才会在前台展示{pendingCount > 0 ? `，当前有 ${pendingCount} 条待审核` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter.key === (searchParams.status ?? 'all');
          return (
            <Link
              key={filter.key}
              href={filter.key === 'all' ? '/admin/comments' : `/admin/comments?status=${filter.key}`}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{comment.username}</span>
                <span className="text-muted-foreground">评论了</span>
                <Link href={`/posts/${comment.postSlug}`} className="text-primary hover:underline">
                  《{comment.postTitle}》
                </Link>
                {comment.status === 'pending' && <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">待审核</Badge>}
                {comment.status === 'approved' && <Badge variant="secondary">已通过</Badge>}
                {comment.status === 'rejected' && <Badge variant="outline">已拒绝</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt, true)}</span>
            </div>

            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed">
              {comment.content}
            </p>

            <div className="mt-3 flex justify-end">
              <CommentActions id={comment.id} status={comment.status} />
            </div>
          </Card>
        ))}
        {comments.length === 0 && <EmptyState text="没有符合条件的评论" />}
      </div>
    </div>
  );
}
