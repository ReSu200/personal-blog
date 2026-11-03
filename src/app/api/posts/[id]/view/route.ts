import { NextResponse } from 'next/server';
import { incrementView } from '@/lib/queries';

// 阅读计数改为客户端上报：页面即使命中缓存，统计也不会失效
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: '文章 ID 不合法' }, { status: 400 });
  }

  await incrementView(id);
  return NextResponse.json({ ok: true });
}
