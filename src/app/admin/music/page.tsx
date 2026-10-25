import { MusicManager } from '@/components/music-manager';
import { listSongs } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = { title: '音乐管理' };

export default async function AdminMusicPage() {
  const songs = await listSongs();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">音乐管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          上传背景音乐、设置默认播放歌曲与播放顺序，前台左下角播放器会自动同步
        </p>
      </div>

      <MusicManager
        songs={songs.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          filePath: song.filePath,
          coverUrl: song.coverUrl,
          duration: song.duration,
          isDefault: song.isDefault,
          sortOrder: song.sortOrder,
        }))}
      />
    </div>
  );
}
