import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
};

function buildHref(basePath: string, query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ page, totalPages, basePath, query = {} }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="mt-8 flex items-center justify-center gap-1.5">
      <Link
        href={buildHref(basePath, query, Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent',
          page === 1 && 'pointer-events-none opacity-40',
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {pages.map((p, index) => (
        <span key={p} className="flex items-center gap-1.5">
          {index > 0 && p - pages[index - 1] > 1 && (
            <span className="px-1 text-sm text-muted-foreground">…</span>
          )}
          <Link
            href={buildHref(basePath, query, p)}
            className={cn(
              'flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition-colors',
              p === page
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-accent',
            )}
          >
            {p}
          </Link>
        </span>
      ))}

      <Link
        href={buildHref(basePath, query, Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent',
          page === totalPages && 'pointer-events-none opacity-40',
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
