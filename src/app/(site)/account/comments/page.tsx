import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import { Pagination } from '@/components/pagination';
import { getSession } from '@/lib/auth';
import { listMyComments } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = { title: '我的评论' };

const STATUS_STYLES: Record<'pending' | 'approved' | 'rejected', { label: string; className: string }> = {
  pending: { label: '待审核', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  approved: { label: '已通过', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  rejected: { label: '已拒绝', className: 'border border-border bg-transparent text-muted-foreground' },
};

export default async function MyCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/account/comments');

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await listMyComments(session.id, page);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <MessageSquare className="h-4 w-4 text-primary" /> 我的评论
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {data.total} 条，审核结果会在通知里同步提醒
          </p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> 返回个人中心
        </Link>
      </div>

      {data.items.length === 0 ? (
        <div className="space-y-3">
          <EmptyState text="还没有发表过评论" />
          <p className="text-center text-sm text-muted-foreground">
            去
            <Link href="/posts" className="mx-1 font-medium text-primary hover:underline">
              文章列表
            </Link>
            看看，挑一篇聊聊吧
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => {
            const deleted = item.deletedAt !== null;
            const meta = deleted
              ? { label: '已被删除', className: 'bg-muted text-muted-foreground' }
              : STATUS_STYLES[item.status];
            const href = deleted
              ? `/posts/${item.postSlug}`
              : `/posts/${item.postSlug}#comment-${item.id}`;

            return (
              <Card key={item.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={meta.className}>{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt, true)}
                    </span>
                  </div>
                  <Link href={href} className="max-w-[60%] truncate text-xs text-primary hover:underline">
                    评论了《{item.postTitle}》
                  </Link>
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed">
                  {item.content}
                </p>
                {deleted && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    该评论已被管理员删除，前台不再展示
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={data.page} totalPages={data.totalPages} basePath="/account/comments" />
    </div>
  );
}
