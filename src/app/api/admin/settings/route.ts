import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';
import { CACHE_TAGS } from '@/lib/queries';

const schema = z.object({
  siteName: z.string().trim().max(100).optional(),
  siteDescription: z.string().trim().max(500).optional(),
  aboutSite: z.string().trim().max(1000).optional(),
  footerText: z.string().trim().max(300).optional(),
  musicAutoplay: z.boolean().optional(),
  musicVolume: z.number().min(0).max(1).optional(),
});

export async function PUT(req: Request) {
  const { response } = await guardAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  }

  const data = parsed.data;
  const rows = await db.select({ id: settings.id }).from(settings).limit(1);

  // 只更新请求里出现的字段，避免局部保存（如音乐页只提交播放器设置）覆盖其他配置
  const values: Partial<typeof settings.$inferInsert> = { updatedAt: new Date() };
  if (data.siteName !== undefined) values.siteName = data.siteName;
  if (data.siteDescription !== undefined) values.siteDescription = data.siteDescription;
  if (data.aboutSite !== undefined) values.aboutSite = data.aboutSite;
  if (data.footerText !== undefined) values.footerText = data.footerText;
  if (data.musicAutoplay !== undefined) values.musicAutoplay = data.musicAutoplay ? 1 : 0;
  if (data.musicVolume !== undefined) values.musicVolume = data.musicVolume;

  if (rows[0]) {
    await db.update(settings).set(values).where(eq(settings.id, rows[0].id));
  } else {
    await db.insert(settings).values(values);
  }

  revalidateTag(CACHE_TAGS.settings, 'max');
  return NextResponse.json({ ok: true });
}
