import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { guardAdmin } from '@/lib/guard';

export const runtime = 'nodejs';

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_SIZE = 4 * 1024 * 1024;

/** 后台上传图片（文章封面等），返回可访问地址 */
export async function POST(req: Request) {
  const { response } = await guardAdmin();
  if (response) return response;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '请选择要上传的图片' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: '仅支持 PNG / JPG / WEBP / GIF 格式' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '图片不能超过 4MB' }, { status: 400 });
  }

  const fileName = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ ok: true, url: `/uploads/${fileName}` });
}
