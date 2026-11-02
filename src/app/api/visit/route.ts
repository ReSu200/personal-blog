import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 递增站点访问量并返回最新值 */
export async function POST() {
  try {
    // 单条 UPDATE ... RETURNING 完成自增并拿到结果，省掉一次额外查询
    const [updated] = await db
      .update(settings)
      .set({ visitCount: sql`${settings.visitCount} + 1` })
      .returning({ visitCount: settings.visitCount });

    if (updated) {
      return NextResponse.json({ count: Number(updated.visitCount) });
    }

    // 还没有设置行时初始化访问量
    const [inserted] = await db
      .insert(settings)
      .values({ visitCount: 1 })
      .returning({ visitCount: settings.visitCount });

    return NextResponse.json({ count: Number(inserted?.visitCount ?? 1) });
  } catch (error) {
    console.error('[api/visit] 访问量更新失败', error);
    return NextResponse.json({ error: '统计失败' }, { status: 500 });
  }
}
