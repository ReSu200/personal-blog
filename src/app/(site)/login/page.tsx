import { AuthForm } from '@/components/auth-form';

export const metadata = { title: '登录' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <AuthForm mode="login" redirectTo={redirect || ''} />;
}
