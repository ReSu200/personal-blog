import type { Metadata } from 'next';
import './globals.css';
import 'highlight.js/styles/github-dark.css';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: {
    default: '青柠小站 · 个人博客',
    template: '%s · 青柠小站',
  },
  description: '记录技术、生活与思考的个人博客',
};

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
