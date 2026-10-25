import { headingId } from '@/lib/utils';

export type TocItem = { level: 2 | 3; text: string; id: string };

export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  let inCodeBlock = false;

  for (const line of markdown.split('\n')) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const text = match[2].replace(/[*`_~]/g, '').trim();
    if (!text) continue;
    items.push({ level: match[1].length as 2 | 3, text, id: headingId(text) });
  }

  return items;
}
