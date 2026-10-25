import Link from 'next/link';
import { FileText, MessageSquare, Music2, PencilLine, Clock } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import { adminDashboard } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = { title: '仪表盘' };

export default async function AdminDashboardPage() {
  const data = await adminDashboard();

  const cards = [
    { label: '文章总数', value: data.posts, hint: `已发布 ${data.published} 篇`, icon: FileText },
    { label: '评论总数', value: data.comments, hint: `${data.pending} 条待审核`, icon: MessageSquare },
    { label: '音乐数量', value: data.songs, hint: '前台播放列表', icon: Music2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">站点内容概览与快捷入口</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PencilLine className="h-4 w-4" /> 写新文章
        </Link>
        <Link
          href="/admin/comments"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <MessageSquare className="h-4 w-4" /> 审核评论
          {data.pending > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 text-[11px] text-white">{data.pending}</span>
          )}
        </Link>
        <Link
          href="/admin/music"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Music2 className="h-4 w-4" /> 管理音乐
        </Link>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">最近更新的文章</h2>
        <div className="mt-3 divide-y divide-border">
          {data.recent.map((post) => (
            <Link
              key={post.id}
              href={`/admin/posts/${post.id}`}
              className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-primary"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{post.title}</span>
                {post.status === 'draft' && <Badge variant="outline">草稿</Badge>}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(post.updatedAt, true)}
              </span>
            </Link>
          ))}
          {data.recent.length === 0 && <EmptyState text="还没有文章" />}
        </div>
      </Card>
    </div>
  );
}
