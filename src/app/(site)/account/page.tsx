import { redirect } from 'next/navigation';
import { AccountForm } from '@/components/account-form';
import { normalizeAvatar } from '@/components/user-avatar';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = { title: '个人中心' };

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/account');

  const user = await getUserById(session.id);
  if (!user) redirect('/login');

  return (
    <AccountForm
      user={{
        username: user.username,
        displayName: user.displayName ?? user.username,
        avatarUrl: normalizeAvatar(user.avatarUrl ?? 'avatar-1'),
        githubUrl: user.githubUrl ?? '',
        qq: user.qq ?? '',
        wechat: user.wechat ?? '',
        role: user.role,
        joinedAt: formatDate(user.createdAt),
      }}
    />
  );
}
