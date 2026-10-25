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

const MAX_SIZE = 4 * 1024 * 1024;

/** 站点级图片设置：hero = 首页背景板，featured = 推荐位默认封面，latest = 最新文章默认封面 */
const KINDS = {
  hero: {
    column: 'heroBackground',
    positionColumn: 'heroPosition',
    prefix: 'hero',
    label: '背景图',
  },
  featured: {
    column: 'featuredCover',
    positionColumn: 'featuredCoverPosition',
    prefix: 'featured',
    label: '推荐位封面',
  },
  latest: {
    column: 'latestCover',
    positionColumn: 'latestCoverPosition',
    prefix: 'latest',
    label: '最新文章封面',
  },
} as const;

type Kind = keyof typeof KINDS;

function parseKind(req: Request): Kind | null {
  const kind = new URL(req.url).searchParams.get('kind');
  return kind === 'hero' || kind === 'featured' || kind === 'latest' ? kind : null;
}

/** 读取目标行；无数据时返回空对象 */
async function readRow() {
  const rows = await db.select().from(settings).limit(1);
  return rows[0] ?? null;
}

/** 写入设置行；调用方已读过行时可直接传入，避免重复查询 */
async function persist(patch: Record<string, unknown>, known?: Awaited<ReturnType<typeof readRow>>) {
  const row = known ?? (await readRow());
  if (row) {
    await db
      .update(settings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(settings.id, row.id));
  } else {
    await db.insert(settings).values(patch as never);
  }
}

async function removeUploadedFile(url: string | null) {
  if (!url || !url.startsWith('/uploads/')) return;
  await fs.unlink(path.join(process.cwd(), 'public', url)).catch(() => {});
}

export async function POST(req: Request) {
  const kind = parseKind(req);
  if (!kind) {
    return NextResponse.json({ error: '未知的图片类型' }, { status: 400 });
  }

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
    return NextResponse.json({ error: `${KINDS[kind].label}不能超过 4MB` }, { status: 400 });
  }

  const fileName = `${KINDS[kind].prefix}-${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });

  // 落盘与读取旧值互不依赖，并行执行
  const [, row] = await Promise.all([
    fs.writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer())),
    readRow(),
  ]);
  const previous = row ? ((row[KINDS[kind].column] as string | null) ?? null) : null;
  const url = `/uploads/${fileName}`;
  await persist({ [KINDS[kind].column]: url }, row);
  await removeUploadedFile(previous);

  return NextResponse.json({ ok: true, url });
}

/** 调整封面裁切焦点：body 为 { x, y }，取值 0~100 的百分比 */
export async function PUT(req: Request) {
  const kind = parseKind(req);
  if (!kind || !KINDS[kind].positionColumn) {
    return NextResponse.json({ error: '该图片不支持位置调整' }, { status: 400 });
  }

  const { response } = await guardAdmin();
  if (response) return response;

  const body = (await req.json().catch(() => null)) as { x?: unknown; y?: unknown } | null;
  const x = Math.round(Number(body?.x));
  const y = Math.round(Number(body?.y));
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
    return NextResponse.json({ error: '位置参数无效' }, { status: 400 });
  }

  const position = `${x}% ${y}%`;
  await persist({ [KINDS[kind].positionColumn]: position });

  return NextResponse.json({ ok: true, position });
}

export async function DELETE(req: Request) {
  const kind = parseKind(req);
  if (!kind) {
    return NextResponse.json({ error: '未知的图片类型' }, { status: 400 });
  }

  const { response } = await guardAdmin();
  if (response) return response;

  const row = await readRow();
  const previous = row ? ((row[KINDS[kind].column] as string | null) ?? null) : null;
  const patch: Record<string, unknown> = { [KINDS[kind].column]: null };
  if (KINDS[kind].positionColumn) {
    patch[KINDS[kind].positionColumn] = '50% 50%';
  }
  await persist(patch, row);
  await removeUploadedFile(previous);

  return NextResponse.json({ ok: true, url: null });
}
