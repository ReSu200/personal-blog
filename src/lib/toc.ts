import { headingId } from '@/lib/utils';

export type TocItem = { level: 2 | 3; text: string; id: string };

// 正则提到模块顶层，避免每行目录解析都重新创建
const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/;
const MARKUP_RE = /[*`_~]/g;

export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  let inCodeBlock = false;

  for (const line of markdown.split('\n')) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = HEADING_RE.exec(line);
    if (!match) continue;

    const text = match[2].replace(MARKUP_RE, '').trim();
    if (!text) continue;
    items.push({ level: match[1].length as 2 | 3, text, id: headingId(text) });
  }

  return items;
}
