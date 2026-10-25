type Bucket = { count: number; lockedUntil: number };

const buckets = new Map<string, Bucket>();

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

export function checkRateLimit(key: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) return { ok: true };
  if (bucket.lockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((bucket.lockedUntil - now) / 1000) };
  }
  return { ok: true };
}

export function recordFailure(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, lockedUntil: 0 };
  if (bucket.lockedUntil && bucket.lockedUntil <= now) {
    bucket.count = 0;
    bucket.lockedUntil = 0;
  }
  bucket.count += 1;
  if (bucket.count >= MAX_ATTEMPTS) {
    bucket.lockedUntil = now + LOCK_MS;
    bucket.count = 0;
  }
  buckets.set(key, bucket);
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function clientKey(req: Request, scope = 'login') {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  return `${scope}:${ip}`;
}
