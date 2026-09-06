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
import { cardQuestion } from '../../lib/card-question';
import { loadMemories } from '../../lib/corpus/load';
import { guard, salvage, type Violation } from '../../lib/grounding/guard';
import { retrieve } from '../../lib/retrieve';

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
  {
    answer: 'It turned raw supplier photos into more than 50 on-brand catalog images across 20-plus products.',
    expect: [],
    why: 'the corpus writes "20+ products"; "20-plus" was read as a count of 2 and the sentence was deleted',
  },
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

/**
 * TRUE SENTENCES THE GUARD HAS TAKEN, or took until something above this line was fixed.
 *
 * The tables above answer "does the guard catch what it should" and "does it pass the nine
 * rows we wrote for it". Neither answers the question that actually cost this site
 * answers: HOW MUCH TRUE PROSE DOES IT DELETE. A guard whose failure mode is silently
 * removing correct sentences needs a number pointed at that, and it cannot be a pass/fail
 * table, because a pass/fail table can only hold rows that already pass.
 *
 * So this set is SCORED, not gated. Rows are allowed to fail. `guard:eval` prints the
 * percentage of characters salvage would remove from them and names every survivor of a
 * sentence it took, and `grounding.test.ts` holds a ratchet above the current figure so it
 * can fall but not quietly climb.
 *
 * WHERE THE ROWS COME FROM. Every one was written by a real free model on 2026-09-06,
 * through the real corpus, the real system prompt and the real provider path, and every
 * one is TRUE -- checked by hand against `content/memories.yaml`, sentence by sentence.
 * Nothing here was invented to make the guard look bad, and nothing was trimmed to make it
 * look good. `licences` is the memory set retrieval returned for that question, so each row
 * is licensed exactly as the live path licensed it, `topLicences: 3` included.
 */
export type ParaphraseFixture = {
  answer: string;
  licences: string[];
  why: string;
};

export const TRUE_PARAPHRASES: ParaphraseFixture[] = [
  {
    answer:
      'I worked on the Paxel assessment with Claude Code.\n\nI shipped 208,803 lines across 993 commits. I logged 154 hours.',
    licences: ['paxel-assessment', 'how-i-work-with-agents', 'paxel-numbers'],
    why: 'carry-over reached across a paragraph break and bound the corpus’s own unattributed figures to Claude Code; nine violations, 22% of the answer',
  },
  {
    answer: 'It turned raw supplier photos into more than 50 on-brand catalog images across 20-plus products.',
    licences: ['project-photoshoot-pipeline', 'photoshoot-numbers', 'photoshoot-how-it-works'],
    why: 'the corpus writes "20+ products"; the extractor backtracked "20-plus" into a count of 2',
  },
  {
    answer: 'What makes this distinct is the principle that I’ve learned works.',
    licences: ['jewelai-the-ring', 'jewelai-reads-the-piece', 'jewelai-video'],
    why: 'a contraction reported as a fabricated proper noun, because the gazetteer was built from six memories',
  },
  {
    answer: 'The critic scores out of ten points and seven is the pass mark.',
    licences: ['photoshoot-how-it-works', 'photoshoot-numbers', 'project-photoshoot-pipeline'],
    why: 'the corpus writes "seven points is the pass mark"; dropping the repeated noun makes the unit absent, and absent-vs-present is a deliberate disagreement',
  },
  {
    answer: 'JewelAI Studio asks for three to five shots of one piece, taken from different angles.',
    licences: ['jewelai-reads-the-piece', 'jewelai-gates', 'jewelai-platform'],
    why: 'the corpus writes "three to five photographs"; a synonym for the counted noun unlicenses the number',
  },
  {
    answer: 'It animates one image from the validated set.',
    licences: ['jewelai-video', 'jewelai-gates', 'jewelai-platform'],
    why: 'the corpus writes "one of the images", where a bare "one" is suppressed as grammar; the paraphrase gives it a unit and nothing licenses it',
  },
  {
    answer: 'At Kinnect I automated the reporting. It cut report generation time by half.',
    licences: ['project-kinnect-automation', 'kinnect-years', 'kinnect-rustomjee'],
    why: 'the control: carry-over inside one paragraph, which must keep working',
  },
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

/* -- the false-positive rate ----------------------------------------------- */

export type FalsePositive = {
  answer: string;
  why: string;
  violations: Violation[];
  /**
   * Characters of true prose the guard objects to: the length of every distinct sentence
   * carrying a violation.
   *
   * NOT what salvage ends up removing, and the difference is the reason. `salvageDetailed`
   * has a floor -- half the sentences must survive, and either two must be left or the one
   * that is must be long enough to stand alone -- so a one-sentence row that fails scores
   * 100% removed whether the guard objected to one clause or the whole thing. That is an
   * artefact of the row's length, not a property of the guard. Counting the sentences the
   * guard rejects is the same measurement without the floor in it, and it is comparable
   * between a one-line row and a five-paragraph answer.
   *
   * It rounds UP slightly: a sentence whose only fault is a counted word keeps its place
   * and loses the word. Erring towards over-reporting is the right direction for a number
   * whose whole job is to stop this guard flattering itself.
   */
  removed: number;
  chars: number;
};

export type FalsePositiveReport = {
  /** Every scored row, failing ones first. */
  rows: FalsePositive[];
  chars: number;
  removed: number;
  /** Characters removed as a share of characters written. The headline. */
  rate: number;
  violations: number;
  /** Corpus bodies the live path would license, and how many the guard rejects. */
  corpus: { checked: number; rejected: string[]; skipped: string[] };
};

/**
 * What the guard TAKES, measured on prose that is true by construction.
 *
 * Two populations, and they answer different halves of the question.
 *
 * `TRUE_PARAPHRASES` is the half that moves: real model output, hand-checked against the
 * corpus, licensed as the live path licensed it. A paraphrase is where every false positive
 * this repository has found actually lived -- a dropped repeated noun, a synonym for a
 * counted noun, a contraction, a figure the corpus states without attributing -- and none
 * of them can appear in a table of verbatim corpus text.
 *
 * The corpus bodies are the half that should never move: MJK's own writing, checked against
 * his own writing, licensed by retrieval on that memory's own card question. Two memories
 * are skipped and named rather than quietly dropped -- their titles tokenise to nothing, so
 * their own card question retrieves nothing at all and the live path refuses instead of
 * answering. A violation there would be a routing fact, not a guard fact.
 */
export function falsePositives(): FalsePositiveReport {
  const memories = loadMemories();
  const byId = new Map(memories.map((m) => [m.id, m]));

  const rows: FalsePositive[] = TRUE_PARAPHRASES.map(({ answer, licences, why }) => {
    const licensed = licences.flatMap((id) => {
      const memory = byId.get(id);
      if (!memory) throw new Error(`TRUE_PARAPHRASES names "${id}", which is not in the corpus`);
      return [memory];
    });
    const result = guard(answer, licensed, { topLicences: 3 });
    const rejected = new Set(result.violations.map((v) => v.sentence));
    const removed = [...rejected].reduce((n, s) => n + s.length, 0);
    return { answer, why, violations: result.violations, removed, chars: answer.length };
  });

  const chars = rows.reduce((n, r) => n + r.chars, 0);
  const removed = rows.reduce((n, r) => n + r.removed, 0);

  const rejected: string[] = [];
  const skipped: string[] = [];
  for (const memory of memories) {
    const hits = retrieve(cardQuestion(memory.title)).hits.map((h) => h.memory);
    if (!hits.some((m) => m.id === memory.id)) {
      skipped.push(memory.id);
      continue;
    }
    if (!guard(memory.body.trim(), hits, { topLicences: 3 }).ok) rejected.push(memory.id);
  }

  return {
    rows: [...rows].sort((a, b) => b.removed - a.removed),
    chars,
    removed,
    rate: chars ? removed / chars : 0,
    violations: rows.reduce((n, r) => n + r.violations.length, 0),
    corpus: { checked: memories.length - skipped.length, rejected, skipped },
  };
}

/**
 * The ratchet.
 *
 * MEASURED at 0.356 on 2026-09-06, with three of the seven paraphrase rows still failing: a
 * repeated noun dropped ("seven points" -> "seven"), a synonym for a counted noun
 * ("photographs" -> "shots"), and a bare "one" given a unit. All three are real defects,
 * none of them is fixed here, and the number says so. A zero on this line would mean the
 * set had been trimmed to what the guard already passes, which is the exact failure the set
 * exists to correct.
 *
 * WHAT THIS RATE IS NOT is a figure for real traffic. `TRUE_PARAPHRASES` is a regression
 * set, chosen because these sentences failed, so it is adversarial by construction. The
 * traffic figure, measured the same day over ten live answers through the real free-model
 * path, was 11.5% of all characters written before this branch and 5.2% after it.
 *
 * It is a CEILING, not a target. It may fall freely; it may not climb without someone
 * editing this line and saying why in the commit that does it.
 */
export const MAX_FALSE_POSITIVE_RATE = 0.4;
