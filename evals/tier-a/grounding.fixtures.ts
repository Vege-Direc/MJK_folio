/**
 * The frozen fixture table for the grounding guard.
 *
 * Shared by `evals/tier-a/grounding.test.ts` (the gate) and `scripts/guard-eval.ts` (the
 * readable report), because a fixture table that exists twice is a fixture table that
 * disagrees with itself by Thursday.
 *
 * MUST_FIRE is not hypothetical. Rows 1-6 are the fabrications this repo has actually
 * shipped, transcribed from `evals/tier-a/claims.test.ts`'s RETIRED_CLAIMS list. Row 7 is
 * what the live model said today about the Taboola APAC Ads Interface. Nothing here was
 * invented to make the guard look good.
 *
 * The guard runs against the REAL corpus via loadMemories(). No fixture corpus, because a
 * fixture corpus is a place for the guard to be right about a world that does not ship.
 */
import { loadMemories } from '../../lib/corpus/load';
import { guard, salvage, type Violation } from '../../lib/grounding/guard';

export type Fixture = {
  answer: string;
  /** Kinds that MUST appear. Empty means the answer must pass clean. */
  expect: Violation['kind'][];
  why: string;
};

/** Every one of these reached a screen, or a smoke test, as a first-person fact. */
export const MUST_FIRE: Fixture[] = [
  {
    answer: 'At Canon I drove a 5x lift in awareness across 12 markets.',
    expect: ['mispaired-quantity', 'unlicensed-quantity'],
    why: '5x is Evian’s ROAS, not Canon’s awareness; 12 markets was never measured',
  },
  {
    answer: 'For The Laughing Cow I doubled spend.',
    expect: ['mispaired-quantity'],
    why: '2x spend is licensed across The Triad Co’s clients in aggregate, not for one brand',
  },
  {
    answer: 'Payments expansion across five new APAC markets.',
    expect: ['unlicensed-quantity'],
    why: 'the corpus names two markets, Korea and Indonesia',
  },
  {
    answer: 'A company-wide 2FA rollout that landed without breaking a single advertiser account.',
    expect: ['unlicensed-quantity'],
    why: 'zero breakage is a measured claim and nobody measured it',
  },
  {
    answer: 'A week of analyst work per client, per month, replaced.',
    expect: ['unlicensed-quantity'],
    why: 'the corpus licenses "by half" on report generation time; the week was never measured',
  },
  {
    answer: 'I worked at Kinnect, Isobar and Taboola.',
    expect: ['unknown-entity'],
    why: 'Isobar appears nowhere in the corpus',
  },
  {
    answer: 'The APAC Ads Interface revamp cut client setup time roughly in half.',
    expect: ['mispaired-quantity'],
    why: 'today’s live leak: "by half" belongs to Kinnect report generation',
  },
];

/** Every one of these is true, and a guard that blocks them is a guard nobody ships. */
export const MUST_PASS: Fixture[] = [
  { answer: 'At Kinnect I automated reporting with Supermetrics and Looker Studio and cut report generation time by half.', expect: [], why: 'verbatim from project-kinnect-automation' },
  { answer: 'Evian returned 5x on ad spend at The Triad Co.', expect: [], why: 'cap-paid-media and triad-evian both license it' },
  { answer: 'Hotstar hit a then-record 25 million concurrent viewers during the 2019 World Cup.', expect: [], why: 'hotstar-scale, with the year excluded as a date' },
  { answer: 'I grew the media team from two to five.', expect: [], why: 'a range, and a sentence that names nobody' },
  { answer: 'The Laughing Cow saw a 5% average lift in brand awareness.', expect: [], why: 'triad-laughing-cow, paired to the right brand' },
  { answer: 'TallyBridge exposes 27 MCP tools.', expect: [], why: 'project-tallybridge, paired via the memory title' },
  { answer: 'I founded Krunch Labs in January 2025 in Singapore.', expect: [], why: 'no quantity at all once the year is excluded' },
  { answer: 'We halved report generation time at Kinnect.', expect: [], why: 'paraphrase: halved (multiple .5) == by half (fraction .5)' },
  { answer: 'Team grew 2 → 5 at Kinnect.', expect: [], why: 'paraphrase: an arrow range == "from two to five"' },
];

/**
 * First person, no numbers, no new names. A guard with a taste for false positives shows
 * up here first, because this is the voice the site actually writes in.
 */
export const BENIGN: string[] = [
  'I build systems that do the work instead of describing it.',
  'I would rather delete code than defend it.',
  'I read the logs before I trust the dashboard.',
  'I write the failure mode down before I write the feature.',
  'I keep the feedback loop short and the surface area small.',
  'I care about how it behaves on a slow connection.',
  'I prefer the smallest thing that proves the idea works.',
  'I learn whatever it takes to build the thing I imagined.',
  'I like the part where a vague brief turns into something that runs.',
  'I explain the tradeoff before I defend the decision.',
];

export type Row = {
  group: 'must-fire' | 'must-pass' | 'benign';
  answer: string;
  expected: string;
  actual: string;
  ok: boolean;
  why: string;
};

function rowFor(group: Row['group'], fixture: Fixture): Row {
  const result = guard(fixture.answer, loadMemories());
  const kinds = [...new Set(result.violations.map((v) => v.kind))];
  const ok = fixture.expect.length
    ? fixture.expect.every((kind) => kinds.includes(kind))
    : result.violations.length === 0;
  return {
    group,
    answer: fixture.answer,
    expected: fixture.expect.length ? fixture.expect.join(' + ') : 'clean',
    actual: kinds.length ? kinds.join(' + ') : 'clean',
    ok,
    why: fixture.why,
  };
}

/** The whole table, evaluated against the real corpus. */
export function runFixtures(): Row[] {
  return [
    ...MUST_FIRE.map((f) => rowFor('must-fire', f)),
    ...MUST_PASS.map((f) => rowFor('must-pass', f)),
    ...BENIGN.map((answer) => rowFor('benign', { answer, expect: [], why: 'first person, no numbers, no new names' })),
  ];
}

/** A table you can read in a failure message without scrolling sideways. */
export function renderTable(rows: Row[]): string {
  const width = Math.max(...rows.map((r) => r.answer.length));
  const lines = rows.map(
    (r) => `  ${r.ok ? 'PASS' : 'FAIL'}  ${r.group.padEnd(9)}  ${r.answer.padEnd(width)}  expected: ${r.expected.padEnd(38)} got: ${r.actual}`,
  );
  const failed = rows.filter((r) => !r.ok).length;
  return [...lines, `  ${rows.length - failed}/${rows.length} fixture rows correct`].join('\n');
}

/** Salvage over a mixed answer, exported so the script and the test agree on the case. */
export const SALVAGE_ANSWER =
  'At Kinnect I automated reporting with Supermetrics and Looker Studio and cut report generation time by half. ' +
  'I grew the media team from two to five. ' +
  'At Canon I drove a 5x lift in awareness across 12 markets. ' +
  'I founded Krunch Labs in January 2025 in Singapore.';

export function salvageDemo(): { kept: string | null; violations: number } {
  const result = guard(SALVAGE_ANSWER, loadMemories());
  return { kept: salvage(SALVAGE_ANSWER, result), violations: result.violations.length };
}
