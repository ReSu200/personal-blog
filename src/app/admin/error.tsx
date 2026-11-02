'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] 页面渲染失败', error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <h2 className="mt-4 text-lg font-semibold">后台页面加载失败</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        请重试；如果持续出现，请检查数据库连接或查看服务端日志。
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={reset}>重新加载</Button>
        <Link href="/admin">
          <Button variant="outline">返回后台首页</Button>
        </Link>
      </div>
    </div>
  );
}
