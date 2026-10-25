import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { guardAdmin } from '@/lib/guard';

export const runtime = 'nodejs';

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_SIZE = 2 * 1024 * 1024;

async function saveLogo(logoUrl: string | null) {
  const rows = await db.select({ id: settings.id }).from(settings).limit(1);
  if (rows[0]) {
    await db
      .update(settings)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(settings.id, rows[0].id));
  } else {
    await db.insert(settings).values({ logoUrl });
  }
}

async function getCurrentLogo() {
  const rows = await db.select({ logoUrl: settings.logoUrl }).from(settings).limit(1);
  return rows[0]?.logoUrl ?? null;
}

async function removeUploadedFile(logoUrl: string | null) {
  if (!logoUrl || !logoUrl.startsWith('/uploads/')) return;
  const filePath = path.join(process.cwd(), 'public', logoUrl);
  await fs.unlink(filePath).catch(() => {});
}

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
    return NextResponse.json({ error: '图片不能超过 2MB' }, { status: 400 });
  }

  const fileName = `logo-${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  const previous = await getCurrentLogo();
  const logoUrl = `/uploads/${fileName}`;
  await saveLogo(logoUrl);
  await removeUploadedFile(previous);

  return NextResponse.json({ ok: true, logoUrl });
}

export async function DELETE() {
  const { response } = await guardAdmin();
  if (response) return response;

  const previous = await getCurrentLogo();
  await saveLogo(null);
  await removeUploadedFile(previous);

  return NextResponse.json({ ok: true, logoUrl: null });
}
