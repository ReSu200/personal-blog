'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Music2,
  Save,
  Settings2,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge, Button, Card, Input, Label } from '@/components/ui';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { formatDuration } from '@/lib/utils';

type Song = {
  id: number;
  title: string;
  artist: string | null;
  filePath: string;
  coverUrl: string | null;
  duration: number | null;
  isDefault: number;
  sortOrder: number;
};

/** 通过 <audio> 读取本地文件时长（秒） */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const value = Number.isFinite(audio.duration) ? audio.duration : null;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

export function MusicManager({
  songs,
  autoplay: initialAutoplay,
  volume: initialVolume,
}: {
  songs: Song[];
  autoplay: boolean;
  volume: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Song | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const [autoplay, setAutoplay] = useState(initialAutoplay);
  const [volume, setVolume] = useState(initialVolume);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackMessage, setPlaybackMessage] = useState('');
  const [playbackError, setPlaybackError] = useState('');

  /** 只提交播放器相关字段，站点设置接口按字段做局部更新 */
  async function savePlayback() {
    setPlaybackError('');
    setPlaybackMessage('');
    setPlaybackLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicAutoplay: autoplay, musicVolume: volume }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlaybackError(data.error ?? '保存失败');
        return;
      }
      setPlaybackMessage('播放器设置已保存');
      router.refresh();
    } catch {
      setPlaybackError('网络异常，请稍后再试');
    } finally {
      setPlaybackLoading(false);
    }
  }

  async function upload() {
    setError('');
    setMessage('');
    if (!file) {
      setError('请先选择音频文件');
      return;
    }
    setLoading(true);
    try {
      const duration = await readDuration(file);
      const form = new FormData();
      form.append('file', file);
      form.append('title', title || file.name.replace(/\.[^.]+$/, ''));
      form.append('artist', artist);
      if (duration) form.append('duration', duration.toFixed(2));

      const res = await fetch('/api/admin/music/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '上传失败');
        return;
      }
      setFile(null);
      setTitle('');
      setArtist('');
      if (fileRef.current) fileRef.current.value = '';
      setMessage('上传成功');
      router.refresh();
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  async function setDefault(id: number) {
    setLoading(true);
    try {
      await fetch(`/api/admin/music/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function move(song: Song, direction: -1 | 1) {
    const sorted = [...songs].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((item) => item.id === song.id);
    const target = sorted[index + direction];
    if (!target) return;

    setLoading(true);
    try {
      await Promise.all([
        fetch(`/api/admin/music/${song.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        fetch(`/api/admin/music/${target.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: song.sortOrder }),
        }),
      ]);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(song: Song) {
    setDeleteError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/music/${song.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error ?? '删除失败');
        return;
      }
      setPendingDelete(null);
      router.refresh();
    } catch {
      setDeleteError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  const sortedSongs = [...songs].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">歌曲列表（{songs.length}）</h2>
        </div>
        <div className="divide-y divide-border">
          {sortedSongs.map((song, index) => (
            <div key={song.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                {song.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={song.coverUrl} alt={song.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <Music2 className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{song.title}</p>
                  {song.isDefault === 1 && (
                    <Badge className="gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <Star className="h-3 w-3" /> 默认播放
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {song.artist || '未知艺术家'} · {formatDuration(song.duration)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={loading || index === 0}
                  onClick={() => move(song, -1)}
                  title="上移"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={loading || index === sortedSongs.length - 1}
                  onClick={() => move(song, 1)}
                  title="下移"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading || song.isDefault === 1}
                  onClick={() => setDefault(song.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> 设为默认
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPendingDelete(song)}
                  disabled={loading}
                  title="删除"
                  aria-label={`删除歌曲 ${song.title}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          {songs.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">还没有歌曲，右侧上传第一首吧</p>
          )}
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Upload className="h-4 w-4 text-primary" /> 上传歌曲
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">支持 MP3 / WAV / OGG / FLAC，单个文件不超过 50MB</p>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="music-file">音频文件</Label>
              <input
                id="music-file"
                ref={fileRef}
                type="file"
                accept=".mp3,.wav,.ogg,.flac,audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-lg border border-input bg-card px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:text-primary"
              />
            </div>
            <div>
              <Label htmlFor="music-title">歌曲名（可选）</Label>
              <Input
                id="music-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="默认使用文件名"
              />
            </div>
            <div>
              <Label htmlFor="music-artist">艺术家（可选）</Label>
              <Input
                id="music-artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Demo Studio"
              />
            </div>

            <Button className="w-full" onClick={upload} disabled={loading || !file}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              上传
            </Button>

            {message && <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="h-4 w-4 text-primary" /> 播放器默认行为
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">修改后需点击保存，前台左下角播放器会随之同步</p>

          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                进入页面自动播放
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  浏览器可能拦截有声自动播放，此时会静音播放并提示用户开启
                </span>
              </span>
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => setAutoplay(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
            </label>

            <div>
              <Label htmlFor="musicVolume">默认音量：{Math.round(volume * 100)}%</Label>
              <input
                id="musicVolume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[hsl(var(--primary))]"
              />
            </div>

            <Button className="w-full" onClick={savePlayback} disabled={playbackLoading}>
              {playbackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存播放器设置
            </Button>

            {playbackMessage && <p className="text-xs text-emerald-600 dark:text-emerald-400">{playbackMessage}</p>}
            {playbackError && <p className="text-xs text-red-600 dark:text-red-400">{playbackError}</p>}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`确定删除《${pendingDelete?.title ?? ''}》吗？`}
        description="本地音频文件也会一并删除，且不可恢复。"
        error={deleteError}
        loading={loading}
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete);
        }}
        onCancel={() => {
          if (loading) return;
          setPendingDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
}
