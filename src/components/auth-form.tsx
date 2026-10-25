'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { Button, Card, Input, Label } from '@/components/ui';

type Props = {
  redirectTo: string;
  mode: 'login' | 'register';
};

export function AuthForm({ redirectTo, mode }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  const refreshCaptcha = useCallback(() => {
    setCaptchaKey(Date.now());
    setCaptcha('');
  }, []);

  useEffect(() => {
    if (isLogin) setCaptchaKey(Date.now());
  }, [isLogin]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isLogin
            ? { username, password, captcha }
            : { username, password, confirmPassword },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '操作失败');
        if (isLogin) refreshCaptcha();
        return;
      }
      const isAdmin = data.user?.role === 'admin';
      // 整页跳转，确保侧边栏账号区、评论头像等同步更新
      window.location.replace(redirectTo || (isAdmin ? '/admin' : '/'));
    } catch {
      setError('网络异常，请稍后再试');
      if (isLogin) refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto mt-4 w-full max-w-md sm:mt-10">
      {/* 背景光斑，让表单浮在白纸之上 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 bottom-8 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl"
      />

      <div className="relative">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 font-serif text-lg font-bold text-white shadow-sm">
            {isLogin ? '登' : '注'}
          </div>
          <p className="eyebrow mt-4">{isLogin ? 'Welcome back' : 'Join us'}</p>
          <h1 className="mt-1.5 font-serif text-2xl font-bold">
            {isLogin ? '登录账号' : '注册新账号'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isLogin ? '使用用户名、密码与验证码登录' : '只需要用户名和密码，无需邮箱或手机号'}
          </p>
        </div>

        <Card className="rounded-3xl p-6 sm:p-7">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="3-20 个字符"
                  autoComplete="username"
                  className="rounded-xl pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6-32 个字符"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="rounded-xl pl-9"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="confirmPassword">确认密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="rounded-xl pl-9"
                    required
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div>
                <Label htmlFor="captcha">验证码</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="captcha"
                      value={captcha}
                      onChange={(e) => setCaptcha(e.target.value)}
                      placeholder="输入右侧 4 位验证码"
                      autoComplete="off"
                      maxLength={4}
                      className="rounded-xl pl-9 uppercase tracking-widest"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="relative h-10 w-[120px] shrink-0 overflow-hidden rounded-xl border border-input bg-muted"
                    title="点击刷新验证码"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/auth/captcha?t=${captchaKey}`}
                      alt="验证码"
                      onClick={refreshCaptcha}
                      className="h-full w-full cursor-pointer object-cover"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity hover:bg-black/10 hover:opacity-100">
                      <RefreshCw className="h-4 w-4 text-slate-600" />
                    </span>
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  看不清？点击验证码图片可刷新
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? '登录' : '注册并登录'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? '还没有账号？' : '已经有账号了？'}
            <Link
              href={isLogin ? '/register' : '/login'}
              className="ml-1 font-medium text-primary hover:underline"
            >
              {isLogin ? '立即注册' : '去登录'}
            </Link>
          </p>

          {!isLogin && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              注册后会随机分配一个小肥鱼头像，可在「个人中心」更换
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
