'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Music2,
  Settings,
  Tags,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { SiteLogo } from '@/components/site-logo';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
  { href: '/admin/posts', label: '文章管理', icon: FileText },
  { href: '/admin/comments', label: '评论管理', icon: MessageSquare },
  { href: '/admin/taxonomy', label: '分类与标签', icon: Tags },
  { href: '/admin/music', label: '音乐管理', icon: Music2 },
  { href: '/admin/settings', label: '站点设置', icon: Settings },
];

type Props = {
  username: string;
  siteName: string;
  logoUrl: string | null;
  children: React.ReactNode;
};

export function AdminShell({ username, siteName, logoUrl, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', keepalive: true });
    } finally {
      window.location.replace('/');
    }
  }

  const nav = (
    <nav className="mt-6 space-y-1">
      {items.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <SiteLogo name={siteName} logoUrl={logoUrl} className="h-8 w-8 rounded-lg text-sm" />
          <span className="font-semibold">管理后台</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">管理后台</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5">
          <SiteLogo name={siteName} logoUrl={logoUrl} className="h-9 w-9 rounded-lg text-sm" />
          <div>
            <p className="text-sm font-semibold leading-tight">管理后台</p>
            <p className="text-[11px] text-muted-foreground">{username}</p>
          </div>
        </div>

        {nav}

        <div className="mt-auto space-y-1 pt-6">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> 返回前台
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" /> 退出登录
          </button>
        </div>
      </aside>

      <main className="px-4 py-6 lg:pl-64 lg:pr-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
