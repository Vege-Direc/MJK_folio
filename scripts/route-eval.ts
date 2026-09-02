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
import { MIN_ACCURACY, OFF_TOPIC_QUESTIONS, ROUTING_TABLE } from '../evals/tier-a/routing-table';
import { ALIASES, retrieve, type RetrievalHit } from '../lib/retrieve';

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

  const mark = correct ? (result.confident ? '  ok  ' : ' weak ') : ' MISS ';
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

console.log('\noff-topic -- every one of these must come back not confident:');
let loudest = 0;
for (const question of OFF_TOPIC_QUESTIONS) {
  const result = retrieve(question);
  loudest = Math.max(loudest, result.topScore);
  console.log(
    `${result.confident ? ' LOUD ' : '  ok  '}${num(result.topScore)}  ${pad(String(result.stopId), 12)}${JSON.stringify(question)}`,
  );
}

console.log(
  `\nscore gap: weakest real question ${weakest.toFixed(1)}, loudest off-topic ${loudest.toFixed(1)}.` +
    ' MIN_TOP_SCORE must sit between them.',
);
