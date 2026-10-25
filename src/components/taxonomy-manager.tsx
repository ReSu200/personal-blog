'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';

type Item = { id: number; name: string; slug: string };

function Manager({
  title,
  type,
  items,
  hint,
}: {
  title: string;
  type: 'category' | 'tag';
  items: Item[];
  hint: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function add() {
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '添加失败');
        return;
      }
      setName('');
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm('确定删除吗？关联的文章数据会受影响。')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/taxonomy?type=${type}&id=${id}`, { method: 'DELETE' });
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
    <Card className="p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

      <div className="mt-4 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`新的${title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
        />
        <Button onClick={add} disabled={loading || !name.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          添加
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {item.name}
              <span className="ml-2 text-xs text-muted-foreground">/{item.slug}</span>
            </span>
            <Button variant="ghost" size="icon" onClick={() => remove(item.id)} title="删除">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {items.length === 0 && <p className="py-3 text-xs text-muted-foreground">暂无数据</p>}
      </div>
    </Card>
  );
}

export function TaxonomyManager({
  categories,
  tags,
}: {
  categories: Item[];
  tags: Item[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Manager title="分类" type="category" items={categories} hint="分类用于文章归档，删除后文章会变为未分类" />
      <Manager title="标签" type="tag" items={tags} hint="标签用于细化检索，一篇文章可以有多个标签" />
    </div>
  );
}
