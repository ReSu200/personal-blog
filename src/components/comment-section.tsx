'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Reply, Send } from 'lucide-react';
import { Button, Card, Textarea } from '@/components/ui';
import { UserAvatar } from '@/components/user-avatar';
import { formatDate } from '@/lib/utils';
import type { CommentItem } from '@/lib/queries';
import type { SessionUser } from '@/lib/jwt';

type Props = {
  postId: number;
  comments: CommentItem[];
  session: SessionUser | null;
};

export function CommentSection({ postId, comments, session }: Props) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tree = useMemo(() => {
    // 先按父评论分桶，避免对每条根评论都完整遍历一次列表
    const repliesByParent = new Map<number, CommentItem[]>();
    for (const comment of comments) {
      if (comment.parentId == null) continue;
      const bucket = repliesByParent.get(comment.parentId);
      if (bucket) bucket.push(comment);
      else repliesByParent.set(comment.parentId, [comment]);
    }
    return comments
      .filter((comment) => comment.parentId == null)
      .map((root) => ({ root, replies: repliesByParent.get(root.id) ?? [] }));
  }, [comments]);

  async function submit() {
    setError('');
    setMessage('');
    if (!content.trim()) {
      setError('请输入评论内容');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content, parentId: replyTo?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '提交失败，请稍后再试');
        return;
      }
      setMessage(data.message ?? '评论已提交，等待管理员审核');
      setContent('');
      setReplyTo(null);
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-12 rounded-3xl border border-border/70 bg-card px-5 py-8 sm:px-8">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <MessageSquare className="h-4 w-4 text-primary" /> 评论
        <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
      </h2>

      {session ? (
        <Card className="mt-4 p-4">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <span>回复 @{replyTo.username}</span>
              <button onClick={() => setReplyTo(null)} className="hover:text-foreground">
                取消
              </button>
            </div>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="友善发言，评论将在管理员审核后展示…"
            maxLength={1000}
            rows={4}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              以 {session.username} 的身份评论 · {content.length}/1000
            </span>
            <Button size="sm" onClick={submit} disabled={loading}>
              <Send className="h-3.5 w-3.5" />
              {loading ? '提交中…' : '发表评论'}
            </Button>
          </div>
          {message && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{message}</p>}
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </Card>
      ) : (
        <Card className="mt-4 p-4 text-sm text-muted-foreground">
          想参与讨论？
          <Link href="/login" className="mx-1 font-medium text-primary hover:underline">
            登录
          </Link>
          或
          <Link href="/register" className="mx-1 font-medium text-primary hover:underline">
            注册
          </Link>
          后即可评论。
        </Card>
      )}

      <div className="mt-6 space-y-5">
        {tree.map(({ root, replies }) => (
          <div key={root.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserAvatar
                  avatar={root.avatarUrl}
                  name={root.displayName ?? root.username}
                  className="h-7 w-7 text-xs"
                />
                <span className="text-sm font-medium">{root.displayName ?? root.username}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(root.createdAt, true)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{root.content}</p>
            {session && (
              <button
                onClick={() =>
                  setReplyTo({ id: root.id, username: root.displayName ?? root.username })
                }
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <Reply className="h-3 w-3" /> 回复
              </button>
            )}

            {replies.length > 0 && (
              <div className="mt-3 space-y-3 border-l-2 border-primary/20 pl-4">
                {replies.map((reply) => (
                  <div key={reply.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {reply.displayName ?? reply.username}
                        <span className="ml-1 text-muted-foreground">
                          回复 @{root.displayName ?? root.username}
                        </span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(reply.createdAt, true)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">还没有评论，来说两句吧</p>
        )}
      </div>
    </section>
  );
}
