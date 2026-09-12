/**
 * Sentence splitting and normalisation for the grounding guard.
 *
 * The guard is PAIR-BOUND: a number is licensed only when it co-occurs with a matching
 * entity inside ONE authored sentence. That makes the sentence the unit of licensing, so
 * a splitter that breaks "Dr. Kondekeril" or "2.5x" into two sentences does not merely
 * produce ugly output -- it silently widens the licence, because a quantity and an entity
 * that were never written together end up in separate "sentences" that can each pair with
 * something else. Splitting conservatively is a correctness property here, not polish.
 */

/**
 * Words whose period never ends a sentence: titles that precede a name ("Dr. Kondekeril")
 * and inline markers ("e.g.", "a.m.").
 *
 * "Co." is pointedly NOT here, and that omission is load-bearing. The corpus contains
 * "...The Laughing Cow at The Triad Co. 5x ROAS for Evian..." -- suppressing that boundary
 * merges two authored sentences into one licence, which hands Canon a multiple that
 * belongs to Evian. That is the fabrication this guard exists to catch, manufactured by
 * the splitter. A company suffix at a sentence end is common; "Co. Ltd" mid-sentence is
 * not, so the boundary wins.
 */
const ABBREVIATIONS = new Set([
  'dr', 'mr', 'mrs', 'ms', 'prof', 'sr', 'jr', 'st', 'vs', 'al', 'fig', 'approx', 'dept',
  'e.g', 'i.e', 'u.s', 'a.m', 'p.m', 'ph.d',
]);

/**
 * One canonical spelling for text that means the same thing to a reader and different
 * things to a matcher: case, the multiplication sign, the six dashes that look like a
 * hyphen, the four quotes that look like an apostrophe, and runs of whitespace (YAML
 * folded scalars arrive full of newlines).
 *
 * Note what this does NOT do: it does not strip punctuation. `extractQuantities` needs
 * "$", "%" and "." to survive, and `extractEntities` reads case off the ORIGINAL string,
 * never off this one.
 */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[×✕✖]/g, 'x')
    .replace(/[‐-―−⁃]/g, '-')
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split prose into sentences. Case is preserved -- the entity pass needs it.
 *
 * A boundary is a run of `.!?` followed by whitespace and then something that starts a
 * sentence (a capital, a digit or an opening quote), and not preceded by a known
 * abbreviation or a single initial. A decimal point never qualifies, because "2.5" has
 * no space after the dot.
 */
export function sentences(text: string): string[] {
  const src = text.replace(/\s+/g, ' ').trim();
  if (!src) return [];

  const out: string[] = [];
  let start = 0;

  for (let i = 0; i < src.length; i++) {
    if (!'.!?'.includes(src[i])) continue;

    let end = i;
    while (end + 1 < src.length && '.!?'.includes(src[end + 1])) end++;
    let after = end + 1;
    while (after < src.length && '"\')]”’'.includes(src[after])) after++;
    if (after >= src.length) break; // the tail push below owns the final sentence
    if (src[after] !== ' ') { i = end; continue; } // "2.5x", "e.g.something"
    if (!/^["'(\[“‘]?[A-Z0-9]/.test(src.slice(after + 1))) { i = end; continue; }

    const word = (/([A-Za-z.]+)$/.exec(src.slice(start, i))?.[1] ?? '').toLowerCase();
    if (ABBREVIATIONS.has(word) || /^[a-z]$/.test(word)) { i = end; continue; }

    out.push(src.slice(start, after).trim());
    start = after + 1;
    i = after;
  }

  const tail = src.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}
