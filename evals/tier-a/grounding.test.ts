/**
 * Tier-A eval for the grounding guard.
 *
 * `evals/tier-a/claims.test.ts` scans AUTHORED copy for six known fabrications with a
 * curated pattern list. This file guards the other direction: GENERATED copy, against
 * rules rather than a blocklist, so a seventh fabrication nobody has written yet is
 * caught the first time a model says it.
 *
 * The corpus is the real one, loaded through loadMemories(). Fixtures are frozen in
 * `grounding.fixtures.ts` and shared with `npm run guard:eval`.
 *
 * Three properties, in descending order of how much they matter:
 *
 *   1. The seven sentences that have actually fabricated something all fire.
 *   2. The nine true sentences, including two paraphrases, all pass.
 *   3. Ten benign first-person sentences produce nothing -- plus every memory body in the
 *      corpus, guarded against the corpus, which is the strongest false-positive test
 *      available and needs no fixtures to stay current.
 */
import { describe, expect, it } from 'vitest';
import { loadMemories } from '../../lib/corpus/load';
import { guard, salvage, salvageDetailed } from '../../lib/grounding/guard';
import { buildGazetteer, extractEntities } from '../../lib/grounding/entities';
import { extractQuantities, sameQuantity, type Quantity } from '../../lib/grounding/numbers';
import { normalise, sentences } from '../../lib/grounding/text';
import {
  falsePositives,
  MAX_FALSE_POSITIVE_RATE,
  renderTable,
  runFixtures,
  BENIGN,
  MUST_FIRE,
  MUST_PASS,
} from './grounding.fixtures';

const CORPUS = loadMemories();
const ROWS = runFixtures();
const TABLE = `\n${renderTable(ROWS)}\n`;

describe('the fixture table', () => {
  it('is the table it claims to be', () => {
    expect(MUST_FIRE).toHaveLength(7);
    expect(MUST_PASS).toHaveLength(10);
    expect(BENIGN).toHaveLength(10);
    expect(ROWS).toHaveLength(27);
  });

  it('lands every row', () => {
    expect(ROWS.filter((r) => !r.ok).map((r) => r.answer), TABLE).toEqual([]);
  });

  it.each(ROWS.map((r) => [`${r.group}: ${r.answer}`, r] as const))('%s', (_label, row) => {
    expect(row.actual, `expected ${row.expected} -- ${row.why}${TABLE}`).toBe(row.expected);
  });
});

describe('violations explain themselves', () => {
  it('names the licensed alternative when the number is real but the subject is wrong', () => {
    const answer = 'The APAC Ads Interface revamp cut client setup time roughly in half.';
    const [violation] = guard(answer, CORPUS).violations;
    expect(violation.kind).toBe('mispaired-quantity');
    expect(violation.suggestion).toContain('kinnect');
    expect(violation.suggestion).toContain('project-kinnect-automation');
    expect(violation.suggestion).toContain('apac ads interface');
  });

  it('counts what it looked at', () => {
    const result = guard('At Canon I drove a 5x lift in awareness across 12 markets.', CORPUS);
    expect(result.checked).toEqual({ sentences: 1, quantities: 2, entities: 1 });
  });
});

describe('pronoun carry-over', () => {
  it('lets a follow-up sentence inherit the subject it is obviously about', () => {
    const answer = 'At Kinnect I automated the reporting. It cut report generation time by half.';
    expect(guard(answer, CORPUS).violations).toEqual([]);
  });

  it('does not let carry-over launder the number onto a different subject', () => {
    const answer = 'At Taboola I revamped the APAC Ads Interface. It cut setup time by half.';
    expect(guard(answer, CORPUS).violations.map((v) => v.kind)).toEqual(['mispaired-quantity']);
  });

  /*
   * MEASURED, 2026-09-06, on ten live answers: the guard removed 11.5% of everything the
   * model wrote, and 16 of the 20 violations were true content. Nine of the twenty came
   * from this one shape -- the corpus states a figure in a sentence naming nobody, and the
   * guard bound it to whatever the model had named in the paragraph ABOVE. "Give me the
   * full story of the Paxel report" lost 22% of itself that way, every figure of it true.
   *
   * `content/system-prompt.md` asks for a break where the subject changes, so the break is
   * where the subject stops carrying.
   */
  it('stops carrying a subject across a paragraph break, because the prompt asks for one there', () => {
    const oneParagraph =
      'I worked on the Paxel assessment with Claude Code. I shipped 208,803 lines across 993 commits.';
    const twoParagraphs =
      'I worked on the Paxel assessment with Claude Code.\n\nI shipped 208,803 lines across 993 commits.';
    expect(guard(oneParagraph, CORPUS).violations.map((v) => v.kind)).toEqual([
      'mispaired-quantity',
      'mispaired-quantity',
    ]);
    expect(guard(twoParagraphs, CORPUS).violations).toEqual([]);
  });

  /*
   * The cost of the rule above, pinned rather than described, so that anyone widening it
   * further has to walk past this. A figure the corpus states without naming anyone can be
   * attached to a subject named in an EARLIER paragraph and pass. Nineteen of the corpus's
   * 107 quantities sit in sentences like that, all of them in the three "here are the
   * numbers" memories, and it takes both memories being inside `topLicences` to reach.
   * Inside one paragraph -- which is how a model actually writes a claim about a client --
   * it is still caught, which is the assertion above this one.
   */
  it('records what paragraph scoping gives up: a figure the corpus never attributed', () => {
    const acrossTheBreak =
      'At Taboola I revamped the APAC Ads Interface.\n\nI shipped 208,803 lines across 993 commits.';
    const sameParagraph =
      'At Taboola I revamped the APAC Ads Interface. I shipped 208,803 lines across 993 commits.';
    expect(guard(acrossTheBreak, CORPUS).violations).toEqual([]);
    expect(guard(sameParagraph, CORPUS).violations.map((v) => v.kind)).toEqual([
      'mispaired-quantity',
      'mispaired-quantity',
    ]);
  });
});

/**
 * The corpus is the licence, so the corpus must license itself. This catches an
 * extraction change that starts seeing quantities nobody wrote, without anyone having to
 * add a fixture -- and it stays current for free as memories are added.
 */
describe('no false positives on authored prose', () => {
  it.each(CORPUS.map((m) => [m.id, m.body] as const))('%s guards clean', (_id, body) => {
    const result = guard(body, CORPUS);
    expect(result.violations.map((v) => `[${v.kind}] ${v.detail} :: ${v.sentence}`)).toEqual([]);
  });
});

/**
 * THE NUMBER THIS FILE DID NOT HAVE.
 *
 * Every assertion above is a row the guard is supposed to get right, so the suite could
 * only ever report that the guard works. The failure that actually costs this site answers
 * runs the other way: a correct answer arrives, the guard objects to a true sentence, and
 * salvage deletes it with nothing on the wire but a verdict. Measured 2026-09-06 over ten
 * live answers, the guard removed 11.5% of everything the model wrote and 16 of its 20
 * violations were true content -- and no test in this repository could have said so.
 *
 * `TRUE_PARAPHRASES` is that population, and it is scored rather than gated, because a
 * pass/fail table can only ever hold rows that already pass.
 */
describe('what the guard takes from prose that is true', () => {
  const report = falsePositives();

  it(`rejects no more than ${(MAX_FALSE_POSITIVE_RATE * 100).toFixed(0)}% of it`, () => {
    const detail = report.rows
      .filter((r) => r.removed)
      .map((r) => `  ${r.answer.replace(/\n+/g, ' / ')}\n      true because: ${r.why}`)
      .join('\n');
    expect(
      report.rate,
      `the guard rejects ${(100 * report.rate).toFixed(1)}% of prose that is true by ` +
        `construction (${report.removed} of ${report.chars} characters).\n${detail}\n` +
        'Run `npm run guard:eval` for the violations. If this rose, a true sentence is now ' +
        'being deleted from real answers; the ceiling is not the thing to raise.',
    ).toBeLessThanOrEqual(MAX_FALSE_POSITIVE_RATE);
  });

  it('is measuring a population that can actually fail', () => {
    // A regression set trimmed to rows the guard already passes measures nothing. If this
    // ever reaches zero the rows have been fixed, and the ceiling should come down with it.
    expect(report.rows.length).toBeGreaterThanOrEqual(6);
    expect(report.rows.some((r) => r.removed === 0)).toBe(true);
  });

  it('finds every memory guardable against the memories its own card question retrieves', () => {
    // The live path's licensing, not the whole corpus: `handleAsk` passes retrieval's hits
    // and `topLicences: 3`. The two memories it skips are named in the report rather than
    // dropped, because their own card question retrieves nothing at all.
    expect(report.corpus.rejected, 'the corpus cannot license its own prose').toEqual([]);
    expect(report.corpus.checked).toBeGreaterThanOrEqual(CORPUS.length - 4);
  });
});

describe('a date is never a claim, however it is punctuated', () => {
  // MJK asked about his education and was given an answer that skipped a degree. The model
  // had written it correctly; the guard deleted the sentence. `raw` arrives with whatever
  // followed the digits, so "2012," failed the bare-year test, became a count of 2012,
  // matched nothing, and took its sentence with it. The corpus writes years exactly this
  // way -- "Brunel University London, 2012, Merit" -- so the rule was failing on the
  // shape it was written for.
  it.each(['2012,', '2012.', '(2012)', '2012;', '2012:', '2012?', '2012"'])(
    'reads %s as a date and not as a quantity',
    (token) => {
      expect(extractQuantities(`I finished at Brunel in ${token} with a Merit.`)).toEqual([]);
    },
  );

  it('keeps a real count that happens to sit in the year range', () => {
    // The exclusion is deliberately blind to "2000 users"; it must not become blind to
    // every four-digit number by widening the strip.
    expect(extractQuantities('We shipped 2,000 images.').length).toBeGreaterThan(0);
  });

  it('guards every memory in the corpus against the corpus itself', () => {
    // The broadest statement of the same defect: MJK's own writing, checked against his
    // own writing, must never produce a violation. Punctuated years are everywhere in it.
    const all = loadMemories();
    const failed = all.filter((m) => !guard(m.body, all).ok).map((m) => m.id);
    expect(failed, `memories the guard rejects: ${failed.join(', ')}`).toEqual([]);
  });
});

describe('salvage', () => {
  const good = [
    'At Kinnect I automated reporting with Supermetrics and Looker Studio and cut report generation time by half.',
    'I founded Krunch Labs in January 2025 in Singapore.',
    'The Laughing Cow saw a 5% average lift in brand awareness.',
  ];
  const bad = [
    'At Canon I drove a 5x lift in awareness across 12 markets.',
    'I worked at Kinnect, Isobar and Taboola.',
    'Payments expansion across five new APAC markets.',
  ];
  const salvaged = (parts: string[]) => {
    const answer = parts.join(' ');
    return salvage(answer, guard(answer, CORPUS));
  };

  it('returns a clean answer unchanged', () => {
    expect(salvaged(good)).toBe(good.join(' '));
  });

  it('drops the violating sentence and keeps the rest', () => {
    const kept = salvaged([good[0], good[1], bad[0], good[2]]);
    expect(kept).toBe([good[0], good[1], good[2]].join(' '));
  });

  it('keeps going at exactly half', () => {
    expect(salvaged([good[0], bad[0], good[1], bad[1]])).toBe([good[0], good[1]].join(' '));
  });

  it('refuses when fewer than half survive', () => {
    // Three sentences that must go outright: a mispaired multiple, an unknown employer,
    // and a doubled spend for the wrong client. Two of five is not an answer.
    const doubled = 'For The Laughing Cow I doubled spend.';
    expect(salvaged([good[0], good[1], bad[0], bad[1], doubled])).toBeNull();
  });

  it('removes a counted word the corpus never counted, and keeps the sentence', () => {
    // "five new APAC markets" is the shape that shipped. The count is unbacked; the rest of
    // the sentence is not a claim the guard can fault, so the number goes and the words stay.
    expect(salvaged([good[0], bad[2]])).toBe([good[0], 'Payments expansion across new APAC markets.'].join(' '));
    const answer = [good[0], bad[2]].join(' ');
    expect(salvageDetailed(answer, guard(answer, CORPUS))).toEqual({
      text: [good[0], 'Payments expansion across new APAC markets.'].join(' '),
      dropped: 0,
      redacted: 1,
    });
  });

  it('keeps a single surviving sentence when it is long enough to be an answer', () => {
    expect(salvaged([good[0], bad[0]])).toBe(good[0]);
  });

  it('refuses when the one sentence left is too short to stand alone', () => {
    expect(salvaged([good[1], bad[0]])).toBeNull();
  });
});

describe('the parts, where the guard would fail quietly', () => {
  it('splits sentences without splitting abbreviations or decimals', () => {
    expect(sentences('Dr. Kondekeril shipped it. Spend rose 2.5x, e.g. in Korea. Done.')).toEqual([
      'Dr. Kondekeril shipped it.',
      'Spend rose 2.5x, e.g. in Korea.',
      'Done.',
    ]);
  });

  it('splits on a company suffix, because the corpus ends a sentence with one', () => {
    expect(sentences('Canon and Evian at The Triad Co. 5x ROAS for Evian.')).toHaveLength(2);
  });

  it('normalises the characters that look identical and match differently', () => {
    expect(normalise('  5×  GROWTH — “up”  ')).toBe('5x growth - "up"');
  });

  const q = (raw: string): Quantity => {
    const [found] = extractQuantities(raw);
    expect(found, `nothing extracted from "${raw}"`).toBeDefined();
    return found;
  };

  it.each([
    ['5x', '5×'],
    ['5x', 'a five-fold increase'],
    ['5x', 'an increase of 5 times'],
    ['cut by half', 'halved'],
    ['cut by half', 'down 50%'],
  ])('reads %s and %s as the same claim', (a, b) => {
    expect(sameQuantity(q(a), q(b))).toBe(true);
  });

  it.each([
    ['5x', 'down 50%'],
    ['12 markets', '12 tools'],
    ['five markets', 'from two to five'],
  ])('keeps %s and %s apart', (a, b) => {
    expect(sameQuantity(q(a), q(b))).toBe(false);
  });

  it('reads a range as both of its endpoints', () => {
    expect(extractQuantities('I grew the team from two to five.').map((x) => x.value)).toEqual([2, 5]);
    expect(extractQuantities('Team grew 2 → 5.').map((x) => x.value)).toEqual([2, 5]);
  });

  it('reads the shapes a resume actually uses', () => {
    const shapes: [string, number][] = [
      ['25M in spend', 25_000_000],
      ['25 million viewers', 25_000_000],
      ['27 MCP tools', 27],
      ['four services', 4],
      ['$50,000 in budget', 50_000],
      ['a top-3 finish', 3],
      ['two thirds of the work', 2 / 3],
      ['without breaking a single account', 0],
      ['a week of analyst work', 1],
    ];
    expect(shapes.map(([text]) => q(text).value)).toEqual(shapes.map(([, value]) => value));
  });

  it('does not read grammar as arithmetic', () => {
    expect(extractQuantities('That was one of the first things I built.')).toEqual([]);
    expect(extractQuantities('A global two-factor authentication launch.')).toEqual([]);
  });

  it('does not mistake a year, a date range or a product number for a claim', () => {
    expect(extractQuantities('I founded it in January 2025.')).toEqual([]);
    expect(extractQuantities('Four years at Omnicom, from 2013 to 2017.').map((x) => x.value)).toEqual([4]);
    expect(extractQuantities('A company-wide 2FA rollout.')).toEqual([]);
  });

  /*
   * The extractor may not invent a smaller number out of a larger one.
   *
   * "20-plus products" ran the digit class greedily onto "20", failed the old lookahead on
   * the hyphen, backtracked to "2" -- where the next character is a digit the old class
   * allowed -- and reported a count of 2. Nothing licenses a 2, so a true sentence was
   * removed from a live answer on 2026-09-06. The corpus writes the same fact as "20+
   * products", so the two spellings have to arrive as one claim.
   */
  it.each([
    ['across 20-plus products', 20],
    ['30-plus markets', 30],
    ['across 20+ products', 20],
    ['100+ users', 100],
  ])('reads %s as %i and never as its first digit', (text, value) => {
    expect(extractQuantities(text).map((x) => x.value)).toEqual([value]);
  });

  it('licenses the corpus’s "20+" against the ordinary English the model writes', () => {
    expect(sameQuantity(q('across 20-plus products'), q('across 20+ products'))).toBe(true);
  });

  it('treats the corpus as a closed world of names', () => {
    const gazetteer = buildGazetteer(CORPUS);
    expect(extractEntities('I worked at Kinnect, Isobar and Taboola.', gazetteer)).toEqual({
      known: ['kinnect', 'taboola'],
      unknown: ['Isobar'],
    });
  });

  it('does not accuse the first word of a sentence of being a company', () => {
    const gazetteer = buildGazetteer(CORPUS);
    expect(extractEntities('Payments expansion across five new APAC markets.', gazetteer).unknown).toEqual([]);
  });
});
