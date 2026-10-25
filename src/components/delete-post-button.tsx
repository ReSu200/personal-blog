'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';

export function DeletePostButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm('确定删除这篇文章吗？评论会一并删除，且不可恢复。')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
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
    <Button variant="ghost" size="icon" onClick={remove} disabled={loading} title="删除文章">
      <Trash2 className="h-4 w-4 text-red-500" />
    </Button>
  );
}
