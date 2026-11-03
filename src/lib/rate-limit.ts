type Bucket = { count: number; lockedUntil: number; lastSeen: number };

const buckets = new Map<string, Bucket>();

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

let lastSweep = 0;

// 惰性清理：只在失败写入时顺带扫描，避免分桶键随来源 IP 无限增长
function sweepExpired(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.lockedUntil <= now && now - bucket.lastSeen > IDLE_MS) {
      buckets.delete(key);
    }
  }
}

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
  const bucket = buckets.get(key) ?? { count: 0, lockedUntil: 0, lastSeen: now };
  if (bucket.lockedUntil && bucket.lockedUntil <= now) {
    bucket.count = 0;
    bucket.lockedUntil = 0;
  }
  bucket.count += 1;
  bucket.lastSeen = now;
  if (bucket.count >= MAX_ATTEMPTS) {
    bucket.lockedUntil = now + LOCK_MS;
    bucket.count = 0;
  }
  buckets.set(key, bucket);
  sweepExpired(now);
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function clientKey(req: Request, scope = 'login') {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  return `${scope}:${ip}`;
}
