import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 递增站点访问量并返回最新值 */
export async function POST() {
  try {
    const rows = await db.select({ id: settings.id }).from(settings).limit(1);

    if (!rows[0]) {
      await db.insert(settings).values({ visitCount: 1 });
      return NextResponse.json({ count: 1 });
    }

    await db
      .update(settings)
      .set({ visitCount: sql`${settings.visitCount} + 1` })
      .where(eq(settings.id, rows[0].id));

    const [row] = await db
      .select({ visitCount: settings.visitCount })
      .from(settings)
      .where(eq(settings.id, rows[0].id))
      .limit(1);

    return NextResponse.json({ count: Number(row?.visitCount ?? 0) });
  } catch {
    return NextResponse.json({ error: '统计失败' }, { status: 500 });
  }
}
