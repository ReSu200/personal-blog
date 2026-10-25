'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';

export function CommentActions({ id, status }: { id: number; status: 'pending' | 'approved' | 'rejected' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(nextStatus: 'approved' | 'rejected' | 'pending') {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? '操作失败');
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!window.confirm('确定删除这条评论吗？')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? '删除失败');
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {status !== 'approved' && (
        <Button variant="ghost" size="sm" onClick={() => update('approved')} disabled={loading} title="通过审核">
          <Check className="h-3.5 w-3.5 text-emerald-600" /> 通过
        </Button>
      )}
      {status !== 'rejected' && (
        <Button variant="ghost" size="sm" onClick={() => update('rejected')} disabled={loading} title="拒绝">
          <X className="h-3.5 w-3.5 text-amber-600" /> 拒绝
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={remove} disabled={loading} title="删除评论">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}
