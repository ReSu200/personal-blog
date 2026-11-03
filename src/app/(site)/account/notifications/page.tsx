import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import { MarkNotificationsRead } from '@/components/mark-notifications-read';
import { Pagination } from '@/components/pagination';
import { getSession } from '@/lib/auth';
import { listMyCommentNotifications } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = { title: '通知' };

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  approved: {
    label: '你的评论已通过审核',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  rejected: {
    label: '你的评论未通过审核',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  deleted: {
    label: '你的评论已被管理员删除',
    className: 'bg-muted text-muted-foreground',
  },
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/account/notifications');

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await listMyCommentNotifications(session.id, page);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <MarkNotificationsRead />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Bell className="h-4 w-4 text-primary" /> 通知
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {data.total} 条，进入本页后自动标记为已读
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
        <EmptyState text="暂无通知" />
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => {
            const meta = TYPE_STYLES[item.type] ?? {
              label: '评论状态已更新',
              className: 'bg-muted text-muted-foreground',
            };
            const deleted = item.type === 'deleted';
            const href = deleted
              ? `/posts/${item.postSlug}`
              : `/posts/${item.postSlug}#comment-${item.commentId}`;
            const unread = item.readAt === null;

            return (
              <Card key={item.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={meta.className}>{meta.label}</Badge>
                    {unread && (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        新
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt, true)}
                    </span>
                  </div>
                  {item.postSlug ? (
                    <Link
                      href={href}
                      className="max-w-[50%] truncate text-xs text-primary hover:underline"
                    >
                      《{item.postTitle}》
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">文章已删除</span>
                  )}
                </div>

                {item.commentContent && (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed">
                    {item.commentContent}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={data.page} totalPages={data.totalPages} basePath="/account/notifications" />
    </div>
  );
}
