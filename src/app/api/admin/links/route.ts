import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, max } from 'drizzle-orm';
import { db } from '@/db';
import { friendLinks } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';

/** 友链地址支持 http 与 https 两种协议 */
const webUrl = z
  .string()
  .trim()
  .max(500, '链接最多 500 个字符')
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, '链接需以 http:// 或 https:// 开头');

const schema = z.object({
  name: z.string().trim().min(1, '名称不能为空').max(50, '名称最多 50 个字符'),
  url: webUrl,
  description: z.string().trim().max(120, '简介最多 120 个字符').optional(),
  sortOrder: z.number().int('排序需为整数').optional(),
});

export async function POST(req: Request) {
  const { response } = await guardAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '参数不合法' },
      { status: 400 },
    );
  }

  const { name, url, description, sortOrder } = parsed.data;

  const duplicate = await db
    .select({ id: friendLinks.id })
    .from(friendLinks)
    .where(eq(friendLinks.url, url))
    .limit(1);
  if (duplicate[0]) {
    return NextResponse.json({ error: '该链接已存在' }, { status: 409 });
  }

  const maxRow = await db.select({ value: max(friendLinks.sortOrder) }).from(friendLinks);
  const nextOrder = sortOrder ?? Number(maxRow[0]?.value ?? -1) + 1;

  const inserted = await db
    .insert(friendLinks)
    .values({
      name,
      url,
      description: description || null,
      sortOrder: nextOrder,
      isVisible: 1,
    })
    .returning({ id: friendLinks.id });

  return NextResponse.json({ ok: true, id: inserted[0].id });
}
