import Link from 'next/link';

export const metadata = { title: '页面不存在' };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground">404</p>
      <h1 className="mt-4 text-3xl font-bold">找不到这个页面</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        你访问的页面可能已被删除、改名，或者链接地址有误。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          返回首页
        </Link>
        <Link
          href="/posts"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          浏览文章
        </Link>
      </div>
    </main>
  );
}
