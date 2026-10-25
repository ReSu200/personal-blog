import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [rows, settings] = await Promise.all([
    db.select().from(songs).orderBy(asc(songs.sortOrder), asc(songs.id)),
    getSettings(),
  ]);

  return NextResponse.json({
    songs: rows.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      filePath: song.filePath,
      coverUrl: song.coverUrl,
      duration: song.duration,
      isDefault: song.isDefault,
    })),
    autoplay: settings.musicAutoplay === 1,
    volume: Number(settings.musicVolume),
  });
}
