import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const [settings, rows] = await Promise.all([
    getSettings(),
    db
      .select({
        title: posts.title,
        slug: posts.slug,
        summary: posts.summary,
        publishedAt: posts.publishedAt,
      })
      .from(posts)
      .where(eq(posts.status, 'published'))
      .orderBy(desc(posts.publishedAt))
      .limit(20),
  ]);

  const items = rows
    .map((post) => {
      const link = `${baseUrl}/posts/${post.slug}`;
      const pubDate = (post.publishedAt ?? new Date()).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.summary ?? '')}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(settings.siteName)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(settings.siteDescription)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
