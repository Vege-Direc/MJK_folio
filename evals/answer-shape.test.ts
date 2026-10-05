/**
 * The two defects MJK found on the live site, in one screenshot.
 *
 * `evals/tier-a/grounding.test.ts` asks whether the guard reaches the right VERDICT. This
 * file asks what the visitor ends up READING, which is a different question and is the one
 * the screenshot answered badly:
 *
 *   1. "Clips run , or fifteen seconds, with motion kept deliberately small." Two true
 *      numbers were cut out of a true sentence and their punctuation left standing.
 *   2. An answer with no ceiling on it. Measured 2026-09-06 over 20 real calls, the
 *      longest came back at 5,326 characters -- about 4.8 screens of the desktop answer
 *      column, against a repo measurement of ~1,100 characters to the screen.
 *
 * Both are defects of SHAPE rather than of truth, and nothing in the suite was looking at
 * shape. Neither of these fixtures is invented: the sentence is the one from the
 * screenshot and the numbers are from a sampling run recorded in the commit that added
 * this file.
 */


import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { defaultDeps, handleAsk, type AskDeps } from '../lib/ask/handler';
import type { EnvelopeData } from '../lib/ask/types';
import { loadMemories } from '../lib/corpus/load';
import { guard, salvageDetailed, type GuardResult } from '../lib/grounding/guard';
import { extractQuantities, type Quantity } from '../lib/grounding/numbers';
import { sentences } from '../lib/grounding/text';

const CORPUS = loadMemories();

/**
 * What a redaction leaves behind when it takes a word and not the punctuation that held
 * it: a clause opening on a comma, a space in front of one, two in a row, or a pair of
 * coordinators with nothing between them. Every one of these is a thing the page would
 * print, and a page that prints them looks like it cannot write.
 */
const SCAR = /^\s*[,;:]|\s[,;:]|,\s*,|\b(?:and|or|nor)\s+(?:and|or|nor)\b/;

/** The verdict shape `salvageDetailed` reads, built around one quantity in one sentence. */
const flag = (sentence: string, quantity: Quantity): GuardResult => ({
  ok: false,
  checked: { sentences: 1, quantities: 1, entities: 0 },
  violations: [{ sentence, kind: 'unlicensed-quantity', detail: 'fixture', quantity }],
});

/**
 * `isCountedWord` is private to the guard, so its rule is restated here rather than
 * exported: a small bare count is the only violation salvage is allowed to redact instead
 * of dropping the sentence. If the two ever disagree, this file tests a path that no
 * longer exists, which is worse than a red build -- so `redactable` fixtures below assert
 * against the real salvage, never against this predicate.
 */
const counted = (q: Quantity) => q.kind === 'count' && q.value <= 12 && /^(?:[a-z]+|\d{1,2})$/i.test(q.raw.trim());

/* -- the answer path, with a model that stops because it ran out of room ------- */

const post = (body: unknown) =>
  new Request('http://test/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  });

/** A model that streams `text` and then reports the cap, not a chosen ending. */
const capped = (text: string): AskDeps => ({
  ...defaultDeps,
  hasApiKey: () => true,
  admit: async () => ({ ok: true }),
  askModel: () => ({
    model: new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: 't1' },
            { type: 'text-delta', id: 't1', delta: text },
            { type: 'text-end', id: 't1' },
            {
              type: 'finish',
              finishReason: { unified: 'length', raw: undefined },
              logprobs: undefined,
              usage: {
                inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
                outputTokens: { total: 600, text: 600, reasoning: undefined },
              },
            },
          ],
        }),
      }),
    }),
    providerOptions: { openrouter: { models: [] } },
  }),
});

type Chunk = { type: string; [k: string]: unknown };

async function chunksOf(res: Response): Promise<Chunk[]> {
  expect(res.status).toBe(200);
  const body = await res.text();
  return body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice('data: '.length).trim())
    .filter((s) => s && s !== '[DONE]')
    .map((s) => JSON.parse(s) as Chunk);
}

const envelopes = (chunks: Chunk[]) =>
  chunks.filter((c) => c.type === 'data-envelope').map((c) => c.data as EnvelopeData);

const streamedText = (chunks: Chunk[]) =>
  chunks.filter((c) => c.type === 'text-delta').map((c) => String(c.delta ?? '')).join('');

describe('the sentence from the screenshot', () => {
  const OFFENDING = 'Clips run five, ten or fifteen seconds, with motion kept deliberately small.';
  const LICENCES = CORPUS.filter((m) => m.id.startsWith('jewelai'));

  it('is licensed, because an elided series states its noun once', () => {
    // content/memories.yaml writes it unelided -- "five seconds, ten seconds or fifteen
    // seconds long" -- and the model wrote the ordinary English form. All three durations
    // are the corpus's own; none of them may be reported as unlicensed.
    expect(guard(OFFENDING, LICENCES, { topLicences: 3 }).violations).toEqual([]);
  });

  it('carries the unit through the whole series', () => {
    expect(extractQuantities(OFFENDING).map((q) => [q.raw, q.unit])).toEqual([
      ['five', 'seconds'],
      ['ten', 'seconds'],
      ['fifteen', 'seconds'],
    ]);
  });

  it('is dropped whole, never printed with the commas left behind', () => {
    // The verdict below is what the guard produced BEFORE the extractor learned about
    // elision: "five" and "ten" unlicensed, "fifteen" fine. Salvage used to answer it with
    // "Clips run , or fifteen seconds" -- so the redaction path is exercised here directly,
    // and stays exercised even though the guard no longer reaches this verdict on its own.
    const answer = `${OFFENDING} Three video models sit behind one interface and the pipeline falls through them in order.`;
    const asItWas: GuardResult = {
      ok: false,
      checked: { sentences: 2, quantities: 4, entities: 1 },
      violations: [
        { sentence: OFFENDING, kind: 'unlicensed-quantity', detail: 'fixture', quantity: { raw: 'five', kind: 'count', value: 5, unit: 'seconds' } },
        { sentence: OFFENDING, kind: 'unlicensed-quantity', detail: 'fixture', quantity: { raw: 'ten', kind: 'count', value: 10, unit: 'seconds' } },
      ],
    };
    const kept = salvageDetailed(answer, asItWas);
    expect(kept?.text).not.toContain('Clips run');
    expect(kept?.text).not.toMatch(SCAR);
    expect(kept).toMatchObject({ dropped: 1, redacted: 0 });
  });
});

describe('a redaction leaves no mark, or it does not happen', () => {
  // Position, not shape, is what decides. The first two are determiner position and are
  // the case the redaction was written for; every other row is a number wearing a
  // grammatical role that cannot be vacated.
  const CASES: [string, string, string | null][] = [
    ['Payments expansion across five new APAC markets.', 'five', 'Payments expansion across new APAC markets.'],
    ['I ran three rollouts across the region.', 'three', 'I ran rollouts across the region.'],
    ['Clips run five, ten or fifteen seconds, with motion kept small.', 'five', null],
    ['Clips run five, ten or fifteen seconds, with motion kept small.', 'ten', null],
    ['Clips run five, ten or fifteen seconds, with motion kept small.', 'fifteen', null],
    ['I grew the team to five people over that stretch.', 'five', null],
    ['Five clips run in the batch and each one is checked.', 'five', null],
    ['We shipped more than three rollouts in that year.', 'three', null],
    ['I built three and shipped four of them that quarter.', 'three', null],
  ];

  // A second sentence, always clean, so the half-survival bar is never what decides the row.
  const KEEP = 'I keep this sentence so the survival bar is not what is being measured here.';

  it.each(CASES)('%s  [%s]', (sentence, raw, expected) => {
    const quantity = extractQuantities(sentence).find((q) => q.raw.trim() === raw);
    expect(quantity, `nothing extracted for "${raw}"`).toBeDefined();
    const kept = salvageDetailed(`${sentence} ${KEEP}`, flag(sentence, quantity!));
    const got = kept?.text.replace(` ${KEEP}`, '') ?? null;
    expect(got).toBe(expected === null ? KEEP : expected);
    if (kept) expect(kept.text).not.toMatch(SCAR);
  });
});

describe('no answer the site can build carries a redaction scar', () => {
  /**
   * The strongest version of the property available without fixtures: take every small
   * bare count in every memory body -- MJK's own prose, the closest thing to a real
   * answer this repository holds -- flag it, and demand that whatever salvage returns
   * reads as English.
   */
  const cases = CORPUS.flatMap((memory) =>
    sentences(memory.body).flatMap((sentence) =>
      extractQuantities(sentence)
        .filter(counted)
        .map((quantity) => ({ id: memory.id, sentence, quantity })),
    ),
  );

  it('has something to check', () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases.map((c) => [`${c.id}: ${c.quantity.raw}`, c] as const))('%s', (_label, c) => {
    const kept = salvageDetailed(`${c.sentence} It is worth keeping this second sentence around.`, flag(c.sentence, c.quantity));
    if (kept) expect(kept.text, c.sentence).not.toMatch(SCAR);
  });
});

describe('the note the visitor is shown counts what was actually taken', () => {
  it('counts numbers, not sentences', () => {
    // Two numbers out of one sentence used to report `redacted: 1`, and lib/ask/handler.ts
    // renders that as "one number removed" on the page.
    const sentence = 'I ran three rollouts and shipped four releases in the region.';
    const [a, b] = extractQuantities(sentence);
    const kept = salvageDetailed(`${sentence} A second sentence, so that half of them survive the pass.`, {
      ok: false,
      checked: { sentences: 2, quantities: 2, entities: 0 },
      violations: [
        { sentence, kind: 'unlicensed-quantity', detail: 'fixture', quantity: a },
        { sentence, kind: 'unlicensed-quantity', detail: 'fixture', quantity: b },
      ],
    });
    expect(kept?.redacted).toBe(2);
    expect(kept?.text).toContain('I ran rollouts and shipped releases in the region.');
  });
});

describe('the answer has a ceiling', () => {
  const PROMPT = readFileSync(join(process.cwd(), 'content', 'system-prompt.md'), 'utf-8');
  const HANDLER = readFileSync(join(process.cwd(), 'lib', 'ask', 'handler.ts'), 'utf-8');

  it('is named to the model, even though this model does not listen to it', () => {
    // The prompt used to read "There is no length you are aiming at", which is an explicit
    // licence for the 5,326-character answer. Removing that is right on its own terms.
    // A/B'd uncapped at three runs a side, the stated ceiling moved the mean from 4,508 to
    // 4,586 characters -- no effect -- so the cap below is what actually holds the line.
    expect(PROMPT).not.toContain('There is no length you are aiming at');
    expect(PROMPT).toMatch(/five paragraphs/i);
    expect(PROMPT).toMatch(/350 words/);
  });

  it('is backed by a cap the request itself carries', () => {
    // Not a behaviour a mock model can show -- `maxOutputTokens` is enforced by the
    // provider, not by this repository -- so the assertion is that the request carries it.
    expect(HANDLER).toMatch(/maxOutputTokens: MAX_OUTPUT_TOKENS/);
    expect(HANDLER).toMatch(/const MAX_OUTPUT_TOKENS = \d+/);
  });

  it('backs a truncated answer up to its last full stop before the page sees it', async () => {
    // What the visitor must never read is the half sentence that was in flight when the
    // cap fired. The model here stops mid-word, exactly as a cap makes it.
    const cut = 'I founded Krunch Labs in January 2025 in Singapore. I build systems that do the work inst';
    const res = await handleAsk(post({ question: 'what is krunch labs' }), capped(cut));
    const body = envelopes(await chunksOf(res)).at(-1)?.body;
    expect(body).toBe('I founded Krunch Labs in January 2025 in Singapore.');
  });

  it('leaves the answer alone when backing up would cost more than half of it', async () => {
    // One short sentence and then a long one that never lands. Trading three quarters of
    // an answer for a tidy ending is the worse of the two defects, so the fragment stays
    // and the visitor keeps what they watched arrive.
    const cut =
      'I build systems that do the work instead of describing it. ' +
      'I would rather delete code than defend it and I read the logs before I trust the dashboard and ' +
      'I write the failure mode down before I write the feature and I keep the loop short and the surf';
    const res = await handleAsk(post({ question: 'what is krunch labs' }), capped(cut));
    const chunks = await chunksOf(res);
    expect(streamedText(chunks)).toBe(cut);
    // No rewrite, so the clean answer carries no body and the streamed prose stands.
    expect(envelopes(chunks).at(-1)?.body).toBeUndefined();
  });
});
