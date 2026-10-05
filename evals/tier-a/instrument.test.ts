/**
 * The instrument — `DIRECTION.md` decision 11.
 *
 * The whole premise of that decision is that a counter nobody has ever read is a counter
 * nobody can trust, and the corollary is that a counter nobody has ever tested is worse:
 * it will be read, once, six months from now, and there will be no way to tell a real
 * zero from a wire that was never connected. So these tests assert the two things a
 * reader of that report has to be able to assume — that an ask arriving at `/api/ask`
 * with an origin is counted under that origin and no other, and that the report never
 * prints a ratio without the evidence for it.
 *
 * Nothing here touches Redis. `REDIS_URL` is absent in this process, which is exactly the
 * condition the counters are built to no-op under, so the recorders are exercised through
 * the handler's `deps` seam and the report through a synthetic reading.
 */
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { defaultDeps, handleAsk, type AskDeps } from '../../lib/ask/handler';
import { ASK_ORIGINS } from '../../lib/ask/types';
import {
  ASK_ORIGINS as COUNTED_ORIGINS,
  ASK_OUTCOMES,
  dayKey,
  recentDays,
  recordAsk,
  recordOutcome,
  recordStop,
  recordView,
  type AskOrigin,
  type AskOutcome,
  type InstrumentReading,
} from '../../lib/instrument/counters';
import { formatReport, proportion, windowDays } from '../../lib/instrument/report';
import { parseAskBody } from '../../lib/security/schema';

/* -- the wire contract --------------------------------------------------------- */

describe('the origin a client may send', () => {
  it('accepts exactly card, chip and typed', () => {
    for (const origin of ASK_ORIGINS) {
      const parsed = parseAskBody({ question: 'What did you build?', origin });
      expect(parsed.ok, origin).toBe(true);
      if (parsed.ok) expect(parsed.value.origin).toBe(origin);
    }
  });

  it('is optional, and absent stays absent rather than becoming a value', () => {
    const parsed = parseAskBody({ question: 'What did you build?' });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.origin).toBeUndefined();
  });

  it('refuses anything else, including the server-only `unknown`', () => {
    // `unknown` means "the body carried no origin". A client that could send it would be
    // able to hide inside the bucket that exists to count clients that said nothing.
    expect(parseAskBody({ question: 'q', origin: 'unknown' }).ok).toBe(false);
    expect(parseAskBody({ question: 'q', origin: 'voice' }).ok).toBe(false);
    expect(parseAskBody({ question: 'q', origin: '' }).ok).toBe(false);
    expect(parseAskBody({ question: 'q', origin: 42 }).ok).toBe(false);
  });

  it('carries no free text: the whole vocabulary is four constants', () => {
    // `link` is `?ask=<memory-id>` -- an answer that was addressed rather than found. It is
    // deliberately not folded into `card`: an arrival by link is not evidence that the card
    // mechanism works, and `DIRECTION.md` decision 11 is the only thing this field is for.
    expect([...ASK_ORIGINS]).toEqual(['card', 'chip', 'typed', 'link']);
    // The counted set is the wire set plus the one value only the server writes.
    expect([...COUNTED_ORIGINS]).toEqual([...ASK_ORIGINS, 'unknown']);
  });
});

/* -- the counters -------------------------------------------------------------- */

describe('the counters', () => {
  it('do nothing, loudly or otherwise, with no REDIS_URL', () => {
    expect(process.env.REDIS_URL).toBeUndefined();
    expect(() => recordView({ ipHash: 'abc', bot: false })).not.toThrow();
    expect(() => recordAsk({ ipHash: 'abc', origin: 'card', depth: 1 })).not.toThrow();
    expect(() => recordStop('work')).not.toThrow();
    expect(() => recordOutcome('verified')).not.toThrow();
  });

  it('cuts the day in UTC, not in the container timezone', () => {
    // 2026-09-06 23:30 UTC is already the 7th in Singapore. The bucket is the 6th, and
    // stays the 6th when this container is redeployed somewhere else.
    expect(dayKey(new Date('2026-09-06T23:30:00Z'))).toBe('2026-09-06');
    expect(dayKey(new Date('2026-09-07T00:00:00Z'))).toBe('2026-09-07');
  });

  it('walks back one day at a time, newest first, without repeating one', () => {
    const days = recentDays(4, new Date('2026-03-02T06:00:00Z'));
    expect(days).toEqual(['2026-03-02', '2026-03-01', '2026-02-28', '2026-02-27']);
    expect(new Set(days).size).toBe(days.length);
  });
});

/* -- the report ---------------------------------------------------------------- */

describe('the honest ratio', () => {
  it('has no opinion without a denominator', () => {
    expect(proportion(0, 0)).toBeNull();
  });

  it('never leaves [0,100], which the normal approximation does at these sample sizes', () => {
    for (const [hits, total] of [
      [0, 1],
      [1, 40],
      [1, 3],
      [37, 812],
      [812, 812],
    ] as const) {
      const r = proportion(hits, total)!;
      expect(r.lo).toBeGreaterThanOrEqual(0);
      expect(r.hi).toBeLessThanOrEqual(100);
      expect(r.lo).toBeLessThanOrEqual(r.pct);
      expect(r.hi).toBeGreaterThanOrEqual(r.pct);
    }
  });

  it('narrows as the evidence grows', () => {
    const thin = proportion(1, 20)!;
    const thick = proportion(100, 2000)!;
    expect(thick.hi - thick.lo).toBeLessThan(thin.hi - thin.lo);
  });
});

function reading(over: Partial<InstrumentReading> = {}): InstrumentReading {
  return {
    days: [
      {
        day: '2026-09-06',
        views: 400,
        viewsBot: 120,
        viewers: 210,
        asks: 20,
        askers: 11,
        origin: { card: 12, chip: 5, typed: 3 },
        depth: { '1': 14, '2': 4, '3': 2 },
        stop: { work: 9, now: 6, contact: 5 },
        outcome: { verified: 15, salvaged: 3, unanswered: 2 },
      },
    ],
    uniqueViewers: 210,
    uniqueAskers: 11,
    reads: { failed: 0, total: 9 },
    ...over,
  };
}

describe('the window the report is asked for', () => {
  it('defaults to thirty days when nothing was asked for', () => {
    // Regression. The first version read `Number(null)` as 0, which is finite, and clamped
    // it UP to one day — so the default report silently answered a narrower question than
    // the one it was asked, which is this feature's own worst failure mode.
    expect(windowDays(null)).toBe(30);
    expect(windowDays('')).toBe(30);
    expect(windowDays('   ')).toBe(30);
    expect(windowDays('nonsense')).toBe(30);
    expect(windowDays('0')).toBe(30);
    expect(windowDays('-7')).toBe(30);
  });

  it('never asks for more than the counters keep', () => {
    expect(windowDays('7')).toBe(7);
    expect(windowDays('90')).toBe(90);
    expect(windowDays('365')).toBe(90);
  });
});

describe('the report', () => {
  it('tells "no store" apart from "nobody came"', () => {
    const none = formatReport(null);
    expect(none).toContain('NO STORE CONFIGURED');
    expect(none).not.toContain('0.0%');

    const empty = formatReport({
      days: [],
      uniqueViewers: 0,
      uniqueAskers: 0,
      reads: { failed: 0, total: 2 },
    });
    expect(empty).not.toContain('NO STORE CONFIGURED');
    expect(empty).toContain('nothing counted in this window');
  });

  it('refuses to let an unreachable store read as a site nobody visited', () => {
    /*
     * The defect this assertion exists for was found on the first live run of the code:
     * REDIS_URL pointed at a compose hostname that does not resolve outside the compose
     * network, `pipeline.exec()` resolved with an error in every entry rather than
     * rejecting, and the report printed a spotless page of zeroes. That page was a
     * confident answer to the one question this whole feature was built to settle.
     */
    const broken = formatReport({
      days: [
        {
          day: '2026-09-06',
          views: 0,
          viewsBot: 0,
          viewers: 0,
          asks: 0,
          askers: 0,
          origin: {},
          depth: {},
          stop: {},
          outcome: {},
        },
      ],
      uniqueViewers: 0,
      uniqueAskers: 0,
      reads: { failed: 9, total: 9 },
    });
    expect(broken).toContain('9 of 9 reads FAILED');
    expect(broken).toContain('Do not read');
    // The warning must come before the numbers it invalidates, not in a footnote.
    expect(broken.indexOf('FAILED')).toBeLessThan(broken.indexOf('DOES ANYONE ASK AT ALL'));
  });

  it('never prints a ratio without the counts it came from', () => {
    const text = formatReport(reading());
    // 20 asks over 400 views. Both numbers appear on the line with the percentage.
    const askLine = text.split('\n').find((l) => l.includes('asks per page view'))!;
    expect(askLine).toContain('20');
    expect(askLine).toContain('400');
    expect(askLine).toMatch(/\d+\.\d%/);
    expect(askLine).toContain('95%:');
  });

  it('says outright when an interval is too wide to answer the question it was built for', () => {
    const thin = formatReport(
      reading({
        days: [{ ...reading().days[0], views: 12, asks: 1, origin: { typed: 1 }, depth: { '1': 1 } }],
        uniqueViewers: 9,
        uniqueAskers: 1,
      }),
    );
    expect(thin).toContain('too thin to mean anything yet');
  });

  it('prints a zero row rather than dropping it, because a zero is a finding', () => {
    const text = formatReport(
      reading({ days: [{ ...reading().days[0], origin: { typed: 20 } }] }),
    );
    // "nobody has ever pressed a card" has to be visible as a row, not as an absence.
    expect(text).toMatch(/card\s+0\s+0%/);
    expect(text).toMatch(/chip\s+0\s+0%/);
  });

  it('keeps the limits of the thing in the thing', () => {
    const text = formatReport(reading());
    expect(text).toContain('WHAT THIS CANNOT TELL YOU');
    expect(text).toContain('A session.');
    // The prior it is meant to be compared against, so a reader cannot forget what the
    // number was supposed to settle.
    expect(text).toContain('2-8%');
    // Crawler views are named and excluded rather than quietly folded in.
    expect(text).toContain('120 further views came');
  });
});

/* -- the wire, end to end ------------------------------------------------------ */

function modelSaying(text: string) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start', id: 't1' },
          { type: 'text-delta', id: 't1', delta: text },
          { type: 'text-end', id: 't1' },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: undefined },
            logprobs: undefined,
            usage: {
              inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: 20, text: 20, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

type Recorded = {
  asks: { origin: AskOrigin; depth: number; ipHash: string | null }[];
  stops: string[];
  outcomes: AskOutcome[];
};

function withRecorder(overrides: Partial<AskDeps> = {}): { deps: AskDeps; got: Recorded } {
  const got: Recorded = { asks: [], stops: [], outcomes: [] };
  const deps: AskDeps = {
    ...defaultDeps,
    hasApiKey: () => true,
    admit: async () => ({ ok: true }),
    askModel: () => ({ model: modelSaying('Yes.'), providerOptions: { openrouter: { models: [] } } }),
    instrument: {
      ask: (o) => got.asks.push(o),
      stop: (s) => got.stops.push(s),
      outcome: (o) => got.outcomes.push(o),
    },
    ...overrides,
  };
  return { deps, got };
}

function post(body: unknown): Request {
  return new Request('http://test/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
    body: JSON.stringify(body),
  });
}

/** Drains the stream so the handler's end-of-stream recording has actually happened. */
async function drain(res: Response): Promise<void> {
  await res.text();
}

describe('the handler counts what it claims to', () => {
  it('records the origin it was given, once, and nothing else', async () => {
    for (const origin of ASK_ORIGINS) {
      const { deps, got } = withRecorder();
      await drain(await handleAsk(post({ question: 'What shipped at Taboola?', origin }), deps));
      expect(got.asks).toHaveLength(1);
      expect(got.asks[0].origin).toBe(origin);
    }
  });

  it('records a body with no origin as `unknown`, not as `typed`', async () => {
    const { deps, got } = withRecorder();
    await drain(await handleAsk(post({ question: 'What shipped at Taboola?' }), deps));
    expect(got.asks[0].origin).toBe('unknown');
  });

  it('counts the question before admission, so a throttled visitor still asked', async () => {
    const { deps, got } = withRecorder({
      admit: async () => ({ ok: false, reason: 'ip-burst', retryAfterSeconds: 30 }),
    });
    await drain(await handleAsk(post({ question: 'What shipped at Taboola?', origin: 'card' }), deps));
    // The ask is counted; the refusal is recorded separately. An instrument that counted
    // only admitted asks would report a rate that FALLS exactly when interest rises.
    expect(got.asks).toHaveLength(1);
    expect(got.outcomes).toEqual(['throttled']);
  });

  it('carries the depth of the conversation the question arrived in', async () => {
    const turn = { q: 'What did you build?', a: 'Several things.' };
    const { deps, got } = withRecorder();
    await drain(await handleAsk(post({ question: 'And after that?', history: [turn, turn] }), deps));
    expect(got.asks[0].depth).toBe(3);
  });

  it('hashes the address rather than recording it, and every recorded outcome is a known one', async () => {
    const { deps, got } = withRecorder();
    await drain(await handleAsk(post({ question: 'What shipped at Taboola?', origin: 'typed' }), deps));
    const hash = got.asks[0].ipHash;
    expect(hash).not.toBe('203.0.113.7');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(got.stops.length).toBe(1);
    for (const outcome of got.outcomes) expect(ASK_OUTCOMES).toContain(outcome);
  });
});
