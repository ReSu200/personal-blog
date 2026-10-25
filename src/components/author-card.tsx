import Link from 'next/link';
import { ArrowRight, Github, MessageCircle, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui';
import { HeroCover } from '@/components/hero-cover';
import { UserAvatar } from '@/components/user-avatar';

type Props = {
  name: string;
  avatar: string | null;
  description: string;
  githubUrl: string | null;
  qq: string | null;
  wechat: string | null;
  heroBackground: string | null;
  heroPosition: string;
};

/** 博主信息卡：首页右侧栏与文章详情页左栏共用，保证两处展示一致 */
export function AuthorCard({
  name,
  avatar,
  description,
  githubUrl,
  qq,
  wechat,
  heroBackground,
  heroPosition,
}: Props) {
  return (
    <Card className="overflow-hidden">
      <HeroCover image={heroBackground} position={heroPosition} className="h-24" />
      <div className="px-5 pb-5 text-center">
        <div className="relative z-10 -mt-10 mx-auto h-[72px] w-[72px] overflow-hidden rounded-full border-4 border-card bg-card shadow-lg ring-1 ring-border/50">
          <UserAvatar avatar={avatar} name={name} className="h-full w-full" />
        </div>
        <p className="mt-3 font-serif text-lg font-semibold">{name}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Github className="h-3 w-3" /> GitHub
            </a>
          ) : null}
          {qq ? (
            <span
              className="inline-flex cursor-default select-none items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              title={`QQ：${qq}`}
            >
              <MessageSquare className="h-3 w-3" /> QQ
            </span>
          ) : null}
          {wechat ? (
            <span
              className="inline-flex cursor-default select-none items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              title={`微信：${wechat}`}
            >
              <MessageCircle className="h-3 w-3" /> 微信
            </span>
          ) : null}
        </div>

        <Link
          href="/about"
          className="mt-4 inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
        >
          了解更多 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
