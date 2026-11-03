import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { countUnreadCommentNotifications } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** 顶栏红点用：游客返回 0，避免前端额外判断登录态 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ count: 0 });
  const count = await countUnreadCommentNotifications(session.id);
  return NextResponse.json({ count });
}
