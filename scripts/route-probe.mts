/**
 * Ad-hoc routing probe. `npx tsx scripts/route-probe.mts "a question" "another"`.
 *
 * `npm run route:eval` is the gate; this is for asking a question the table does not
 * cover yet and seeing which memories answered before deciding whether the table is
 * wrong or the corpus is thin.
 */
import { retrieve } from '../lib/retrieve';

const DEFAULTS = [
  "can you tell me about mathew's work experience",
  'what is your work experience',
  'tell me about your career',
  'where have you worked',
  'employment history',
  'what jobs have you had',
  'who have you worked for',
  'walk me through your cv',
  'what did you do at taboola',
  'What actually shipped at Taboola?',
  'how do i hire you',
  'Brief me for a project.',
  'what have you built',
  'tell me about the bike',
];

const questions = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;

for (const q of questions) {
  const r = retrieve(q);
  const hits = r.hits
    .slice(0, 3)
    .map((h) => h.memory.id)
    .join(', ');
  console.log(
    `${r.confident ? 'ok  ' : 'WEAK'} ${r.topScore.toFixed(1).padStart(6)}  ${(r.stopId ?? 'null').padEnd(12)} ${hits.padEnd(52)} ${q}`,
  );
}
