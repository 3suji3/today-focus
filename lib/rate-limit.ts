type Bucket = { startedAt: number; count: number };

const runtime = globalThis as typeof globalThis & {
  __TODAY_FOCUS_RATE_LIMITS__?: Map<string, Bucket>;
};

const buckets = runtime.__TODAY_FOCUS_RATE_LIMITS__ ?? new Map<string, Bucket>();
runtime.__TODAY_FOCUS_RATE_LIMITS__ = buckets;

export function checkWriteRateLimit(key: string, now = Date.now()) {
  const windowMs = 60_000;
  const limit = 60;
  const current = buckets.get(key);

  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    pruneBuckets(now, windowMs);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function pruneBuckets(now: number, windowMs: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= windowMs) buckets.delete(key);
  }
}

