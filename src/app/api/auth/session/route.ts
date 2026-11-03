import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/queries';

export const dynamic = 'force-dynamic';

// 前台页面不再在服务端读取 cookies；登录态由客户端按需拉取
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const profile = await getUserById(session.id);
  return NextResponse.json(
    {
      user: {
        ...session,
        displayName: profile?.displayName ?? session.username,
        avatarUrl: profile?.avatarUrl ?? null,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
