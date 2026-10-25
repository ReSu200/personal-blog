import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function guardAdmin() {
  const session = await requireAdmin();
  if (!session) {
    return { session: null, response: NextResponse.json({ error: '无权限，请使用管理员账号登录' }, { status: 403 }) };
  }
  return { session, response: null };
}
