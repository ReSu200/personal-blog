'use client';

import { useRef, useState } from 'react';
import { Check, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
import { Button, Card, Input, Label } from '@/components/ui';
import { AVATAR_PRESETS, UserAvatar, presetAvatarSrc } from '@/components/user-avatar';
import { cn } from '@/lib/utils';

type Props = {
  user: {
    username: string;
    displayName: string;
    avatarUrl: string;
    githubUrl: string;
    qq: string;
    wechat: string;
    role: 'user' | 'admin';
    joinedAt: string;
  };
};

const MAX_AVATAR_SIZE = 1024 * 1024;

export function AccountForm({ user }: Props) {
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [githubUrl, setGithubUrl] = useState(user.githubUrl);
  const [qq, setQq] = useState(user.qq);
  const [wechat, setWechat] = useState(user.wechat);
  const isPreset = AVATAR_PRESETS.includes(user.avatarUrl);
  const [avatar, setAvatar] = useState(isPreset ? user.avatarUrl : 'avatar-1');
  const [customAvatar, setCustomAvatar] = useState(isPreset ? '' : user.avatarUrl);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const effectiveAvatar = customAvatar.trim() || avatar;

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError('');
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('头像不能超过 1MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/account/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error ?? '上传失败');
        return;
      }
      setCustomAvatar(data.url);
    } catch {
      setAvatarError('网络异常，请稍后再试');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    setProfileError('');
    setProfileMessage('');
    if (!displayName.trim()) {
      setProfileError('昵称不能为空');
      return;
    }
    setProfileLoading(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          displayName,
          avatar: effectiveAvatar,
          githubUrl: githubUrl.trim() || null,
          qq: qq.trim() || null,
          wechat: wechat.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error ?? '保存失败');
        return;
      }
      setProfileMessage('资料保存成功，正在刷新…');
      // 账号信息变更后整页刷新，确保侧边栏与评论区的头像、昵称同步
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      setProfileError('网络异常，请稍后再试');
    } finally {
      setProfileLoading(false);
    }
  }

  async function savePassword() {
    setPasswordError('');
    setPasswordMessage('');
    if (!currentPassword) {
      setPasswordError('请输入当前密码');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? '修改失败');
        return;
      }
      setPasswordMessage('密码修改成功，下次登录请使用新密码');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('网络异常，请稍后再试');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">个人中心</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user.role === 'admin' ? '管理员账号' : '注册用户'} · 加入于 {user.joinedAt}
        </p>
      </div>

      <Card className="rounded-3xl p-6">
        <h2 className="text-base font-semibold">头像</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          选择一个内置头像，或上传自己的图片（PNG / JPG / WEBP，1MB 以内）
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <UserAvatar avatar={effectiveAvatar} name={displayName || username} className="h-16 w-16 ring-2 ring-primary/20" />
          <div className="flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAvatar(preset);
                  setCustomAvatar('');
                }}
                className={cn(
                  'relative h-12 w-12 rounded-full transition-all',
                  !customAvatar && avatar === preset
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-card'
                    : 'opacity-80 hover:opacity-100',
                )}
                aria-label={`选择头像 ${preset}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={presetAvatarSrc(preset)}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
                {!customAvatar && avatar === preset && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
          >
            {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            上传头像
          </Button>
          {customAvatar && <span className="text-xs text-muted-foreground">已使用上传的头像</span>}
        </div>
        {avatarError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{avatarError}</p>}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={uploadAvatar}
        />
      </Card>

      <Card className="rounded-3xl p-6">
        <h2 className="text-base font-semibold">基本资料</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="displayName">昵称</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              placeholder="展示在评论区的名字"
            />
          </div>
          <div>
            <Label htmlFor="username">用户名（登录账号）</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              placeholder="3-20 个字符"
            />
          </div>
          {user.role === 'admin' && (
            <>
              <div className="sm:col-span-2">
                <Label htmlFor="githubUrl">GitHub 链接（可选）</Label>
                <Input
                  id="githubUrl"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://github.com/yourname"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  管理员的昵称、头像与联系方式会作为博主信息展示在「关于我」与右侧作者卡
                </p>
              </div>
              <div>
                <Label htmlFor="qq">QQ（可选）</Label>
                <Input
                  id="qq"
                  value={qq}
                  onChange={(e) => setQq(e.target.value)}
                  maxLength={20}
                  placeholder="123456789"
                />
              </div>
              <div>
                <Label htmlFor="wechat">微信（可选）</Label>
                <Input
                  id="wechat"
                  value={wechat}
                  onChange={(e) => setWechat(e.target.value)}
                  maxLength={50}
                  placeholder="微信号 / 手机号"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            {profileMessage && <p className="text-xs text-emerald-600 dark:text-emerald-400">{profileMessage}</p>}
            {profileError && <p className="text-xs text-red-600 dark:text-red-400">{profileError}</p>}
          </div>
          <Button onClick={saveProfile} disabled={profileLoading}>
            {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存资料
          </Button>
        </div>
      </Card>

      <Card className="rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> 修改密码
        </h2>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="currentPassword">当前密码</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="至少 6 位"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            {passwordMessage && <p className="text-xs text-emerald-600 dark:text-emerald-400">{passwordMessage}</p>}
            {passwordError && <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
          </div>
          <Button variant="outline" onClick={savePassword} disabled={passwordLoading}>
            {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            修改密码
          </Button>
        </div>
      </Card>
    </div>
  );
}
