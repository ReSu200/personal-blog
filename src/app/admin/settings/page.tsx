import { SettingsForm } from '@/components/settings-form';
import { getSettings } from '@/lib/queries';
import { DEFAULT_ABOUT_SITE } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = { title: '站点设置' };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">站点设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          修改站点标识与音乐播放行为；博主昵称、头像与 GitHub 请在个人中心维护
        </p>
      </div>

      <SettingsForm
        initial={{
          siteName: settings.siteName,
          siteDescription: settings.siteDescription,
          // 数据库为空时 getSettings 会回退默认文案；输入框里应显示空值，让默认文案以占位提示呈现，用户无需手动删除
          aboutSite: settings.aboutSite === DEFAULT_ABOUT_SITE ? '' : settings.aboutSite,
          footerText: settings.footerText,
          logoUrl: settings.logoUrl,
          heroBackground: settings.heroBackground,
          heroPosition: settings.heroPosition,
          featuredCover: settings.featuredCover,
          featuredCoverPosition: settings.featuredCoverPosition,
          latestCover: settings.latestCover,
          latestCoverPosition: settings.latestCoverPosition,
          musicAutoplay: settings.musicAutoplay === 1,
          musicVolume: Number(settings.musicVolume),
        }}
      />
    </div>
  );
}
