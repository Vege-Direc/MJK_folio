/**
 * `npm run route:eval` -- the routing table, printed.
 *
 * evals/tier-a/routing.test.ts asserts the same thing and gives you a percentage. This
 * gives you the scores, so when a miss appears you can see whether the right memory was
 * second by a nose or absent entirely, and whether a threshold or an alias is at fault.
 * It also prints the score gap that `MIN_TOP_SCORE` sits in, which is the number to
 * re-read after the corpus grows.
 *
 * Exits 0 always. This is an instrument, not a gate; the gate is the test.
 */
import {
  BUYER_QUESTIONS,
  MIN_ACCURACY,
  OFFER_STOPS,
  OFF_TOPIC_QUESTIONS,
  ROUTING_TABLE,
  TERSE_QUESTIONS,
} from '../evals/tier-a/routing-table';
import {
  ALIASES,
  isWorkRequest,
  MIN_PER_TERM_SCORE,
  MIN_TOP_SCORE,
  retrieve,
  type RetrievalHit,
} from '../lib/retrieve';

const pad = (s: string, n: number) => s.padEnd(n);
const num = (n: number) => n.toFixed(1).padStart(7);
const evidence = (hit: RetrievalHit) => `${num(hit.score)}  ${hit.memory.stopId}/${hit.memory.id}`;

console.log(`routing table: ${ROUTING_TABLE.length} questions, ${Object.keys(ALIASES).length} authored aliases\n`);

let hits = 0;
let weakest = Infinity;
const misses: string[] = [];

for (const { question, stopId } of ROUTING_TABLE) {
  const result = retrieve(question);
  const correct = result.stopId === stopId;
  if (correct) hits += 1;
  weakest = Math.min(weakest, result.topScore);

  // `topical` before `confident`, because that is the field lib/ask/handler.ts branches
  // on. A REFUSD row routed perfectly and was turned away at the door anyway.
  const mark = !correct ? ' MISS ' : !result.topical ? 'REFUSD' : result.confident ? '  ok  ' : ' weak ';
  console.log(
    `${mark}${num(result.topScore)}  ${pad(stopId, 12)}-> ${pad(String(result.stopId), 12)}${JSON.stringify(question)}`,
  );
  if (!correct) {
    misses.push(`${question}  (want ${stopId}, got ${result.stopId})`);
    for (const hit of result.hits) console.log(`       ${evidence(hit)}`);
  }
}

const accuracy = hits / ROUTING_TABLE.length;
console.log(
  `\n${hits}/${ROUTING_TABLE.length} = ${(accuracy * 100).toFixed(1)}% ` +
    `(bar is ${(MIN_ACCURACY * 100).toFixed(0)}%)`,
);
if (misses.length) console.log(`misses:\n  ${misses.join('\n  ')}`);

/*
 * The low end, which the table above has no rows like. Every row of ROUTING_TABLE is a
 * sentence, and a raw BM25+ score is a sum over matched terms, so a table of sentences
 * cannot calibrate a threshold a one-word question has to clear. These are printed in the
 * per-term unit as well, because that is the unit MIN_PER_TERM_SCORE is read in.
 */
console.log('\nterse questions -- one word, naming a subject the corpus holds:');
let weakestTersePerTerm = Infinity;
for (const { question, stopId } of TERSE_QUESTIONS) {
  const result = retrieve(question);
  const correct = result.stopId === stopId;
  // Only the rows that NEED the per-term clause set the band. A terse question already
  // over MIN_TOP_SCORE would flatter it.
  if (correct && result.topScore < MIN_TOP_SCORE) {
    weakestTersePerTerm = Math.min(weakestTersePerTerm, result.perTermScore);
  }
  const mark = !correct ? ' MISS ' : !result.topical ? 'REFUSD' : '  ok  ';
  console.log(
    `${mark}${num(result.topScore)} /term ${num(result.perTermScore)}  ${pad(stopId, 12)}-> ${pad(String(result.stopId), 12)}${JSON.stringify(question)}`,
  );
}

console.log('\noff-topic -- every one of these must come back not confident:');
let loudest = 0;
/** The loudest thing that must be refused, measured where the per-term clause can see it. */
let loudestUnvetoedPerTerm = 0;
for (const question of OFF_TOPIC_QUESTIONS) {
  const result = retrieve(question);
  loudest = Math.max(loudest, result.topScore);
  // WORK_REQUEST refuses "review my code" (7.0 per term) before the score is consulted at
  // all, so it is not what MIN_PER_TERM_SCORE has to outrun. Everything else is.
  if (!isWorkRequest(question)) {
    loudestUnvetoedPerTerm = Math.max(loudestUnvetoedPerTerm, result.perTermScore);
  }
  console.log(
    `${result.confident ? ' LOUD ' : '  ok  '}${num(result.topScore)} /term ${num(result.perTermScore)}${result.topical ? ' TOPICAL' : '        '}  ${pad(String(result.stopId), 12)}${JSON.stringify(question)}`,
  );
}
console.log('\nbuying enquiries -- every one of these must be answered, and land somewhere that takes a brief:');
for (const question of BUYER_QUESTIONS) {
  const result = retrieve(question);
  const ok = result.topical && result.stopId && (OFFER_STOPS as readonly string[]).includes(result.stopId);
  console.log(
    `${ok ? '  ok  ' : ' LOST '}${num(result.topScore)}  ${pad(String(result.stopId), 12)}${JSON.stringify(question)}`,
  );
}

/*
 * The band this used to print is gone, and pretending otherwise was the bug.
 *
 * It read "MIN_TOP_SCORE must sit between them", and for a while it could: the weakest real
 * question scored 17.8 and the loudest off-topic one 6.5. The corpus has since closed that
 * gap and then crossed it -- 9.5 against 14.0 as this is written -- so there is no longer
 * any value of MIN_TOP_SCORE that admits every real question and rejects every off-topic
 * one, and a script that keeps asking for one sends its reader hunting for a number that
 * does not exist. What actually holds the low end now is ENGAGEMENT in lib/retrieve.ts.
 */
console.log(
  `\nscore band: weakest real question ${weakest.toFixed(1)}, loudest off-topic ${loudest.toFixed(1)}.`,
);
console.log(
  weakest > loudest
    ? '  The band is intact; MIN_TOP_SCORE sits between them and does the work alone.'
    : '  The band has INVERTED. No threshold separates these two, so the low end is held by\n' +
      '  ENGAGEMENT (shape, not score), MIN_PER_TERM_SCORE (below) and the sets above.',
);

/*
 * The second band, in the unit the first one could not be measured in.
 *
 * The raw band inverted because a raw BM25+ score is a SUM over matched terms and the sets
 * being compared are not the same length. Dividing by the number of query terms puts them
 * on one scale, and in that unit the band is not inverted -- so print it, with the same
 * unflattering arithmetic, rather than asking anyone to remember it.
 *
 * The lower edge is taken only from terse rows the raw threshold already refuses, because a
 * question that clears MIN_TOP_SCORE does not need this clause and would flatter it. The
 * upper edge excludes WORK_REQUEST rows, because that veto fires before any score is read.
 */
const room = weakestTersePerTerm - loudestUnvetoedPerTerm;
console.log(
  `\nper-term band: quietest terse question that needs the clause ${weakestTersePerTerm.toFixed(2)}, ` +
    `loudest off-topic the veto does not already refuse ${loudestUnvetoedPerTerm.toFixed(2)}.`,
);
console.log(
  weakestTersePerTerm > loudestUnvetoedPerTerm
    ? `  MIN_PER_TERM_SCORE = ${MIN_PER_TERM_SCORE} sits in a band ${room.toFixed(2)} wide, ` +
        `${(MIN_PER_TERM_SCORE - loudestUnvetoedPerTerm).toFixed(2)} above the noise and ` +
        `${(weakestTersePerTerm - MIN_PER_TERM_SCORE).toFixed(2)} below the quietest real question.\n` +
        '  Read off the data it is scored on, over eight off-topic rows. Credible, not settled.'
    : '  This band has INVERTED too. Neither threshold separates these sets any more, and the\n' +
      '  low end is held by ENGAGEMENT alone. Do not raise a number; change the instrument.',
);
