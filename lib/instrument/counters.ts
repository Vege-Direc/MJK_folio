import { ASK_ORIGINS as WIRE_ORIGINS, type AskOrigin as WireAskOrigin } from '../ask/types';
import { getRedisClient } from '../redis';

/**
 * The instrument. Counts what this server already handled, and nothing else.
 *
 * WHY IT EXISTS. The site's entire thesis is that visitors will *ask* rather than only
 * scroll -- the scroll carries what exists, the chat carries depth. Every design decision
 * in `DIRECTION.md` leans on that, and nobody knows whether it is true. The best available
 * estimate is 2-8% of sessions asking at least once, best guess ~5%, low confidence, and
 * an honest floor under 1% -- built from anchors in the wrong context (0.84% for a live
 * chat widget over 4.78bn visits; 0.5% for site search on Google's own public GA4 demo
 * store). No source anywhere publishes engagement for a site where chat is the primary
 * navigation. A "5-15%" figure this project leaned on all session was retracted as
 * unattributed editorial. `DIRECTION.md` decision 11 is this file.
 *
 * THE FIVE QUESTIONS IT IS DESIGNED BACKWARDS FROM. A counter that reports a number
 * nobody can act on is worse than no counter, so each of these has an owner-facing
 * decision attached to it:
 *
 *   1. Does anyone ask at all?          asks / views.  Settles the 2-8% guess.
 *   2. Card, chip, or typed?            origin.  Nobody has published this split for any
 *                                       site; it is what says whether the card-as-question
 *                                       mechanism in `AskCard` works at all.
 *   3. Does anyone ask a SECOND one?    depth.  One ask is curiosity; two is the thesis.
 *   4. Where do the answers land?       stop.  `DIRECTION.md` decision 1's falsifier is
 *                                       "visitors reach `work` by asking, not scrolling".
 *   5. Is the machine actually working? outcome.  The guard's salvage rate, the fallback
 *                                       rate, the throttle rate -- as a daily figure
 *                                       rather than a `console.info` nobody greps.
 *
 * WHAT MAKES IT LEGITIMATE, AND WHERE THAT ARGUMENT RUNS OUT.
 *
 * `app/privacy/page.tsx` says, in the site's own words, "No account. No cookies. No
 * analytics." Two of those three are untouched by this file and are hard constraints on
 * it: nothing here writes to the visitor's device. No cookie, no `localStorage`, no
 * `sessionStorage`, no client-side identifier of any kind. That is what rules out the two
 * easy implementations of a "session" -- ePrivacy Art 5(3) covers storage in terminal
 * equipment, not merely cookies, so a `sessionStorage` "already counted" flag is storage
 * and is not available here either.
 *
 * The third needs a real argument, and the argument is NOT "an integer is not analytics"
 * -- that is the class of rationalisation this repository has already had to retract
 * twice in its own documents. It is this:
 *
 *   > Nothing new is observed. Only what the server already handled is counted.
 *
 * An ask is a POST that `lib/security/limits.ts` already counts, per IP hash, for 24
 * hours. A view is a GET the server already rendered and served. The stop and the outcome
 * are already written to the container log, one line per answer, by `console.info` in
 * `lib/ask/handler.ts`. This file adds no request, no beacon, no pixel, no device storage
 * and no third party; it replaces "grep the log" with "read an integer", and the integer
 * is strictly less revealing than the log line it summarises -- the log line carries a
 * timestamp and can be correlated, a counter is one number per day with no timestamp, no
 * address, and no way back to a request.
 *
 * Two things here are genuinely new and are named rather than absorbed. `origin` is a
 * field the client sends that it did not send before -- a closed enum of three constants
 * describing which control fired, carrying no identity and no free text. And the two
 * distinct-count sketches below take the limiter's existing IP hash. A HyperLogLog stores
 * registers, not inputs: it cannot be asked whether a given address is in it, cannot be
 * enumerated, and cannot be reversed. It holds strictly less than the limiter's own
 * `ask:ip-day:<hash>` key, which stores one key *per* address hash for 24 hours today.
 *
 * The privacy page is updated to say all of this. Widening what a site collects while its
 * own policy still says otherwise is precisely the error this project has corrected twice.
 *
 * WHAT IT CANNOT MEASURE, which the report repeats to the reader:
 *   - a session. Without a device identifier there is no such thing. `views` counts
 *     requests; `viewers` counts distinct address hashes in a day. A household or an
 *     office behind one NAT is one viewer; a phone moving between cells is several.
 *   - anyone who arrives and never asks anything again -- invisible by construction, and
 *     that is the point.
 *   - who. There is no join key anywhere. Two counters from the same day cannot be
 *     related to each other at the level of a person, ever.
 *
 * OPERATIONAL RULES this module enforces on itself:
 *   - it never throws, and it is never awaited on a request path. One fire-and-forget
 *     pipeline, `.catch()`ed to a warning.
 *   - with no `REDIS_URL` it does nothing at all -- dev, CI and the whole eval suite run
 *     without ever reaching a store.
 *   - it writes integers and HLL registers. There is no key anywhere in this schema that
 *     holds a string a visitor supplied.
 */

/**
 * Which control the visitor used, plus the one value only the server can write.
 *
 * The three the client may send are `ASK_ORIGINS` in `lib/ask/types.ts`, which is the
 * half of the wire contract the browser imports. `unknown` is appended here and nowhere
 * else: it means the body carried no origin -- an older client, a script, or a request
 * built by hand. Keeping it out of the wire enum is what makes "the client did not say"
 * and "the client said it did not know" impossible to confuse in the report.
 */
export const ASK_ORIGINS = [...WIRE_ORIGINS, 'unknown'] as const;
export type AskOrigin = WireAskOrigin | 'unknown';

/**
 * What the visitor ended up reading. Mirrors the envelope's status plus the refusals.
 *
 * `unanswered` and `off-topic` used to be one field, and separating them is the only part
 * of `DIRECTION.md` decision 7 that survives into the instrument. They are different
 * events: `off-topic` is someone asking the site to do their homework, which is noise, and
 * `unanswered` is someone asking a fair question MJK has not written down, which is the
 * corpus backlog arriving as data. Counting them together made the second invisible inside
 * the first.
 *
 * Named `unanswered` rather than `unknown` because `ASK_ORIGINS` already has an `unknown`
 * on a different axis, and two of them in one reading is a report nobody can read.
 */
export const ASK_OUTCOMES = [
  'verified',
  'salvaged',
  'replaced',
  'off-topic',
  'unanswered',
  'throttled',
  'no-model',
] as const;
export type AskOutcome = (typeof ASK_OUTCOMES)[number];

/**
 * The counted day, in UTC.
 *
 * UTC and not Asia/Singapore, even though that is where MJK is, because the boundary has
 * to be the same one in the container, in the report and in a key written six months ago.
 * A local-time boundary would silently re-cut every historical bucket the first time the
 * container's timezone changed.
 */
export function dayKey(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

/** A quarter of readable history. Long enough to see a trend, short enough to be nothing. */
const RETENTION_SECONDS = 90 * 24 * 60 * 60;

const PREFIX = 'mjk:i';

/**
 * The five hashes and two sketches a day is made of.
 *
 * Hashes rather than one key per bucket, so the set of buckets is data rather than
 * schema: a stop added to `content/stops.ts` next month appears in the report on its own,
 * and a stop removed does not take its history with it. Seven keys per day, whatever the
 * corpus does.
 */
const FIELDS = {
  /** `views`, `views_bot`, `asks`. */
  n: `${PREFIX}:%d:n`,
  origin: `${PREFIX}:%d:origin`,
  depth: `${PREFIX}:%d:depth`,
  stop: `${PREFIX}:%d:stop`,
  outcome: `${PREFIX}:%d:outcome`,
} as const;

const SKETCHES = {
  viewers: `${PREFIX}:%d:viewers`,
  askers: `${PREFIX}:%d:askers`,
} as const;

type HashName = keyof typeof FIELDS;
type SketchName = keyof typeof SKETCHES;

export const HASH_NAMES = Object.keys(FIELDS) as HashName[];
export const SKETCH_NAMES = Object.keys(SKETCHES) as SketchName[];

function hashKey(name: HashName, day: string): string {
  return FIELDS[name].replace('%d', day);
}

function sketchKey(name: SketchName, day: string): string {
  return SKETCHES[name].replace('%d', day);
}

/**
 * A field name that is safe to put in Redis, or nothing.
 *
 * Every caller in this repository passes a value from a closed union -- an origin, an
 * outcome, a `StopId`, a depth bucket this file computed. None of them can carry visitor
 * text. This exists anyway because the cost of being wrong about that later is a Redis
 * hash whose field names are attacker-controlled strings, which would turn a counter into
 * the one thing this file promises it is not: a store of what somebody typed.
 */
const SAFE_FIELD = /^[a-z0-9_+-]{1,32}$/;

type Op =
  | { kind: 'hincr'; hash: HashName; field: string }
  | { kind: 'pfadd'; sketch: SketchName; member: string };

/**
 * Apply a batch of counts, and never make anybody wait for it.
 *
 * Not `async`, and it returns nothing on purpose: there is no result a caller could act
 * on, and a caller that could `await` this would eventually be a caller that does. The
 * answer path's budget for this is zero milliseconds.
 */
function record(ops: readonly Op[]): void {
  const redis = getRedisClient();
  if (!redis || ops.length === 0) return;

  const day = dayKey();
  const pipeline = redis.pipeline();
  const touched = new Set<string>();

  for (const op of ops) {
    if (op.kind === 'hincr') {
      if (!SAFE_FIELD.test(op.field)) continue;
      const key = hashKey(op.hash, day);
      pipeline.hincrby(key, op.field, 1);
      touched.add(key);
    } else {
      const key = sketchKey(op.sketch, day);
      pipeline.pfadd(key, op.member);
      touched.add(key);
    }
  }

  // Re-set on every write rather than only on creation: `EXPIRE ... NX` needs Redis 7 and
  // this deployment's version is not pinned anywhere. Rewriting the TTL is harmless -- a
  // day's keys stop being written when the day ends, so each expires 90 days after its
  // own last request, which is the intended retention read the useful way round.
  for (const key of touched) pipeline.expire(key, RETENTION_SECONDS);

  pipeline
    .exec()
    .then((results) => {
      // `exec()` does NOT reject when the commands inside it fail -- it resolves with the
      // error in each entry's first slot. Without this the writes were failing in total
      // silence against an unreachable store, which is how a page of zeroes came to look
      // exactly like a site nobody had visited.
      const failed = results?.find(([err]) => err)?.[0];
      if (failed) warnOnce(failed.message);
    })
    .catch((err: unknown) => warnOnce(err instanceof Error ? err.message : String(err)));
}

/**
 * One line a minute, at most.
 *
 * A counter that cannot write is never a reason for a visitor to see anything different,
 * and it is also never a reason to write a line per request into a log the owner has to
 * read. An unreachable Redis would otherwise produce one warning for every page view on
 * the site, which buries the answers this instrument exists to surface.
 */
let lastWarnedAt = 0;
function warnOnce(message: string): void {
  const now = Date.now();
  if (now - lastWarnedAt < 60_000) return;
  lastWarnedAt = now;
  console.warn('[instrument] write failed (suppressed for 60s):', message);
}

/* -- what the callers record -------------------------------------------------- */

/**
 * A page was served. Called from `proxy.ts`, which sees the document request itself.
 *
 * `bot` is a coarse user-agent bucket and it is kept separate rather than filtered out,
 * because a number that has silently dropped some of its input is worse than a number
 * with a caveat. The agent string is read, bucketed into one of two integers, and never
 * stored.
 */
export function recordView(opts: { ipHash: string | null; bot: boolean }): void {
  const ops: Op[] = [{ kind: 'hincr', hash: 'n', field: opts.bot ? 'views_bot' : 'views' }];
  // Crawlers are not viewers. Putting them in the sketch would inflate the denominator of
  // the one ratio this whole instrument exists to produce.
  if (opts.ipHash && !opts.bot) ops.push({ kind: 'pfadd', sketch: 'viewers', member: opts.ipHash });
  record(ops);
}

/**
 * A question arrived and parsed. Recorded before admission, deliberately: a visitor the
 * limiter turns away still asked, and an instrument that only counts the ones that got
 * through would report a rate that falls exactly when interest rises.
 *
 * `depth` is the ordinal of this question inside its conversation, which the request body
 * already carries as the length of `history`. It costs nothing and no client state, and
 * it is the only thing on this site that can distinguish curiosity from the thesis.
 */
export function recordAsk(opts: { ipHash: string | null; origin: AskOrigin; depth: number }): void {
  const bucket = opts.depth >= 4 ? '4plus' : String(Math.max(1, Math.trunc(opts.depth)));
  const ops: Op[] = [
    { kind: 'hincr', hash: 'n', field: 'asks' },
    { kind: 'hincr', hash: 'origin', field: opts.origin },
    { kind: 'hincr', hash: 'depth', field: bucket },
  ];
  if (opts.ipHash) ops.push({ kind: 'pfadd', sketch: 'askers', member: opts.ipHash });
  record(ops);
}

/** The stop the answer was routed to -- the `data-route` the page flies to. */
export function recordStop(stopId: string): void {
  record([{ kind: 'hincr', hash: 'stop', field: stopId }]);
}

/** What the visitor ended up reading, once the guard has had the last word. */
export function recordOutcome(outcome: AskOutcome): void {
  record([{ kind: 'hincr', hash: 'outcome', field: outcome }]);
}

/* -- reading it back ----------------------------------------------------------- */

export type DayCounts = {
  day: string;
  views: number;
  viewsBot: number;
  viewers: number;
  asks: number;
  askers: number;
  origin: Record<string, number>;
  depth: Record<string, number>;
  stop: Record<string, number>;
  outcome: Record<string, number>;
};

export type InstrumentReading = {
  /** Newest first. */
  days: DayCounts[];
  /** Distinct address hashes across the whole window, as a union of the daily sketches. */
  uniqueViewers: number;
  uniqueAskers: number;
  /**
   * How many of the reads that made this page came back as an error, out of how many were
   * issued.
   *
   * CAUGHT ON THE FIRST LIVE RUN OF THIS CODE, and it is the exact defect the whole
   * feature is a reaction to. `REDIS_URL` pointed at a hostname that does not resolve
   * outside the compose network, and the report printed a clean page of zeroes -- "nobody
   * visited" and "the store is unreachable" rendered identically. A `pipeline.exec()` does
   * not reject when its commands fail; it resolves with an error in each entry's first
   * slot, and every one of them was being read as a missing value and coerced to nought.
   *
   * A site with no visitors and an instrument with no connection are different facts, and
   * an instrument that cannot tell them apart is worse than no instrument, because it
   * produces a confident answer to the question it was built to settle.
   */
  reads: { failed: number; total: number };
};

/** The last `n` UTC days, newest first, as key suffixes. */
export function recentDays(n: number, at: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(dayKey(new Date(at.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return out;
}

function toCounts(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [field, value] of Object.entries(raw as Record<string, string>)) {
    const n = Number(value);
    if (Number.isFinite(n) && n !== 0) out[field] = n;
  }
  return out;
}

/**
 * Read the window back. The only function here that awaits anything, and it is called
 * from exactly one place: the owner's own protected route.
 *
 * Returns `null` when there is no store, which is the honest answer in dev and in CI --
 * an empty report and "no store" are different states and the reader must be able to tell
 * them apart, or a broken Redis reads as a site nobody visited.
 */
export async function read(days: number): Promise<InstrumentReading | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  const window = recentDays(days);
  const pipeline = redis.pipeline();
  for (const day of window) {
    for (const name of HASH_NAMES) pipeline.hgetall(hashKey(name, day));
    for (const name of SKETCH_NAMES) pipeline.pfcount(sketchKey(name, day));
  }
  // The union across the whole window, which is not the sum of the days: one person
  // visiting on three days is one, and only the sketches can say so.
  pipeline.pfcount(...window.map((day) => sketchKey('viewers', day)));
  pipeline.pfcount(...window.map((day) => sketchKey('askers', day)));

  const results = await pipeline.exec();
  if (!results) return null;

  const perDay = HASH_NAMES.length + SKETCH_NAMES.length;
  const value = (i: number): unknown => results[i]?.[1];

  const daysOut: DayCounts[] = window.map((day, index) => {
    const base = index * perDay;
    const hashes = Object.fromEntries(
      HASH_NAMES.map((name, i) => [name, toCounts(value(base + i))]),
    ) as Record<HashName, Record<string, number>>;
    const sketches = SKETCH_NAMES.map((_, i) => Number(value(base + HASH_NAMES.length + i)) || 0);
    return {
      day,
      views: hashes.n.views ?? 0,
      viewsBot: hashes.n.views_bot ?? 0,
      viewers: sketches[0] ?? 0,
      asks: hashes.n.asks ?? 0,
      askers: sketches[1] ?? 0,
      origin: hashes.origin,
      depth: hashes.depth,
      stop: hashes.stop,
      outcome: hashes.outcome,
    };
  });

  const tail = window.length * perDay;
  return {
    days: daysOut,
    uniqueViewers: Number(value(tail)) || 0,
    uniqueAskers: Number(value(tail + 1)) || 0,
    reads: { failed: results.filter(([err]) => err).length, total: results.length },
  };
}
