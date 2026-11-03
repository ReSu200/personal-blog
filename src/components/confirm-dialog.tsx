'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui';

/**
 * 页内确认弹层：替代 window.confirm / window.alert。
 * reason: 部分内嵌浏览器（如 IDE 预览窗口）在弹出原生对话框时会直接崩溃，
 * 因此删除等破坏性操作统一走页内确认。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  error = '',
  confirmText = '删除',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  error?: string;
  confirmText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-sm font-semibold">
          {title}
        </h2>
        {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button ref={confirmRef} variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? '删除中…' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
