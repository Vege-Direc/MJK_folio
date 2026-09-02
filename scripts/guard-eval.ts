/**
 * `npm run guard:eval` -- the grounding guard's fixture table, printed.
 *
 * Same rows as `evals/tier-a/grounding.test.ts`, same corpus, no assertions: this is the
 * one you run while tuning extraction, because a red vitest diff tells you THAT a row
 * moved and this tells you WHICH way. Exits 1 when any row is wrong, so CI can use it
 * too.
 */
import { loadMemories } from '../lib/corpus/load';
import { guard } from '../lib/grounding/guard';
import { renderTable, runFixtures, salvageDemo, SALVAGE_ANSWER } from '../evals/tier-a/grounding.fixtures';

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
console.log('  from: %s\n', SALVAGE_ANSWER);

process.exit(failed.length ? 1 : 0);
