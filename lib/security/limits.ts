/**
 * Admission control for `/api/ask`.
 *
 * The site runs on OpenRouter's free tier, which caps the whole account at 20 requests
 * a minute and 1000 a day -- not per visitor, per account. One visitor with a script can
 * spend the entire day's budget before lunch, and every other visitor for the rest of
 * the day gets a resume that cannot answer questions. Three independent ceilings guard
 * against that, checked in order from cheapest-to-the-abuser to most-shared:
 *
 *   1. ip-burst  -- 6 requests per 60 seconds, per visitor. Stops a tight script loop.
 *   2. ip-day    -- 40 requests per 24 hours, per visitor. Generous for a real reader,
 *                   small next to the account's 1000/day.
 *   3. global-day -- `ASK_DAILY_BUDGET` (default 800) requests per 24 hours, shared by
 *                   every visitor. This is the real backstop: it holds the account's
 *                   usage under OpenRouter's 1000/day cap with headroom, regardless of
 *                   how the 40/day per-IP ceiling gets distributed across visitors (or
 *                   evaded by rotating IPs).
 *
 * `admit()` consumes from these in order and stops at the first one that says no, so a
 * request that was always going to be turned away for hammering one visitor's burst
 * limit never spends a point of the shared daily budget.
 *
 * Storage: Redis in production (`REDIS_URL`), shared across every app instance, so the
 * three ceilings hold even if the site scales to more than one container. Redis is not
 * guaranteed to be present in dev or in CI, so every limiter falls back to
 * `RateLimiterMemory` -- either as the only store (no `REDIS_URL`), or as the
 * `insuranceLimiter` behind a Redis-backed limiter, which is rate-limiter-flexible's
 * built-in behaviour for "the store is unreachable, count in this process instead of
 * failing the request." Either way `admit()` never throws: a rate limiter that is down
 * degrades to admitting (or throttling) on a per-process guess, which is a visitor
 * occasionally seeing a slightly looser or tighter limit than intended -- never an
 * error page. The one path that still resolves to `{ ok: false, reason: 'unavailable' }`
 * is a genuinely unexpected failure that even the insurance limiter could not absorb.
 */
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
  type RateLimiterAbstract,
} from 'rate-limiter-flexible';

export type AdmitReason = 'ip-burst' | 'ip-day' | 'global-day' | 'unavailable';

export type AdmitResult =
  | { ok: true }
  | { ok: false; reason: AdmitReason; retryAfterSeconds?: number };

/* -- the three ceilings ------------------------------------------------------ */

const IP_BURST_POINTS = 6;
const IP_BURST_DURATION_SECONDS = 60;

const IP_DAY_POINTS = 40;
const DAY_SECONDS = 24 * 60 * 60;

const DEFAULT_GLOBAL_DAILY_BUDGET = 800;
const GLOBAL_KEY = 'global';

function globalDailyBudget(): number {
  const raw = process.env.ASK_DAILY_BUDGET?.trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_GLOBAL_DAILY_BUDGET;
}

/* -- shared redis client ------------------------------------------------------ */

let redisClient: Redis | null | undefined; // undefined = not resolved yet, null = no REDIS_URL

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    redisClient = null;
    return redisClient;
  }
  // enableOfflineQueue: false -- a call made while Redis is unreachable must fail fast
  // so rate-limiter-flexible's insuranceLimiter can take over immediately, rather than
  // the request hanging behind a queue that only drains once Redis comes back.
  redisClient = new Redis(url, { enableOfflineQueue: false });
  redisClient.on('error', (err) => {
    console.error('[security/limits] redis connection error:', err instanceof Error ? err.message : err);
  });
  return redisClient;
}

/* -- limiter factory ---------------------------------------------------------- */

function buildLimiter(opts: { keyPrefix: string; points: number; duration: number }): RateLimiterAbstract {
  const redis = getRedisClient();
  if (!redis) return new RateLimiterMemory(opts);
  return new RateLimiterRedis({
    ...opts,
    storeClient: redis,
    // A Redis outage degrades this one limiter to per-process memory instead of
    // rejecting every request outright.
    insuranceLimiter: new RateLimiterMemory(opts),
  });
}

let ipBurstLimiter: RateLimiterAbstract | null = null;
let ipDayLimiter: RateLimiterAbstract | null = null;
let globalDayLimiter: RateLimiterAbstract | null = null;

function getIpBurstLimiter(): RateLimiterAbstract {
  if (!ipBurstLimiter) {
    ipBurstLimiter = buildLimiter({
      keyPrefix: 'ask:ip-burst',
      points: IP_BURST_POINTS,
      duration: IP_BURST_DURATION_SECONDS,
    });
  }
  return ipBurstLimiter;
}

function getIpDayLimiter(): RateLimiterAbstract {
  if (!ipDayLimiter) {
    ipDayLimiter = buildLimiter({ keyPrefix: 'ask:ip-day', points: IP_DAY_POINTS, duration: DAY_SECONDS });
  }
  return ipDayLimiter;
}

function getGlobalDayLimiter(): RateLimiterAbstract {
  if (!globalDayLimiter) {
    globalDayLimiter = buildLimiter({
      keyPrefix: 'ask:global-day',
      points: globalDailyBudget(),
      duration: DAY_SECONDS,
    });
  }
  return globalDayLimiter;
}

/* -- ip hashing ---------------------------------------------------------------- */

/**
 * sha256 of the raw IP, truncated to 16 hex characters (64 bits). A raw IP address is
 * personal data the limiter has no reason to retain; 64 bits of a cryptographic hash is
 * far more collision headroom than this site's visitor count will ever need, so two
 * different visitors are never merged into one budget by an accident of truncation.
 */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/* -- admission ------------------------------------------------------------------ */

async function tryConsume(
  limiter: RateLimiterAbstract,
  key: string,
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  try {
    await limiter.consume(key);
    return { ok: true };
  } catch (rejOrErr) {
    // rate-limiter-flexible rejects with a RateLimiterRes when the key is simply out of
    // points -- that is an ordinary throttle, not a failure. Anything else (a real
    // Error) is a genuine problem and is rethrown to the outer catch in admit().
    if (rejOrErr instanceof RateLimiterRes) {
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(rejOrErr.msBeforeNext / 1000)) };
    }
    throw rejOrErr;
  }
}

export async function admit(ip: string): Promise<AdmitResult> {
  const key = hashIp(ip);
  try {
    const burst = await tryConsume(getIpBurstLimiter(), key);
    if (!burst.ok) return { ok: false, reason: 'ip-burst', retryAfterSeconds: burst.retryAfterSeconds };

    const day = await tryConsume(getIpDayLimiter(), key);
    if (!day.ok) return { ok: false, reason: 'ip-day', retryAfterSeconds: day.retryAfterSeconds };

    const global = await tryConsume(getGlobalDayLimiter(), GLOBAL_KEY);
    if (!global.ok) return { ok: false, reason: 'global-day', retryAfterSeconds: global.retryAfterSeconds };

    return { ok: true };
  } catch (err) {
    console.error('[security/limits] admit() failed unexpectedly:', err instanceof Error ? err.message : err);
    return { ok: false, reason: 'unavailable' };
  }
}

/* -- client ip --------------------------------------------------------------- */

/**
 * The first entry of `x-forwarded-for`.
 *
 * This deployment has exactly one hop between a visitor and the app: Coolify's Traefik
 * proxy, terminating the TLS connection and setting `x-forwarded-for` itself rather
 * than a further-upstream CDN passing one through untouched. That makes the first (and,
 * today, only) entry the address Traefik itself observed the connection come from.
 *
 * That trust is specific to this topology, not a property of the header in general --
 * if a CDN is ever put in front of Traefik (the `coolify.md` "Limits" section
 * recommends Cloudflare), the entry to trust becomes "the one Traefik itself appended,"
 * not "the first one in the list," because a client can put anything it likes at the
 * front of its own `x-forwarded-for`. This function would need to change with that
 * topology. Until then, note that IP attribution is a courtesy, not the load-bearing
 * control: `admit()`'s real backstop is the shared `global-day` budget, which holds
 * regardless of whether any given IP is attributed correctly.
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (!xff) return 'unknown';
  const first = xff.split(',')[0]?.trim();
  return first ? first : 'unknown';
}

/* -- tests -------------------------------------------------------------------- */

/**
 * Drops the cached limiters so the next `admit()` call starts every counter at zero.
 * Also lets a test change `ASK_DAILY_BUDGET` and have it take effect, since the global
 * limiter reads that env var only when it is (re)built.
 */
export function resetLimitsForTests(): void {
  ipBurstLimiter = null;
  ipDayLimiter = null;
  globalDayLimiter = null;
}
