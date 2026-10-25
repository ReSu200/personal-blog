import Link from 'next/link';
import { Github, Rss } from 'lucide-react';

type Props = {
  siteName: string;
  siteDescription: string;
  authorName: string;
  githubUrl: string | null;
  /** 后台自定义的版权文案；为空时使用自动生成的默认文案 */
  footerText?: string;
};

const footerLinks = [
  { href: '/', label: '首页' },
  { href: '/posts', label: '文章' },
  { href: '/about', label: '关于我' },
  { href: '/links', label: '友链' },
];

/** 替换文案里的占位符，让年份/站点名/作者名随时间自动更新 */
function renderFooterText(template: string, siteName: string, authorName: string) {
  if (!template.trim()) {
    return `© ${new Date().getFullYear()} ${siteName} · 湘ICP备000000号`;
  }
  return template
    .replace(/\{year\}/g, String(new Date().getFullYear()))
    .replace(/\{site\}/g, siteName)
    .replace(/\{author\}/g, authorName);
}

export function SiteFooter({ siteName, siteDescription, authorName, githubUrl, footerText }: Props) {
  return (
    <footer className="mt-20 border-t border-border/60 bg-card/50">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 py-12 text-center lg:px-8">
        <p className="font-serif text-lg font-semibold tracking-wide">{siteName}</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{siteDescription}</p>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="/rss.xml"
            className="link-underline inline-flex items-center gap-1 transition-colors hover:text-primary"
          >
            <Rss className="h-3.5 w-3.5" /> RSS
          </a>
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline inline-flex items-center gap-1 transition-colors hover:text-primary"
            >
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
          )}
        </nav>

        <p className="text-[11px] text-muted-foreground/70">
          {renderFooterText(footerText ?? '', siteName, authorName)}
        </p>
      </div>
    </footer>
  );
}
