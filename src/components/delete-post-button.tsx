'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/confirm-dialog';

export function DeletePostButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? '删除失败，请稍后再试');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="删除文章"
        aria-label={`删除文章：${title}`}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
      <ConfirmDialog
        open={open}
        title={`确定删除《${title}》吗？`}
        description="评论与标签关联会一并删除，且不可恢复。"
        error={error}
        loading={loading}
        onConfirm={remove}
        onCancel={() => {
          if (loading) return;
          setOpen(false);
          setError('');
        }}
      />
    </>
  );
}
