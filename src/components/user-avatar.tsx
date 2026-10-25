import { cn } from '@/lib/utils';

/** 4 款内置头像，对应 public/avatars/avatar-1.png ~ avatar-4.png */
export const AVATAR_PRESETS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'];

export function presetAvatarSrc(preset: string) {
  return `/avatars/${preset}.png`;
}

/** 早期版本使用 fish-1 ~ fish-6 标识，按序号折算到四款内置头像 */
export function normalizeAvatar(avatar: string) {
  if (avatar.startsWith('fish-')) {
    const index = (Number(avatar.slice(5)) || 1) - 1;
    return AVATAR_PRESETS[index % AVATAR_PRESETS.length];
  }
  return avatar;
}

export function UserAvatar({
  avatar,
  name,
  className,
}: {
  avatar?: string | null;
  name: string;
  className?: string;
}) {
  const base = cn('shrink-0 overflow-hidden rounded-full', className);
  const normalized = avatar ? normalizeAvatar(avatar) : '';

  if (AVATAR_PRESETS.includes(normalized)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={presetAvatarSrc(normalized)}
        alt={name}
        decoding="async"
        className={cn(base, 'bg-primary/10 object-cover')}
      />
    );
  }

  if (avatar && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/'))) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt={name} decoding="async" className={cn(base, 'object-cover')} />;
  }

  return (
    <div className={cn(base, 'flex items-center justify-center bg-primary/10 font-semibold text-primary')}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
