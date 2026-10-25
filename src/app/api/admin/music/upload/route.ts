import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';

export const runtime = 'nodejs';

const ALLOWED_TYPES: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
};

const ALLOWED_EXT = ['.mp3', '.wav', '.ogg', '.flac'];
const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request) {
  const { response } = await guardAdmin();
  if (response) return response;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '请选择要上传的音频文件' }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  const typeAllowed = Boolean(ALLOWED_TYPES[file.type]);
  const extAllowed = ALLOWED_EXT.includes(ext);

  if (!typeAllowed && !extAllowed) {
    return NextResponse.json({ error: '仅支持 MP3 / WAV / OGG / FLAC 格式' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '文件不能超过 50MB' }, { status: 400 });
  }

  const finalExt = extAllowed ? ext : ALLOWED_TYPES[file.type] || '.mp3';
  const fileName = `${randomUUID()}${finalExt}`;
  const dir = path.join(process.cwd(), 'public', 'music');
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, fileName), buffer);

  const title = String(form.get('title') ?? '').trim() || file.name.replace(/\.[^.]+$/, '');
  const artist = String(form.get('artist') ?? '').trim() || null;
  const coverUrl = String(form.get('coverUrl') ?? '').trim() || null;
  const durationRaw = String(form.get('duration') ?? '').trim();
  const duration = Number.isFinite(Number(durationRaw)) && Number(durationRaw) > 0
    ? Number(durationRaw).toFixed(2)
    : null;

  const inserted = await db
    .insert(songs)
    .values({
      title: title.slice(0, 200),
      artist: artist?.slice(0, 100) ?? null,
      filePath: `/music/${fileName}`,
      coverUrl,
      duration,
      isDefault: 0,
      sortOrder: Date.now() % 100000,
    })
    .$returningId();

  return NextResponse.json({ ok: true, id: inserted[0].id, filePath: `/music/${fileName}` });
}
