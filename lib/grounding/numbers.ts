/**
 * Quantity extraction and equivalence.
 *
 * Every fabrication this site has shipped was a number -- 5x awareness, 2x spend, five
 * APAC markets, not a single advertiser account, a week of analyst work. So the guard
 * has to see a number wherever a reader would, in whatever costume it is wearing: "5x",
 * "5×", "five-fold", "doubled", "by half", "two to five", "25 million", "top-3".
 *
 * Two deliberate exclusions, both documented because both are blind spots:
 *
 *   1. BARE FOUR-DIGIT YEARS in 1950-2100 are never quantities. The resume's dates are
 *      `period` and `scripts/check-corpus.ts`'s job, and the alternative is worse: "the
 *      2019 World Cup" would otherwise be an unlicensed count of 2019 World Cups. The
 *      cost is that a real count in that window ("2000 users") is invisible here.
 *   2. TIMES AND DURATIONS ARE INCLUDED, not excluded. "10 ms", "a week of analyst work",
 *      "four months" are performance and effort claims, and one of them ("A week of
 *      analyst work per client, per month") is a fabrication this repo actually shipped.
 *      A guard that ignored durations would have waved it through.
 *
 * The indefinite article counts as a quantity ONLY before a measure noun -- "a week" is a
 * claim, "a pipeline" is prose. That line is what keeps the extractor from firing on
 * every sentence in the corpus. For the same reason a bare ordinal is not a rank:
 * "Rustomjee's first project" and "First Class Honours" are prose, so `ordinal-rank`
 * needs an explicit ranking form -- "top-3", "#1", "No. 1", "number one".
 */
import { normalise } from './text';

export type Quantity = {
  /** Exactly what the sentence said, so a violation can quote it back. */
  raw: string;
  kind: 'multiple' | 'percent' | 'count' | 'money' | 'fraction' | 'ordinal-rank';
  value: number;
  /** The noun it counted. Absent when the sentence counted nothing nameable. */
  unit?: string;
};

/* -- vocabularies ---------------------------------------------------------- */

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, dozen: 12,
};

const SCALES: Record<string, number> = {
  hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, m: 1e6, k: 1e3, bn: 1e9,
};

/** Nouns that turn an indefinite article into a measurement. */
const MEASURES = 'weeks?|months?|days?|hours?|minutes?|seconds?|years?|decades?|quarters?|fortnights?';

/**
 * Words a unit phrase may not contain or continue past. A unit is the noun the number
 * counted, and prepositions and pronouns are where that noun ends.
 */
const UNIT_STOP = new Set([
  'of', 'for', 'in', 'on', 'at', 'to', 'and', 'or', 'the', 'a', 'an', 'with', 'that',
  'which', 'from', 'by', 'during', 'per', 'was', 'is', 'were', 'are', 'be', 'been', 'i',
  'we', 'it', 'they', 'he', 'she', 'this', 'these', 'those', 'across', 'into', 'out',
  'over', 'under', 'than', 'then', 'as', 'but', 'so', 'my', 'our', 'their', 'its', 'his',
  'her', 'while', 'after', 'before', 'when', 'where', 'without', 'within', 'up', 'down',
  'about', 'through', 'more', 'most', 'less', 'each', 'every', 'all', 'any', 'some',
  'not', 's', 'plus', 'versus', 'using', 'including', 'like', 'had', 'has', 'have',
]);

/** Longest first, or "seven" matches inside "seventeen". */
const NUMWORDS = Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|');
const N = String.raw`(?:\d[\d,]*(?:\.\d+)?|\b(?:${NUMWORDS})\b)`;
/** Letter scales must be attached ("25M"); word scales take a space ("25 million"). */
const SCALE = String.raw`(?:(?:m|k|bn)\b|\s+(?:hundred|thousand|million|billion))`;

/* -- helpers --------------------------------------------------------------- */

function parseNum(token: string): number {
  const t = token.trim();
  return /^[\d.,]/.test(t) ? Number(t.replace(/,/g, '')) : WORDS[t];
}

function scaleOf(suffix: string | undefined): number {
  if (!suffix) return 1;
  return SCALES[suffix.trim().toLowerCase()] ?? 1;
}

/**
 * A bare four-digit year is a date, not a claim. See the header.
 *
 * The trailing punctuation strip is not tidiness, it is the whole rule working at all.
 * `raw` arrives with whatever followed the digits, and a year is very often followed by a
 * comma: the corpus itself writes "Brunel University London, 2012, Merit." Without this,
 * "2012," failed `^\d{4}$`, was classified as a count of 2012, matched no memory, and the
 * sentence containing it was deleted from the answer. MJK found it as an answer about his
 * education that skipped a degree -- the model had written it correctly and the guard
 * removed it. A guard that silently deletes true sentences is worse than no guard, because
 * the reader cannot tell that anything is missing.
 */
function isYear(raw: string, value: number): boolean {
  return /^\d{4}$/.test(raw.trim().replace(/[.,;:!?)\]}"'’”]+$/u, '')) && value >= 1950 && value <= 2100;
}

/** The noun a number counted: up to three words, stopping at a preposition or a comma. */
function unitAt(text: string, from: number): string | undefined {
  const tail = text.slice(from).replace(/^[\s+]+/, '');
  const tokens: string[] = [];
  for (const raw of tail.split(' ')) {
    const word = raw.replace(/[^a-z0-9'-]+$/, '');
    if (!/^[a-z][a-z0-9'-]*$/.test(word) || UNIT_STOP.has(word)) break;
    tokens.push(word);
    if (tokens.length === 3 || raw.length > word.length) break; // trailing punctuation ends the clause
  }
  return tokens.length ? tokens.join(' ') : undefined;
}

/* -- extraction ------------------------------------------------------------ */

type Pass = { re: RegExp; read: (m: RegExpExecArray, text: string) => Quantity[] };

/**
 * Ordered: the specific costume wins over the generic one, so "5x" is a multiple before
 * it can be read as a count of 5, and "not a single advertiser account" is a zero before
 * "a" can be read as an article.
 */
const PASSES: Pass[] = [
  {
    re: new RegExp(String.raw`\$\s?(${N})(${SCALE})?`, 'g'),
    read: (m) => [{ raw: m[0], kind: 'money', value: parseNum(m[1]) * scaleOf(m[2]), unit: '$' }],
  },
  {
    re: new RegExp(String.raw`(${N})\s?(?:%|per\s?cent\b)`, 'g'),
    read: (m, t) => [{ raw: m[0], kind: 'percent', value: parseNum(m[1]), unit: unitAt(t, m.index + m[0].length) }],
  },
  {
    re: new RegExp(String.raw`(${N})[\s-]?(?:x\b|fold\b|times\b)`, 'g'),
    read: (m, t) => [{ raw: m[0], kind: 'multiple', value: parseNum(m[1]), unit: unitAt(t, m.index + m[0].length) }],
  },
  {
    re: /\b(doubl|tripl|quadrupl|halv)(?:ed|ing|es|e)\b/g,
    read: (m) => {
      const value: Record<string, number> = { doubl: 2, tripl: 3, quadrupl: 4, halv: 0.5 };
      return [{ raw: m[0], kind: 'multiple', value: value[m[1]] }];
    },
  },
  {
    re: /\b(half|two[\s-]thirds?|three[\s-]quarters?|an?[\s-](?:third|quarter))\b/g,
    read: (m) => {
      const key = m[1].replace(/[\s-]/g, '');
      const value = key.startsWith('two') ? 2 / 3 : key.startsWith('three') ? 0.75 : key.endsWith('quarter') ? 0.25 : key.endsWith('third') ? 1 / 3 : 0.5;
      return [{ raw: m[0], kind: 'fraction', value }];
    },
  },
  {
    // Zero is the loudest number on a resume: "without breaking a single advertiser account".
    re: /\b(?:zero|(?:not|never)\s+(?:a\s+single|one)|without\s+(?:[a-z]+ing\s+)?(?:a\s+single|an?|any|one))\s+/g,
    read: (m, t) => [{ raw: m[0].trim(), kind: 'count', value: 0, unit: unitAt(t, m.index + m[0].length) }],
  },
  {
    re: new RegExp(String.raw`(?:\btop[\s-]|#|\bno\.\s?|\bnumber\s)(${N})\b`, 'g'),
    read: (m) => [{ raw: m[0], kind: 'ordinal-rank', value: parseNum(m[1]) }],
  },
  {
    // A range is two counts sharing one unit: "from two to five", "2 -> 5", "2 to 5 markets".
    re: new RegExp(String.raw`\b(?:from\s+)?(${N})\s+to\s+(${N})\b`, 'g'),
    read: (m, t) => {
      const [a, b] = [parseNum(m[1]), parseNum(m[2])];
      if (isYear(m[1], a) || isYear(m[2], b)) return [];
      const unit = unitAt(t, m.index + m[0].length);
      return [
        { raw: m[1], kind: 'count', value: a, unit },
        { raw: m[2], kind: 'count', value: b, unit },
      ];
    },
  },
  {
    // The lookahead keeps "2FA" from being a count of two FAs and "two-factor" from
    // being a count of two factors: a digit glued to letters is a name, not a number.
    re: new RegExp(String.raw`\b(${N})(${SCALE})?\+?(?![a-z-])`, 'g'),
    read: (m, t) => {
      const value = parseNum(m[1]) * scaleOf(m[2]);
      if (!m[2] && isYear(m[1], value)) return [];
      const unit = unitAt(t, m.index + m[0].length);
      // "one of the first things" is a pronoun. A bare "one" counting nothing nameable
      // is the one number word that is more often grammar than claim.
      if (!unit && m[0].trim() === 'one') return [];
      return [{ raw: m[0], kind: 'count', value, unit }];
    },
  },
  {
    re: new RegExp(String.raw`\ban?\s+(?:${MEASURES})\b`, 'g'),
    read: (m, t) => [{ raw: m[0], kind: 'count', value: 1, unit: unitAt(t, m.index + m[0].indexOf(' ') + 1) }],
  },
];

/**
 * Every quantity in one sentence. Arrows are folded to "to" first, so "2 -> 5" and
 * "from two to five" reach the range pass as the same shape.
 */
export function extractQuantities(sentence: string): Quantity[] {
  const text = normalise(sentence).replace(/\s*(?:->|→|⇒)\s*/g, ' to ');
  const taken: [number, number][] = [];
  const out: Quantity[] = [];

  for (const pass of PASSES) {
    pass.re.lastIndex = 0;
    for (let m = pass.re.exec(text); m; m = pass.re.exec(text)) {
      const span: [number, number] = [m.index, m.index + m[0].length];
      if (taken.some(([s, e]) => span[0] < e && s < span[1])) continue;
      const found = pass.read(m, text);
      if (!found.length) continue;
      taken.push(span);
      out.push(...found);
    }
  }
  return out;
}

/* -- equivalence ----------------------------------------------------------- */

function equalish(a: number, b: number): boolean {
  return Math.round(a * 1e4) === Math.round(b * 1e4);
}

function stem(word: string): string {
  return word.endsWith('s') && word.length > 3 ? word.slice(0, -1) : word;
}

/**
 * Units agree when they share a real word. Absent-vs-present is a DISAGREEMENT on
 * purpose: "five markets" must not be licensed by the bare "five" in "from two to five".
 */
function unitsAgree(a: string | undefined, b: string | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const tokens = (u: string) => new Set(u.split(' ').filter((w) => w.length >= 3 && !UNIT_STOP.has(w)).map(stem));
  const left = tokens(a);
  return [...tokens(b)].some((w) => left.has(w));
}

function ratio(q: Quantity): number | null {
  if (q.kind === 'percent') return q.value / 100;
  if (q.kind === 'fraction' || q.kind === 'multiple') return q.value;
  return null;
}

/**
 * Do these two quantities assert the same thing?
 *
 * Same kind: same value, and for counts and money the same unit -- 12 markets is not 12
 * tools. Multiples and percentages ignore units because their units are unwritable
 * ("5x ROAS" vs "5x return on ad spend"); pair-binding to an entity is what constrains
 * them instead.
 *
 * Across kinds, only REDUCTIONS are equated: "by half" (fraction .5), "halved" (multiple
 * .5) and "50%" are one claim in three costumes. The `< 1` gate is why 5x is not 500%: an
 * increase written as a multiple and one written as a percentage are different claims,
 * and quietly equating them would license a number nobody wrote.
 */
export function sameQuantity(a: Quantity, b: Quantity): boolean {
  if (a.kind === b.kind) {
    if (!equalish(a.value, b.value)) return false;
    return a.kind === 'count' || a.kind === 'money' ? unitsAgree(a.unit, b.unit) : true;
  }
  const [ra, rb] = [ratio(a), ratio(b)];
  return ra !== null && rb !== null && ra < 1 && rb < 1 && equalish(ra, rb);
}
