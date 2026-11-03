import { getSettings, listSongs } from '@/lib/queries';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MusicPlayerLazy } from '@/components/music-player-lazy';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // 登录态与播放器位置改由客户端读取：布局不再访问 cookies，前台页面才可启用路由缓存
  const [settings, songs] = await Promise.all([getSettings(), listSongs()]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader siteName={settings.siteName} logoUrl={settings.logoUrl} />
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
      <MusicPlayerLazy
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
      />
    </div>
  );
}
