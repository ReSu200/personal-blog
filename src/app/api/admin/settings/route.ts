import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';

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

  const values: Partial<typeof settings.$inferInsert> = {
    siteName: data.siteName ?? '青柠小站',
    siteDescription: data.siteDescription ?? '',
    aboutSite: data.aboutSite ?? '',
    footerText: data.footerText ?? '',
    musicAutoplay: data.musicAutoplay === undefined ? 1 : data.musicAutoplay ? 1 : 0,
    musicVolume: (data.musicVolume ?? 0.5).toFixed(2),
    updatedAt: new Date(),
  };

  if (rows[0]) {
    await db.update(settings).set(values).where(eq(settings.id, rows[0].id));
  } else {
    await db.insert(settings).values(values);
  }

  return NextResponse.json({ ok: true });
}
