/**
 * `npm run guard:eval` -- the grounding guard's fixture table, printed.
 *
 * Same rows as `evals/tier-a/grounding.test.ts`, same corpus, no assertions: this is the
 * one you run while tuning extraction, because a red vitest diff tells you THAT a row
 * moved and this tells you WHICH way. Exits 1 when any row is wrong, so CI can use it
 * too.
 *
 * AND IT PRINTS WHAT IT TAKES, which for two months it did not. Every row above the second
 * section is a row the guard gets right, so the report could only ever say the guard was
 * working -- and the failure mode that actually costs this site answers is the opposite
 * one: true sentences deleted from a correct answer, silently, with nothing on the wire but
 * a verdict. Measured on 2026-09-06 over ten live answers, that was 11.5% of everything the
 * model wrote, and 16 of 20 violations were true content. A guard reports its false
 * positives next to its true ones or it is marking its own homework.
 */
import { loadMemories } from '../lib/corpus/load';
import { guard } from '../lib/grounding/guard';
import {
  falsePositives,
  MAX_FALSE_POSITIVE_RATE,
  renderTable,
  runFixtures,
  salvageDemo,
  SALVAGE_ANSWER,
} from '../evals/tier-a/grounding.fixtures';

const rows = runFixtures();
console.log('\ngrounding guard -- fixture table (real corpus, %d memories)\n', loadMemories().length);
console.log(renderTable(rows));

const failed = rows.filter((r) => !r.ok);
if (failed.length) {
  console.log('\nfailing rows, in detail:\n');
  for (const row of failed) {
    console.log(`  ${row.answer}`);
    console.log(`    expected ${row.expected}, got ${row.actual} -- ${row.why}`);
    for (const v of guard(row.answer, loadMemories()).violations) {
      console.log(`    [${v.kind}] ${v.detail}`);
      if (v.suggestion) console.log(`      suggestion: ${v.suggestion}`);
    }
  }
}

const { kept, violations } = salvageDemo();
console.log('\nsalvage: %d violations in a 4-sentence answer', violations);
console.log('  kept: %s', kept ?? '(null -- too little survived to be worth showing)');
console.log('  from: %s', SALVAGE_ANSWER);

/*
 * The other half of the report, and the half nobody had.
 *
 * The table above counts what the guard catches. This counts what it takes: prose that is
 * true by construction, licensed exactly as the live path licenses it, and the share of it
 * the guard objects to. It is allowed to be non-zero -- the rows are a regression set,
 * chosen because they failed -- and a zero here would mean somebody had trimmed the set to
 * what the guard already passes.
 */
const fp = falsePositives();
console.log('\n\nfalse positives -- true prose, and how much of it the guard rejects\n');
for (const row of fp.rows) {
  const share = row.chars ? Math.round((100 * row.removed) / row.chars) : 0;
  console.log(
    `  ${row.removed ? 'TAKES' : ' ok  '} ${String(share).padStart(3)}%  ${row.answer.replace(/\n+/g, ' / ')}`,
  );
  if (row.removed) console.log(`         why it is true: ${row.why}`);
  for (const v of row.violations) console.log(`         [${v.kind}] ${v.detail}`);
}
console.log(
  `\n  %s%% of true prose rejected (%d of %d characters, %d violations over %d rows). ` +
    'Ceiling %s%%.',
  (100 * fp.rate).toFixed(1),
  fp.removed,
  fp.chars,
  fp.violations,
  fp.rows.length,
  (100 * MAX_FALSE_POSITIVE_RATE).toFixed(0),
);
console.log(
  '  %d corpus bodies checked against the memories their own card question retrieves: %s.',
  fp.corpus.checked,
  fp.corpus.rejected.length ? `${fp.corpus.rejected.length} REJECTED -- ${fp.corpus.rejected.join(', ')}` : 'none rejected',
);
console.log(
  '  %d skipped, and named rather than dropped: %s. Their titles tokenise to nothing, so their\n' +
    '  own card question retrieves nothing and the live path refuses instead of answering --\n' +
    '  a violation there would be a routing fact, not a guard fact.\n',
  fp.corpus.skipped.length,
  fp.corpus.skipped.join(', '),
);

process.exit(failed.length || fp.rate > MAX_FALSE_POSITIVE_RATE ? 1 : 0);
