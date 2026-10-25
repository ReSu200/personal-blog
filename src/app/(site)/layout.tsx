import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { getSettings, getUserById, listSongs } from '@/lib/queries';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MusicPlayer } from '@/components/music-player';
import { PLAYER_POSITION_COOKIE } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Cookie 值不能用逗号（RFC 6265 不允许），这里用短横线拼接
function parsePosition(raw: string | undefined) {
  if (!raw) return null;
  const [left, top] = raw.split('-').map(Number);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return { left, top };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // 歌曲列表改为服务端直出，避免每个页面再额外发一次 /api/music 请求
  const [settings, session, songs] = await Promise.all([getSettings(), getSession(), listSongs()]);
  const profile = session ? await getUserById(session.id) : null;

  // 播放器拖拽位置存在 Cookie 中，服务端直接渲染，避免首屏从默认角落跳到保存位置
  const savedPosition = parsePosition(cookies().get(PLAYER_POSITION_COOKIE)?.value);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        siteName={settings.siteName}
        logoUrl={settings.logoUrl}
        session={session}
        displayName={profile?.displayName ?? session?.username ?? ''}
        avatarUrl={profile?.avatarUrl ?? null}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-24 lg:px-8">
        {children}
      </main>
      <SiteFooter
        siteName={settings.siteName}
        siteDescription={settings.siteDescription}
        authorName={settings.authorName}
        githubUrl={settings.githubUrl}
        footerText={settings.footerText}
      />
      <MusicPlayer
        songs={songs.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          filePath: song.filePath,
          coverUrl: song.coverUrl,
          duration: song.duration,
          isDefault: song.isDefault,
        }))}
        autoplay={settings.musicAutoplay === 1}
        volume={Number(settings.musicVolume)}
        initialPosition={savedPosition}
      />
    </div>
  );
}
