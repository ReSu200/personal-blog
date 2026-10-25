'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutDashboard, LogIn, LogOut, Menu, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { SiteLogo } from '@/components/site-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/lib/jwt';

type Props = {
  siteName: string;
  logoUrl: string | null;
  session: SessionUser | null;
  displayName: string;
  avatarUrl: string | null;
};

const navItems = [
  { href: '/', label: '首页' },
  { href: '/posts', label: '文章' },
  { href: '/about', label: '关于我' },
  { href: '/links', label: '友链' },
];

export function SiteHeader({ siteName, logoUrl, session, displayName, avatarUrl }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 下滑后加强毛玻璃与描边，形成固定状态栏效果
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', keepalive: true });
    } finally {
      window.location.replace('/');
    }
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300',
        scrolled || mobileOpen
          ? 'border-border/60 bg-background/80 backdrop-blur-xl'
          : 'border-transparent bg-background/0',
      )}
    >
      <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 lg:px-8">
        {/* 左：站点标识 */}
        <Link href="/" className="group flex min-w-0 items-center gap-2.5 justify-self-start">
          <SiteLogo
            name={siteName}
            logoUrl={logoUrl}
            className="h-9 w-9 rounded-[11px] text-sm transition-transform duration-300 group-hover:-rotate-3"
          />
          <span className="truncate font-serif text-base font-semibold tracking-wide sm:text-lg">
            {siteName}
          </span>
        </Link>

        {/* 中：主导航 */}
        <nav className="hidden items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-1 shadow-sm backdrop-blur md:flex">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm transition-all duration-200',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 右：个人中心 + 主题切换 */}
        <div className="flex items-center justify-end gap-1 justify-self-end">
          <ThemeToggle />

          {session ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="group flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-border hover:bg-accent/60"
              >
                <UserAvatar
                  avatar={avatarUrl}
                  name={displayName}
                  className="h-7 w-7 group-hover:animate-avatar-pop group-hover:ring-2 group-hover:ring-primary/40"
                />
                <span className="max-w-[7rem] truncate text-sm font-medium">{displayName}</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                    menuOpen && 'rotate-180',
                  )}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-xl backdrop-blur animate-fade-in-up"
                >
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{session.username} · {session.role === 'admin' ? '管理员' : '注册用户'}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <Link
                    href="/account"
                    role="menuitem"
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <UserRound className="h-4 w-4" /> 个人中心
                  </Link>
                  {session.role === 'admin' && (
                    <Link
                      href="/admin"
                      role="menuitem"
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <LayoutDashboard className="h-4 w-4" /> 管理后台
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <LogOut className="h-4 w-4" /> 退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-full">
                  <LogIn className="h-4 w-4" /> 登录
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-full px-4">
                  注册
                </Button>
              </Link>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileOpen && (
        <div className="border-t border-border/60 md:hidden">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="my-2 h-px bg-border" />

            {session ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-2">
                  <UserAvatar avatar={avatarUrl} name={displayName} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{session.username} · {session.role === 'admin' ? '管理员' : '注册用户'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/account"
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <UserRound className="h-4 w-4" /> 个人中心
                </Link>
                {session.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" /> 管理后台
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <LogOut className="h-4 w-4" /> 退出登录
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pb-1">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full rounded-full" size="sm">
                    登录
                  </Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button className="w-full rounded-full" size="sm">
                    注册
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
