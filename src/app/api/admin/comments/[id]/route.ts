import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { comments } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';
import { CACHE_TAGS } from '@/lib/queries';

const schema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
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
    return NextResponse.json({ error: '评论 ID 不合法' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '状态不合法' }, { status: 400 });
  }

  await db.update(comments).set({ status: parsed.data.status }).where(eq(comments.id, id));
  // 立即过期，保证审核后刷新即可见（'max' 会先返回旧数据）
  revalidateTag(CACHE_TAGS.stats, { expire: 0 });
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
    return NextResponse.json({ error: '评论 ID 不合法' }, { status: 400 });
  }

  await db.delete(comments).where(eq(comments.id, id));
  // 立即过期，保证删除后刷新即可见（'max' 会先返回旧数据）
  revalidateTag(CACHE_TAGS.stats, { expire: 0 });
  return NextResponse.json({ ok: true });
}
