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


import { describe, expect, it } from 'vitest';
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
