import { ArrowUpRight, Github, Link2, Mail } from 'lucide-react';
import { Card } from '@/components/ui';
import { getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = { title: '友链' };

const FRIEND_LINKS = [
  {
    name: 'Next.js',
    url: 'https://nextjs.org',
    description: 'React 全栈框架，本站的技术底座。',
  },
  {
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    description: '原子化 CSS，快速搭建整洁的界面。',
  },
  {
    name: 'Drizzle ORM',
    url: 'https://orm.drizzle.team',
    description: 'TypeScript ORM，类型安全地访问 MySQL。',
  },
  {
    name: 'Lucide',
    url: 'https://lucide.dev',
    description: '简洁一致的开源图标库。',
  },
];

export default async function LinksPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <p className="eyebrow">Friends</p>
        <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">友链</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          这里收录一些常用且值得一看的站点，欢迎交换链接。
        </p>
      </header>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {FRIEND_LINKS.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="card-hover flex h-full items-start gap-3.5 rounded-3xl p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Link2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-sm font-semibold transition-colors group-hover:text-primary">
                  {link.name}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {link.description}
                </p>
              </div>
            </Card>
          </a>
        ))}
      </div>

      <Card className="mt-6 rounded-3xl p-6 sm:p-8">
        <p className="eyebrow">Site info</p>
        <h2 className="mt-1.5 font-serif text-lg font-semibold">本站信息</h2>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-muted-foreground">名称</dt>
            <dd>{settings.siteName}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-muted-foreground">简介</dt>
            <dd className="text-muted-foreground">{settings.siteDescription}</dd>
          </div>
          {settings.githubUrl && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-muted-foreground">GitHub</dt>
              <dd>
                <a
                  href={settings.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Github className="h-3.5 w-3.5" /> {settings.githubUrl}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="mt-4 flex items-start gap-3.5 rounded-3xl p-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">申请友链</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            在任意文章下方留言，附上你的站点名称、地址与一句简介，我会尽快处理。
          </p>
        </div>
      </Card>
    </div>
  );
}
