import Redis from 'ioredis';

/**
 * The one Redis connection this process opens, shared by everything that needs it.
 *
 * It was private to `lib/security/limits.ts` until the instrument
 * (`lib/instrument/counters.ts`) needed the same store. A second client would have been
 * harmless in itself, but an instrument that opens its own connection to the thing it is
 * measuring is a measurement that perturbs its subject, and the limiters' behaviour under
 * a Redis outage is carefully specified -- it should not have to share that outage with a
 * counter that nobody's answer depends on.
 *
 * `enableOfflineQueue: false` is load-bearing and belongs to the limiters: a call made
 * while Redis is unreachable must fail fast so rate-limiter-flexible's `insuranceLimiter`
 * can take over immediately, rather than the request hanging behind a queue that only
 * drains once Redis comes back. The instrument inherits it and wants it for a different
 * reason -- a counter must never be able to hold a request open.
 *
 * `null` means there is no `REDIS_URL`: dev, CI and the eval suite. Every caller has to
 * cope with that, and both of them do -- the limiters fall back to in-process memory, and
 * the instrument stops counting.
 */

let client: Redis | null | undefined; // undefined = not resolved yet, null = no REDIS_URL

export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    client = null;
    return client;
  }
  client = new Redis(url, { enableOfflineQueue: false });
  client.on('error', (err) => {
    console.error('[redis] connection error:', err instanceof Error ? err.message : err);
  });
  return client;
}

/**
 * Drops the cached client so the next call re-reads `REDIS_URL`. For tests only, and for
 * the same reason `resetLimitsForTests` exists: the resolution is cached on first use, so
 * a test that changes the environment afterwards would otherwise be ignored.
 */
export function resetRedisForTests(): void {
  client = undefined;
}
