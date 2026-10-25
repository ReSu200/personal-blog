import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';

export const runtime = 'nodejs';

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  artist: z.string().max(100).nullable().optional(),
  coverUrl: z.string().max(500).nullable().optional(),
  duration: z.number().positive().nullable().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { response } = await guardAdmin();
  if (response) return response;

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '歌曲 ID 不合法' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  }

  const data = parsed.data;

  if (data.isDefault) {
    await db.update(songs).set({ isDefault: 0 });
  }

  await db
    .update(songs)
    .set({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.artist !== undefined ? { artist: data.artist } : {}),
      ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl } : {}),
      ...(data.duration !== undefined
        ? { duration: data.duration === null ? null : data.duration.toFixed(2) }
        : {}),
      ...(data.isDefault !== undefined ? { isDefault: data.isDefault ? 1 : 0 } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    })
    .where(eq(songs.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { response } = await guardAdmin();
  if (response) return response;

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '歌曲 ID 不合法' }, { status: 400 });
  }

  const rows = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  const song = rows[0];
  if (!song) {
    return NextResponse.json({ error: '歌曲不存在' }, { status: 404 });
  }

  if (song.filePath.startsWith('/music/')) {
    const filePath = path.join(process.cwd(), 'public', song.filePath.replace(/^\//, ''));
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件不存在时忽略，仍然删除数据库记录
    }
  }

  await db.delete(songs).where(eq(songs.id, id));
  return NextResponse.json({ ok: true });
}
