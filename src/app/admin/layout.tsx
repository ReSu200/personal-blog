import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin-shell';
import { getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 鉴权与站点设置互不依赖，并行执行
  const [session, settings] = await Promise.all([requireAdmin(), getSettings()]);
  if (!session) redirect('/login?redirect=/admin');

  return (
    <AdminShell username={session.username} siteName={settings.siteName} logoUrl={settings.logoUrl}>
      {children}
    </AdminShell>
  );
}
