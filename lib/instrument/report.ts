import { ASK_ORIGINS, ASK_OUTCOMES, type DayCounts, type InstrumentReading } from './counters';

/**
 * The instrument, in words, for one reader.
 *
 * Plain text on purpose. This is not a dashboard: it is opened perhaps once a week by one
 * person who wants to know whether anybody asked, and every pixel of chrome added to it
 * would be a pixel arguing that the numbers are more solid than they are. It renders in a
 * browser tab, in `curl`, and in a terminal, and it is short enough to read whole.
 *
 * A pure function of a reading, so the whole thing is testable without a Redis, which
 * matters more here than usual: the entire premise of `DIRECTION.md` decision 11 is that a
 * counter nobody has read is a counter nobody can trust.
 *
 * THE ONE RULE IT FOLLOWS. Every ratio is printed next to the counts it came from and an
 * interval around it, and any ratio too thin to mean anything says so in the same line
 * rather than in a footnote. This repository has retracted four numbers in one session --
 * "lost by 90% over 502 sessions", "5-15% chat engagement", and two of its own -- and
 * every one of them was a figure that travelled without its evidence. A report that prints
 * "33%" over three asks would be the fifth.
 */

/* -- the honest ratio ---------------------------------------------------------- */

/**
 * A proportion with a 95% Wilson score interval around it.
 *
 * Wilson rather than the textbook normal approximation, because the normal one is wrong in
 * exactly the situation this report will spend its first month in: small n, proportion
 * near zero. At 1 ask in 40 views it produces an interval that includes negative numbers.
 * Wilson stays inside [0,1] at any n and is the standard recommendation for a binomial
 * proportion near a boundary (Brown, Cai & DasGupta 2001).
 *
 * It is not a claim that views are independent Bernoulli trials -- they are not, one
 * person can produce several. It is a floor on how much the reader should believe the
 * point estimate, and at these sample sizes the floor is the entire message.
 */
export function proportion(hits: number, total: number): { pct: number; lo: number; hi: number } | null {
  if (total <= 0) return null;
  const p = hits / total;
  const z = 1.96;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const centre = (p + z2 / (2 * total)) / denom;
  const spread = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  /*
   * Clamped to contain the point estimate as well as to stay inside [0,1].
   *
   * The Wilson interval provably contains `p` -- it is the set of null values the score
   * test does not reject, and the statistic is exactly zero at `p` itself -- but at the
   * boundary the arithmetic says otherwise: at 812 of 812 the upper bound comes out as
   * 0.9999999999999999 against a point estimate of 1, and the report would print a band
   * that excludes the number it is a band around. That is float noise, not statistics, and
   * it is fixed here rather than accommodated by whoever reads the line.
   */
  return {
    pct: 100 * p,
    lo: 100 * Math.max(0, Math.min(p, centre - spread)),
    hi: 100 * Math.min(1, Math.max(p, centre + spread)),
  };
}

/** `4.6% (2.1-9.4%)`, or the reason it would be a lie. */
function ratioLine(hits: number, total: number): string {
  const r = proportion(hits, total);
  if (!r) return 'no denominator yet';
  const point = `${r.pct.toFixed(1)}%`;
  const band = `${r.lo.toFixed(1)}-${r.hi.toFixed(1)}%`;
  // The width of the interval is the honest test of whether the point estimate is worth
  // reading, and it does not need a rule of thumb about n on top of it: an interval
  // spanning more than ten points cannot separate 2% from 8%, which is the only question
  // this number was built to answer.
  const useless = r.hi - r.lo > 10;
  return `${point.padStart(6)}  (95%: ${band})${useless ? '  <- too thin to mean anything yet' : ''}`;
}

/**
 * How many days `?days=` asks for, clamped to what the counters actually keep.
 *
 * Here rather than in the route because it shipped wrong once and the fix needed a test to
 * hold it. The first version read `Number(null)` as 0, which is finite, and clamped it up
 * to 1 -- so the default window was a single day and the report quietly answered a
 * narrower question than the one it was asked. That is the failure mode this whole feature
 * exists to avoid: a number that is not wrong, just about something else.
 */
export function windowDays(raw: string | null): number {
  if (raw === null || raw.trim() === '') return DEFAULT_WINDOW;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_WINDOW;
  return Math.min(MAX_WINDOW, Math.trunc(parsed));
}

const DEFAULT_WINDOW = 30;
/** The counters' own retention. Asking for more would read empty days as quiet ones. */
const MAX_WINDOW = 90;

/* -- layout helpers ------------------------------------------------------------ */

const pad = (s: string | number, n: number) => String(s).padStart(n);
const fit = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

function sumOf(days: readonly DayCounts[], pick: (d: DayCounts) => number): number {
  return days.reduce((total, day) => total + pick(day), 0);
}

function mergeCounts(days: readonly DayCounts[], pick: (d: DayCounts) => Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const day of days) {
    for (const [field, n] of Object.entries(pick(day))) out[field] = (out[field] ?? 0) + n;
  }
  return out;
}

/**
 * A block of `label  count  share`, ordered by a known list first and then by whatever
 * else turned up.
 *
 * The known list is printed even at zero, because a zero the reader can see is a finding
 * -- "nobody has ever pressed a chip" is exactly the kind of thing this instrument is for,
 * and a row that is simply absent reads as a bug in the report instead.
 */
function breakdown(counts: Record<string, number>, known: readonly string[] = []): string[] {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const extra = Object.keys(counts)
    .filter((k) => !known.includes(k))
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  const rows = [...known, ...extra];
  if (rows.length === 0) return ['  (nothing yet)'];
  return rows.map((field) => {
    const n = counts[field] ?? 0;
    const share = total > 0 ? `${((100 * n) / total).toFixed(0)}%` : '--';
    return `  ${fit(field, 12)}${pad(n, 6)}${pad(share, 7)}`;
  });
}

/** Two blocks printed beside each other, so the report fits on one screen. */
function sideBySide(left: string[], right: string[], gap = 6): string[] {
  const width = Math.max(...left.map((l) => l.length), 0) + gap;
  const height = Math.max(left.length, right.length);
  const out: string[] = [];
  for (let i = 0; i < height; i++) {
    out.push((fit(left[i] ?? '', width) + (right[i] ?? '')).trimEnd());
  }
  return out;
}

/* -- the report ---------------------------------------------------------------- */

export function formatReport(reading: InstrumentReading | null, at: Date = new Date()): string {
  const stamp = `${at.toISOString().slice(0, 16).replace('T', ' ')}Z`;
  const head = ['MJK FOLIO — INSTRUMENT', 'DIRECTION.md decision 11. Counts only; no cookies, no identifiers, no third party.'];

  if (!reading) {
    return [
      ...head,
      '',
      `Read ${stamp}. NO STORE CONFIGURED.`,
      '',
      'REDIS_URL is not set in this process, so nothing has been counted and nothing can be',
      'read. This is not the same as a site nobody visited, and the difference matters enough',
      'to say rather than print a page of zeroes.',
      '',
    ].join('\n');
  }

  const { days } = reading;
  const window = days.length;
  const views = sumOf(days, (d) => d.views);
  const viewsBot = sumOf(days, (d) => d.viewsBot);
  const asks = sumOf(days, (d) => d.asks);

  const origin = mergeCounts(days, (d) => d.origin);
  const depth = mergeCounts(days, (d) => d.depth);
  const stop = mergeCounts(days, (d) => d.stop);
  const outcome = mergeCounts(days, (d) => d.outcome);

  /*
   * A conversation is a first question, and a conversation that came back is a second one.
   *
   * The counts are of questions, not of conversations, and the two only coincide at these
   * two depths -- which is exactly why the numerator is `depth['2']` alone and not the sum
   * of everything past the first. Every conversation that reached two questions
   * contributes exactly one ask at depth 2, whereas a visitor who asked four times would
   * otherwise be counted three times over and one determined reader would read as a trend.
   */
  const conversations = depth['1'] ?? 0;
  const cameBack = depth['2'] ?? 0;

  const lines: string[] = [
    ...head,
    `Read ${stamp}. Last ${window} UTC days.`,
    /*
     * The store answered, but not with numbers.
     *
     * This banner exists because the first live run of this code produced a clean page of
     * zeroes against a Redis whose hostname does not resolve outside the compose network,
     * and "nobody visited" and "nothing could be read" rendered identically. A reader
     * cannot be expected to notice the absence of a warning, so the warning is loud, at
     * the top, and before any figure it invalidates.
     */
    ...(reading.reads.failed > 0
      ? [
          '',
          `!! ${reading.reads.failed} of ${reading.reads.total} reads FAILED. The store is unreachable or degraded.`,
          '!! Every zero below may be a missing answer rather than a real one. Do not read',
          '!! this page as evidence about visitors until this line is gone.',
        ]
      : []),
    '',
    '── DOES ANYONE ASK AT ALL ──────────────────────────────────────────────────────',
    '',
    `  asks per page view      ${pad(asks, 6)} / ${pad(views, 6)}   ${ratioLine(asks, views)}`,
    `  askers per viewer       ${pad(reading.uniqueAskers, 6)} / ${pad(reading.uniqueViewers, 6)}   ${ratioLine(
      reading.uniqueAskers,
      reading.uniqueViewers,
    )}`,
    '',
    '  The second line is distinct address hashes over the whole window, which is the',
    '  closest thing here to "sessions" and is not one. DIRECTION.md put this at 2-8%,',
    `  best guess ~5%, low confidence, honest floor under 1%. ${viewsBot} further views came`,
    '  from crawlers and monitors and are excluded from both lines above.',
    '',
    '── HOW THEY ASK, AND HOW FAR THEY GO ───────────────────────────────────────────',
    '',
    ...sideBySide(
      ['  ORIGIN OF THE ASK', ...breakdown(origin, ASK_ORIGINS)],
      ['  QUESTIONS PER CONVERSATION', ...breakdown(depth, ['1', '2', '3', '4plus'])],
    ),
    '',
    `  Nobody has published the origin split for any site. It is what says whether a card`,
    `  is a question that has not been asked yet, or just a card.`,
    '',
    `  Conversations that came back for a second question: ${cameBack} of ${conversations}   ${ratioLine(
      cameBack,
      conversations,
    )}`,
    '  One ask is curiosity. Two is the claim that the chat carries depth.',
    '',
    '── WHERE THE ANSWERS LANDED, AND WHAT WAS READ ─────────────────────────────────',
    '',
    ...sideBySide(['  STOP', ...breakdown(stop)], ['  OUTCOME', ...breakdown(outcome, ASK_OUTCOMES)]),
    '',
    '  `salvaged` and `replaced` are the guard taking the model\'s words away. `unanswered`',
    '  is a fair question with nothing in the corpus to answer it — that column is the',
    '  writing backlog, arriving as data.',
    '',
    '── BY DAY ──────────────────────────────────────────────────────────────────────',
    '',
    `  ${fit('day', 12)}${pad('views', 7)}${pad('bots', 6)}${pad('viewers', 9)}${pad('asks', 6)}${pad('askers', 8)}${pad(
      'card',
      6,
    )}${pad('chip', 6)}${pad('typed', 7)}`,
  ];

  for (const day of days) {
    // A day nothing happened on is not printed. Thirty rows of zeroes bury the four rows
    // that carry the whole reading, and the date column already says which days are missing.
    if (day.views + day.asks + day.viewsBot === 0) continue;
    lines.push(
      `  ${fit(day.day, 12)}${pad(day.views, 7)}${pad(day.viewsBot, 6)}${pad(day.viewers, 9)}${pad(day.asks, 6)}${pad(
        day.askers,
        8,
      )}${pad(day.origin.card ?? 0, 6)}${pad(day.origin.chip ?? 0, 6)}${pad(day.origin.typed ?? 0, 7)}`,
    );
  }
  if (!days.some((d) => d.views + d.asks + d.viewsBot > 0)) lines.push('  (nothing counted in this window)');

  lines.push(
    '',
    '── WHAT THIS CANNOT TELL YOU ───────────────────────────────────────────────────',
    '',
    '  A session. There is no cookie and no identifier, so there is no such thing here.',
    '  `views` counts document requests; `viewers` counts distinct hashed addresses in a',
    '  day. An office or a household behind one address is one viewer. A phone moving',
    '  between cells is several. Neither is a person and the report will not call them one.',
    '',
    '  Who. There is no join key anywhere in this schema. No two numbers on this page can',
    '  be related to each other at the level of a visitor, by anyone, including me.',
    '',
    '  Why. A visitor who read everything and asked nothing is indistinguishable from one',
    '  who bounced in two seconds. If that distinction is worth having, it costs a cookie,',
    '  and the privacy page currently promises there is not one.',
    '',
    '  Whether any of this generalises. It is one site, one owner, one small sample, and',
    '  the crawler filter is a regular expression over a header anyone may forge.',
    '',
  );

  return lines.join('\n');
}
