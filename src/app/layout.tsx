import type { Metadata } from 'next';
import './globals.css';
import 'highlight.js/styles/github-dark.css';
import { ThemeProvider } from '@/components/theme-provider';
import { getSettings } from '@/lib/queries';

// 站点标题与描述取自后台设置，修改站点名称后标签页标题会同步更新
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = settings.siteName?.trim() || '青柠小站';
  const description =
    settings.siteDescription?.trim() || '记录技术、生活与思考的个人博客';

  return {
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
