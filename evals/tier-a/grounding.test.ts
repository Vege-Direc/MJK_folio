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
import { renderTable, runFixtures, BENIGN, MUST_FIRE, MUST_PASS } from './grounding.fixtures';

const CORPUS = loadMemories();
const ROWS = runFixtures();
const TABLE = `\n${renderTable(ROWS)}\n`;

describe('the fixture table', () => {
  it('is the table it claims to be', () => {
    expect(MUST_FIRE).toHaveLength(7);
    expect(MUST_PASS).toHaveLength(9);
    expect(BENIGN).toHaveLength(10);
    expect(ROWS).toHaveLength(26);
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
