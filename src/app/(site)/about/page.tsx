import { Github, Mail, MessageCircle, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui';
import { HeroCover } from '@/components/hero-cover';
import { UserAvatar } from '@/components/user-avatar';
import { getCategoriesWithCount, getSettings, getSiteStats } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = { title: '关于我' };

export default async function AboutPage() {
  const [settings, stats, categories] = await Promise.all([
    getSettings(),
    getSiteStats(),
    getCategoriesWithCount(),
  ]);

  // 与首页右侧统计卡保持一致：文章数、分类数、访问量
  const statItems = [
    { label: '文章', value: stats.posts },
    { label: '分类', value: categories.length },
    { label: '访问', value: settings.visitCount },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="overflow-hidden rounded-3xl">
        <HeroCover image={settings.heroBackground} position={settings.heroPosition} className="h-36 sm:h-44" />
        <div className="px-6 pb-8 sm:px-10">
          <div className="relative z-10 -mt-14 h-24 w-24 overflow-hidden rounded-full border-4 border-card bg-card shadow-lg ring-1 ring-border/50">
            <UserAvatar
              avatar={settings.authorAvatar}
              name={settings.authorName}
              className="h-full w-full"
            />
          </div>

          <p className="eyebrow mt-5">About me</p>
          <h1 className="mt-1.5 font-serif text-3xl font-bold tracking-tight">{settings.authorName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{settings.siteName}</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {settings.siteDescription}
          </p>

          <div className="mt-7 grid max-w-lg grid-cols-3 divide-x divide-border/70 text-center">
            {statItems.map((item) => (
              <div key={item.label} className="px-2">
                <p className="font-serif text-2xl font-semibold tabular-nums text-primary">
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-2.5 text-sm">
            {settings.githubUrl && (
              <a
                href={settings.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3.5 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Github className="h-4 w-4" /> GitHub
              </a>
            )}
            {settings.authorQq && (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3.5 py-1.5 text-muted-foreground">
                <MessageSquare className="h-4 w-4" /> QQ：{settings.authorQq}
              </span>
            )}
            {settings.authorWechat && (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3.5 py-1.5 text-muted-foreground">
                <MessageCircle className="h-4 w-4" /> 微信：{settings.authorWechat}
              </span>
            )}
            {!settings.githubUrl && !settings.authorQq && !settings.authorWechat && (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3.5 py-1.5 text-muted-foreground">
                <Mail className="h-4 w-4" /> 通过评论区联系我
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-5 rounded-3xl p-6 sm:p-8">
        <p className="eyebrow">About this site</p>
        <h2 className="mt-1.5 font-serif text-xl font-semibold">关于这个站点</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {settings.aboutSite}
        </p>
      </Card>
    </div>
  );
}
