import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { friendLinks } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';
import { CACHE_TAGS } from '@/lib/queries';

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
  name: z.string().trim().min(1, '名称不能为空').max(50, '名称最多 50 个字符').optional(),
  url: webUrl.optional(),
  description: z.string().trim().max(120, '简介最多 120 个字符').nullable().optional(),
  sortOrder: z.number().int('排序需为整数').optional(),
  isVisible: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await guardAdmin();
  if (response) return response;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '友链 ID 不合法' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '参数不合法' },
      { status: 400 },
    );
  }

  const rows = await db.select({ id: friendLinks.id }).from(friendLinks).where(eq(friendLinks.id, id)).limit(1);
  if (!rows[0]) {
    return NextResponse.json({ error: '友链不存在' }, { status: 404 });
  }

  const data = parsed.data;

  if (data.url !== undefined) {
    const duplicate = await db
      .select({ id: friendLinks.id })
      .from(friendLinks)
      .where(and(eq(friendLinks.url, data.url), ne(friendLinks.id, id)))
      .limit(1);
    if (duplicate[0]) {
      return NextResponse.json({ error: '该链接已存在' }, { status: 409 });
    }
  }

  await db
    .update(friendLinks)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.description !== undefined
        ? { description: data.description || null }
        : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isVisible !== undefined ? { isVisible: data.isVisible ? 1 : 0 } : {}),
    })
    .where(eq(friendLinks.id, id));

  revalidateTag(CACHE_TAGS.links, 'max');
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await guardAdmin();
  if (response) return response;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '友链 ID 不合法' }, { status: 400 });
  }

  const rows = await db.select({ id: friendLinks.id }).from(friendLinks).where(eq(friendLinks.id, id)).limit(1);
  if (!rows[0]) {
    return NextResponse.json({ error: '友链不存在' }, { status: 404 });
  }

  await db.delete(friendLinks).where(eq(friendLinks.id, id));
  revalidateTag(CACHE_TAGS.links, 'max');
  return NextResponse.json({ ok: true });
}
