/**
 * A CLOSED-WORLD gazetteer of every name this site is allowed to say.
 *
 * This is deliberately not NER. NER answers "is this a company?", which is the wrong
 * question -- "Isobar" is unmistakably a company and he never worked there. The owner
 * owns the world: the corpus is the complete list of names that exist, so a capitalised
 * proper noun with no home in the corpus is a violation by construction, no model
 * required and no confidence score to tune.
 *
 * Two asymmetries earn their keep:
 *
 *   - A run is KNOWN if the whole run is in the gazetteer, or if every one of its tokens
 *     is. That is how "the 2019 World Cup" resolves against the corpus's "ICC Cricket
 *     World Cup" without anyone writing an alias for it.
 *   - A SENTENCE-INITIAL run that resolves to nothing is ignored, never reported. English
 *     capitalises the first word of every sentence, so "Payments expansion across five
 *     new APAC markets" would otherwise accuse "Payments" of being a fabricated company.
 *     The quantity guard is what catches that sentence, and it does.
 */
import type { Memory } from '../corpus/schema';
import { normalise, sentences } from './text';

export type Gazetteer = {
  /** Whole proper-noun runs, normalised: "the triad co", "icc cricket world cup". */
  terms: Set<string>;
  /** Every token of every run, plus the words inside ids and tags. */
  tokens: Set<string>;
  /** Every accepted spelling -> the canonical name it means. */
  aliases: Map<string, string>;
};

/**
 * Spellings the corpus and a speaker will not agree on. First entry is canonical, so
 * "Disney+ Hotstar" in a memory and "Hotstar" in an answer pair with each other.
 */
const ALIAS_GROUPS: string[][] = [
  ['jewelai studio', 'jewel ai', 'jewelai'],
  ['mrunn-erp', 'mrunn', 'mrunn erp'],
  ['rd 350', 'rd350', 'yamaha rd 350', 'yamaha'],
  ['2fa', 'two-factor authentication', 'two factor authentication'],
  ['hotstar', 'disney+ hotstar', 'disney hotstar'],
  ['omnicom', 'phd', 'omd', 'resolution media'],
  ['triad', 'the triad co', 'triad co'],
  ['bits', 'bits pilani', 'bits pilani dubai'],
  ['brunel', 'brunel university london', 'brunel university'],
];

/**
 * Capitalised because a sentence started, not because it is a name. Trimmed off the ends
 * of every run: "At Canon I drove" must yield "Canon", not "At Canon I".
 */
const COMMON = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'then', 'now', 'here', 'there', 'this',
  'that', 'these', 'those', 'it', 'its', 'i', 'we', 'my', 'our', 'their', 'his', 'her',
  'he', 'she', 'they', 'at', 'in', 'on', 'for', 'from', 'to', 'of', 'with', 'by',
  'during', 'through', 'across', 'after', 'before', 'while', 'when', 'where', 'off',
  'out', 'up', 'down', 'over', 'under', 'every', 'each', 'all', 'both', 'other', 'next',
  'last', 'first', 'second', 'third', 'best', 'most', 'more', 'less', 'no', 'not',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  // Interrogatives, which open a great many of this corpus's titles: "What that looked
  // like in numbers", "How I actually direct an agent", "How an engagement starts".
  'what', 'how', 'why', 'who', 'whom', 'whose', 'which',
]);

/**
 * Words that look like names and are not claims: languages, places already in the
 * corpus, months and weekdays, and the acronyms this domain speaks in.
 */
const ALLOWED = new Set([
  'i', 'english', 'hindi', 'malayalam', 'singapore', 'india', 'thailand', 'korea',
  'indonesia', 'london', 'dubai', 'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december', 'monday', 'tuesday',
  'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'ai', 'erp', 'apac', 'sea',
  'mena', 'saas', 'llm', 'mcp', 'api', 'ui', 'ux', 'seo', 'sem', 'b2b', 'crm', 'kpi',
]);

/**
 * A run of capitalised tokens. No "." in the class, or "Hotstar. I led" becomes one run.
 * The lookbehind is what stops "2FA" from contributing a company called "FA".
 */
const RUN = /(?<![A-Za-z0-9])[A-Z][A-Za-z0-9'’&+-]*(?:\s+[A-Z][A-Za-z0-9'’&+-]*)*/g;

/**
 * Strip possessives and the sentence furniture at either end of a run. `key` is what the
 * gazetteer is asked about; `text` keeps the author's own capitalisation, because a
 * violation that reports "isobar" when the sentence says "Isobar" makes the author hunt
 * for it.
 */
function trimRun(run: string): { text: string; key: string } | null {
  const words = run
    .split(/\s+/)
    .map((w) => w.replace(/['’]s$/i, '').replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+]+$/g, ''))
    .filter(Boolean);
  const keys = words.map((w) => normalise(w));

  let start = 0;
  let end = words.length;
  while (start < end && COMMON.has(keys[start])) start++;
  while (end > start && COMMON.has(keys[end - 1])) end--;
  if (start >= end) return null;

  return { text: words.slice(start, end).join(' '), key: keys.slice(start, end).join(' ') };
}

/** Every capitalised run in one sentence, flagged if it opens the sentence. */
function runsIn(sentence: string): { text: string; key: string; initial: boolean }[] {
  const head = (/^["'“‘(]*/.exec(sentence)?.[0] ?? '').length;
  const out: { text: string; key: string; initial: boolean }[] = [];
  for (const m of sentence.matchAll(RUN)) {
    const run = trimRun(m[0]);
    if (run) out.push({ ...run, initial: (m.index ?? 0) <= head });
  }
  return out;
}

/**
 * Harvest the world from the corpus: titles, ids (kebab -> words), tags, bodies and any
 * authored facts. Sentence-initial runs ARE harvested -- "Mastra, LangGraph, Vercel AI
 * SDK." is a whole memory body, and dropping it would make Mastra a fabrication.
 */
export function buildGazetteer(memories: Memory[]): Gazetteer {
  const gaz: Gazetteer = { terms: new Set(), tokens: new Set(), aliases: new Map() };

  const add = (text: string) => {
    const key = normalise(text);
    if (!key) return;
    gaz.terms.add(key);
    for (const token of key.split(' ')) if (token.length > 1) gaz.tokens.add(token);
  };

  /*
   * A capitalised run that opens a sentence and is made only of ordinary words is not a
   * name, and must not become one. `extractEntities` already refuses to treat such a run
   * as a claim -- "English capitalises sentence openers; that is not a claim" -- but the
   * BUILD had no such rule, so the word went into the gazetteer and every later lookup
   * found it there before the opener check could fire.
   *
   * The cost was not theoretical. `paxel-numbers` is titled "What that looked like in
   * numbers", so `what` became an entity, every sentence in that memory was bound to it,
   * and the guard then rejected MJK's own figures with "208,803 is licensed, but only
   * about what". An entire memory of numbers was unquotable, and the site answered a
   * question about the report by deleting the report. That is the same failure this
   * repository has already paid for once, when a year with a comma after it was read as a
   * count and took his bachelors degree out of every answer about his education.
   *
   * Only runs made ENTIRELY of common words are skipped, and only sentence-initial ones.
   * "Taboola" opens plenty of sentences and is still learned; "What" is not.
   */
  const addRun = (run: { key: string; initial: boolean }) => {
    if (run.initial && run.key.split(' ').every((w) => COMMON.has(w))) return;
    add(run.key);
  };

  for (const group of ALIAS_GROUPS) {
    for (const spelling of group) {
      gaz.aliases.set(normalise(spelling), normalise(group[0]));
      add(spelling);
    }
  }

  for (const memory of memories) {
    for (const word of memory.id.split('-')) if (word.length > 1) gaz.tokens.add(word);
    for (const tag of memory.tags) for (const word of normalise(tag).split(/[\s-]+/)) if (word.length > 1) gaz.tokens.add(word);
    for (const run of runsIn(memory.title)) addRun(run);
    for (const sentence of sentences(memory.body)) for (const run of runsIn(sentence)) addRun(run);
    for (const fact of memory.facts ?? []) {
      for (const entity of fact.entities) add(entity);
      for (const sentence of sentences(fact.text)) for (const run of runsIn(sentence)) addRun(run);
    }
  }

  return gaz;
}

/**
 * The names one sentence says. `known` is canonicalised, so it can be compared across
 * sentences; `unknown` is reported verbatim, because the author needs to see exactly what
 * they wrote.
 */
export function extractEntities(sentence: string, gazetteer: Gazetteer): { known: string[]; unknown: string[] } {
  const known = new Set<string>();
  const unknown: string[] = [];

  const flat = ` ${normalise(sentence).replace(/[^a-z0-9+'-]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  for (const [spelling, canonical] of gazetteer.aliases) {
    if (flat.includes(` ${spelling} `)) known.add(canonical);
  }

  for (const { text, key, initial } of runsIn(sentence)) {
    const canonical = gazetteer.aliases.get(key);
    if (canonical) { known.add(canonical); continue; }
    if (gazetteer.terms.has(key)) { known.add(key); continue; }

    const parts = key.split(' ').filter((w) => w.length > 1 && !COMMON.has(w));
    if (parts.length && parts.every((w) => gazetteer.tokens.has(w))) { known.add(key); continue; }
    if (initial) continue; // English capitalises sentence openers; that is not a claim
    if (parts.every((w) => ALLOWED.has(w))) continue;
    unknown.push(text);
  }

  return { known: [...known], unknown };
}

/** One name is the other when either is a token-subset: "triad co" is "the triad co". */
export function entityMatches(a: string, b: string): boolean {
  if (a === b) return true;
  const [left, right] = [a.split(' '), b.split(' ')];
  return right.every((w) => left.includes(w)) || left.every((w) => right.includes(w));
}
