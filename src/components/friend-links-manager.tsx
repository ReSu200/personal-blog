'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Badge, Button, Card, Input, Label, Textarea } from '@/components/ui';

type FriendLink = {
  id: number;
  name: string;
  url: string;
  description: string | null;
  sortOrder: number;
  isVisible: number;
};

type Draft = {
  name: string;
  url: string;
  description: string;
  sortOrder: string;
  isVisible: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  url: '',
  description: '',
  sortOrder: '',
  isVisible: true,
};

export function FriendLinksManager({ links }: { links: FriendLink[] }) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const sorted = [...links].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  async function add() {
    setError('');
    setMessage('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '添加失败');
        return;
      }
      setName('');
      setUrl('');
      setDescription('');
      setMessage('友链已添加，默认追加到列表末尾');
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(link: FriendLink) {
    setEditingId(link.id);
    setError('');
    setMessage('');
    setDraft({
      name: link.name,
      url: link.url,
      description: link.description ?? '',
      sortOrder: String(link.sortOrder),
      isVisible: link.isVisible === 1,
    });
  }

  async function saveEdit() {
    if (editingId === null) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/links/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          url: draft.url,
          description: draft.description,
          sortOrder: Number(draft.sortOrder) || 0,
          isVisible: draft.isVisible,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '保存失败');
        return;
      }
      setEditingId(null);
      setMessage('友链已更新');
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(link: FriendLink) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: link.isVisible !== 1 }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '操作失败');
        return;
      }
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setBusy(false);
    }
  }

  /** 交换相邻两项后按新顺序重排 sortOrder，避免排序值重复导致顺序不稳定 */
  async function move(link: FriendLink, direction: -1 | 1) {
    const index = sorted.findIndex((item) => item.id === link.id);
    const target = sorted[index + direction];
    if (!target) return;

    const next = [...sorted];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];

    setError('');
    setMessage('');
    setBusy(true);
    try {
      await Promise.all(
        next.map((item, position) =>
          item.sortOrder === position
            ? Promise.resolve()
            : fetch(`/api/admin/links/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sortOrder: position }),
              }),
        ),
      );
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setBusy(false);
    }
  }

  async function remove(link: FriendLink) {
    if (!window.confirm(`确定删除友链「${link.name}」吗？`)) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/links/${link.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '删除失败');
        return;
      }
      if (editingId === link.id) setEditingId(null);
      setMessage('友链已删除');
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">友链列表（{links.length}）</h2>
        </div>

        <div className="divide-y divide-border">
          {sorted.map((link, index) => (
            <div key={link.id} className="px-5 py-3">
              {editingId === link.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`link-name-${link.id}`}>站点名称</Label>
                      <Input
                        id={`link-name-${link.id}`}
                        value={draft.name}
                        onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`link-url-${link.id}`}>链接地址</Label>
                      <Input
                        id={`link-url-${link.id}`}
                        value={draft.url}
                        onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`link-desc-${link.id}`}>简介</Label>
                    <Textarea
                      id={`link-desc-${link.id}`}
                      value={draft.description}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={2}
                      maxLength={120}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="w-28">
                      <Label htmlFor={`link-sort-${link.id}`}>排序</Label>
                      <Input
                        id={`link-sort-${link.id}`}
                        type="number"
                        min={0}
                        value={draft.sortOrder}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, sortOrder: e.target.value }))
                        }
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 pt-5 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.isVisible}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, isVisible: e.target.checked }))
                        }
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                      前台展示
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      保存
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={busy}>
                      <X className="h-4 w-4" /> 取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{link.name}</p>
                      {link.isVisible !== 1 && <Badge variant="outline">已隐藏</Badge>}
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block truncate text-xs text-primary hover:underline"
                    >
                      {link.url}
                    </a>
                    {link.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {link.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy || index === 0}
                      onClick={() => move(link, -1)}
                      title="上移"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy || index === sorted.length - 1}
                      onClick={() => move(link, 1)}
                      title="下移"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => toggleVisible(link)}
                      title={link.isVisible === 1 ? '隐藏' : '展示'}
                    >
                      {link.isVisible === 1 ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      {link.isVisible === 1 ? '隐藏' : '展示'}
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => startEdit(link)} title="编辑">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => remove(link)} title="删除">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {links.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              还没有友链，右侧添加第一条吧
            </p>
          )}
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-primary" /> 添加友链
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            链接支持 http:// 与 https://，相同链接不能重复添加
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="new-link-name">站点名称</Label>
              <Input
                id="new-link-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="例如：Next.js"
              />
            </div>
            <div>
              <Label htmlFor="new-link-url">链接地址</Label>
              <Input
                id="new-link-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={500}
                placeholder="https://example.com 或 http://example.com"
              />
            </div>
            <div>
              <Label htmlFor="new-link-desc">简介（可选）</Label>
              <Textarea
                id="new-link-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={120}
                placeholder="一句话介绍这个站点"
              />
            </div>

            <Button
              className="w-full"
              onClick={add}
              disabled={creating || !name.trim() || !url.trim()}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              添加
            </Button>

            {message && <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
