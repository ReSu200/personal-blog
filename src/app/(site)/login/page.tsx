import { AuthForm } from '@/components/auth-form';

export const metadata = { title: '登录' };

export default function LoginPage({ searchParams }: { searchParams: { redirect?: string } }) {
  return <AuthForm mode="login" redirectTo={searchParams.redirect || ''} />;
}
