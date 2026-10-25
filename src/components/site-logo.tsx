import { cn } from '@/lib/utils';

type Props = {
  name: string;
  logoUrl?: string | null;
  className?: string;
};

export function SiteLogo({ name, logoUrl, className }: Props) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 font-bold text-white shadow-sm',
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${name} logo`} decoding="async" className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}
