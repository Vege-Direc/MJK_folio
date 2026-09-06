/**
 * The grounding guard: may this answer be shown on the resume?
 *
 * THE RULE IS PAIR-BINDING. A quantity is licensed only when it co-occurs with a matching
 * entity inside ONE authored sentence of ONE memory. Set membership is not enough and
 * never was: "Canon" is in the corpus and "5x" is in the corpus, so a set-membership
 * guard passes "At Canon I drove a 5x lift" -- a sentence that fuses a real client to
 * another client's number. That exact shape shipped on this site twice (5x awareness for
 * Canon, 2x spend for The Laughing Cow), and a live smoke test caught a third today: the
 * model said the Taboola APAC Ads Interface "cut client setup time roughly in half", a
 * number the corpus licenses only for Kinnect's report generation.
 *
 * Three rules, in the order they fire:
 *
 *   1. UNKNOWN ENTITY. A capitalised name with no home in the corpus is a violation on
 *      its own, numbers or not. This is the "Isobar" case -- a plausible employer he
 *      never worked for. Asked of the WHOLE corpus, never of the retrieved subset: see
 *      `world()` for the day that distinction turned a contraction into a company.
 *   2. UNLICENSED QUANTITY. The number appears in no licence sentence at all.
 *   3. MISPAIRED QUANTITY. The number exists, but every sentence that licenses it is
 *      about someone else.
 *
 * Two carve-outs, both narrow and both stated plainly because both are how a leak would
 * get through:
 *
 *   - PRONOUN CARRY-OVER. "It cut setup time in half." names nobody, so it inherits the
 *     entities of the previous ANSWER sentence -- but only within its own paragraph. See
 *     `PARAGRAPH` below; the boundary is where this rule stops, and it is the difference
 *     between a guard that reads an answer and one that reads a run of sentences.
 *   - ENTITY-LESS SENTENCES. If carry-over finds nothing either, the quantity only has to
 *     be licensed by a memory in the top `topLicences` of the licence list. The default
 *     is the whole list, which makes this the weakest rule in the file: a document-
 *     opening sentence with a number and no name gets set-membership treatment. Callers
 *     holding a ranked retrieval set should pass `topLicences` and tighten it.
 */
import { loadMemories } from '../corpus/load';
import type { Memory } from '../corpus/schema';
import { buildGazetteer, entityMatches, extractEntities, type Gazetteer } from './entities';
import { extractQuantities, sameQuantity, type Quantity } from './numbers';
import { normalise, sentences } from './text';

export type Violation = {
  sentence: string;
  kind: 'unlicensed-quantity' | 'unknown-entity' | 'mispaired-quantity';
  detail: string;
  suggestion?: string;
  /** The offending quantity, when the violation is about one. Lets salvage redact it. */
  quantity?: Quantity;
};

export type GuardResult = {
  ok: boolean;
  violations: Violation[];
  checked: { sentences: number; quantities: number; entities: number };
};

export type GuardOptions = {
  /** How many of `licences` count as "retrieved for this question". Default: all. */
  topLicences?: number;
};

/**
 * A blank line, which is the only shape an answer on this site has -- and, once, the only
 * place carry-over is allowed to stop.
 *
 * WHY THE BOUNDARY IS HERE. `content/system-prompt.md` asks the model to "break where the
 * subject changes -- a different company, a different project, a different stretch of
 * years", and then this guard read the whole answer as one flat run of sentences and
 * carried the last name it had seen straight across that break. An answer that obeyed the
 * instruction was punished for obeying it.
 *
 * MEASURED, 2026-09-06, on ten live answers through the real corpus, the real prompt and
 * the real free-model path. "Give me the full story of the Paxel report" came back with
 * every figure true and correctly attributed and lost 22% of itself to nine
 * `mispaired-quantity` violations. Every one of the nine was a number the corpus states in
 * a sentence that names nobody -- "208,803 lines shipped across 993 commits." -- bound by
 * carry-over to "Claude Code", which the model had named in the paragraph above. Across
 * the ten, the guard removed 11.5% of everything written and 16 of 20 violations were
 * true content. With the boundary honoured: 9.4% and the Paxel answer 22% -> 7%, on 26/26
 * fixture rows and with all 55 corpus bodies still guarding clean.
 *
 * WHAT THIS COSTS, STATED PLAINLY, because it is a real loosening and not a free one. A
 * quantity the corpus states without naming anyone -- 19 of the corpus's 107, all of them
 * in `paxel-numbers`, `photoshoot-numbers` and `photoshoot-how-it-works` -- can now be
 * attached to a subject named in a PREVIOUS paragraph and pass. "At Taboola I revamped the
 * APAC Ads Interface." followed by a blank line and "I shipped 208,803 lines across 993
 * commits." is licensed, and it was not before. It is bounded on both sides: only those 19
 * numbers, and only when both memories are inside the retrieved `topLicences`. Within a
 * paragraph the same sentence pair is still caught, which is the shape the model actually
 * writes and the shape `evals/tier-a/grounding.test.ts` pins.
 *
 * Shared with `salvageDetailed`, which already split on exactly this, because a guard and
 * a salvage that disagree about where a paragraph ends disagree about which sentence a
 * violation belongs to.
 */
const PARAGRAPH = /\n[ \t]*\n\s*/;

/** One authored sentence, with everything it licenses. */
type LicenceSentence = {
  memoryId: string;
  text: string;
  quantities: Quantity[];
  entities: string[];
};

/**
 * Flatten the corpus into licence sentences.
 *
 * A sentence that names nobody inherits from the sentence IMMEDIATELY before it, and from
 * its memory's title. It does NOT accumulate every name in the memory, and that
 * restraint is the whole guard: cap-paid-media reads "Canon, Evian and The Laughing Cow
 * at The Triad Co. 5x ROAS for Evian; a 10x increase in ad spend on Rustomjee's first
 * project." Cumulative carry-over would hand Canon the 5x, which is precisely the
 * fabrication this site shipped.
 */
function indexLicences(licences: Memory[], gazetteer: Gazetteer): LicenceSentence[] {
  const out: LicenceSentence[] = [];

  for (const memory of licences) {
    const title = extractEntities(memory.title, gazetteer).known;
    let previous: string[] = [];

    for (const text of sentences(memory.body)) {
      const own = extractEntities(text, gazetteer).known;
      const entities = [...new Set([...(own.length ? own : previous), ...title])];
      if (own.length) previous = own;
      out.push({ memoryId: memory.id, text, quantities: extractQuantities(text), entities });
    }

    // Authored facts are a second, independent assertion by a human. They license too.
    for (const fact of memory.facts ?? []) {
      for (const text of sentences(fact.text)) {
        const own = extractEntities(text, gazetteer).known;
        const entities = [...new Set([...own, ...fact.entities.map(normalise), ...title])];
        out.push({ memoryId: memory.id, text, quantities: extractQuantities(text), entities });
      }
    }
  }

  return out;
}

function describe(quantity: Quantity): string {
  return `"${quantity.raw.trim()}"${quantity.unit ? ` (${quantity.kind} of ${quantity.unit})` : ` (${quantity.kind})`}`;
}

function namesIn(licence: LicenceSentence): string {
  return licence.entities.length ? licence.entities.join(', ') : 'nothing named';
}

/**
 * The world, and why it is the whole corpus rather than the six memories that were
 * retrieved.
 *
 * `entities.ts` opens by stating the premise this guard rests on: "the corpus is the
 * complete list of names that exist, so a capitalised proper noun with no home in the
 * corpus is a violation by construction". The guard then built its gazetteer from
 * `licences` -- the six memories BM25 happened to return for this question -- so the
 * premise was true of a different, much smaller world on every request, and the same word
 * was a fabrication or not depending on what had been retrieved.
 *
 * MEASURED, 2026-09-06. Asked about JewelAI Studio, the model wrote "the principle that
 * I've learned works" and the guard reported `I've` as a name appearing "in none of the 6
 * licensed memories" -- a fabricated company, on a contraction. The same run over the
 * corpus's own prose is worse: `who-i-am` guarded against a licence set that came back
 * empty reported Hindustan Unilever, Visa, Skechers, Evian and Krunch Labs as
 * fabrications. Every one of them is in `content/memories.yaml`. The names were never
 * missing; the gazetteer was.
 *
 * WHAT DOES NOT WIDEN IS THE LICENCE. `indexLicences` still runs over `licences` alone and
 * `top` still bounds it, so a number is still licensed only by a memory this question
 * actually retrieved. The two are different questions -- "may this site say this name at
 * all", which is a property of the corpus, and "does this retrieved material license this
 * figure", which is a property of the request -- and they were being answered from one
 * set. `Isobar` is in no memory and still fires; `evals/tier-a/grounding.fixtures.ts`
 * row 6 is the reason this module exists.
 *
 * Cached on the array identity `loadMemories()` returns, which is itself cached, so the
 * 55-memory build happens once per process rather than once per answer.
 */
let worldCache: { source: readonly Memory[]; gazetteer: Gazetteer } | null = null;

function world(): Gazetteer {
  const source = loadMemories();
  if (!worldCache || worldCache.source !== source) {
    worldCache = { source, gazetteer: buildGazetteer(source) };
  }
  return worldCache.gazetteer;
}

export function guard(answer: string, licences: Memory[], options: GuardOptions = {}): GuardResult {
  const gazetteer = world();
  const index = indexLicences(licences, gazetteer);
  const top = new Set(licences.slice(0, options.topLicences ?? licences.length).map((m) => m.id));

  const violations: Violation[] = [];
  const checked = { sentences: 0, quantities: 0, entities: 0 };

  for (const paragraph of answer.split(PARAGRAPH)) {
    // A new paragraph is a new subject; nothing said in the last one carries into it.
    let carried: string[] = [];

    for (const sentence of sentences(paragraph)) {
      checked.sentences++;
      const { known, unknown } = extractEntities(sentence, gazetteer);
      checked.entities += known.length + unknown.length;

      for (const name of unknown) {
        violations.push({
          sentence,
          kind: 'unknown-entity',
          detail:
            `"${name}" appears nowhere in content/memories.yaml. The corpus is the complete list of ` +
            'names this site may say, so an unrecognised one is a fabrication, not a gap.',
        });
      }

      const entities = known.length ? known : carried;
      if (known.length) carried = known;

      const quantities = extractQuantities(sentence);
      checked.quantities += quantities.length;

      for (const quantity of quantities) {
        const matches = index.filter((l) => l.quantities.some((q) => sameQuantity(quantity, q)));

        if (!matches.length) {
          violations.push({
            sentence,
            kind: 'unlicensed-quantity',
            detail: `${describe(quantity)} is licensed by no sentence in the corpus. Nothing measured it.`,
            quantity,
          });
          continue;
        }

        if (!entities.length) {
          if (!matches.some((l) => top.has(l.memoryId))) {
            violations.push({
              sentence,
              kind: 'unlicensed-quantity',
              detail:
                `${describe(quantity)} names nobody and is licensed only outside the retrieved memories ` +
                `(${[...new Set(matches.map((l) => l.memoryId))].join(', ')}).`,
              quantity,
            });
          }
          continue;
        }

        const paired = matches.some((l) => l.entities.some((e) => entities.some((a) => entityMatches(a, e))));
        if (!paired) {
          const best = matches[0];
          violations.push({
            sentence,
            kind: 'mispaired-quantity',
            detail:
              `${describe(quantity)} is licensed, but only about ${namesIn(best)} -- not about ` +
              `${entities.join(', ')}. A real number attached to the wrong subject is still a false claim.`,
            suggestion: `the corpus licenses ${describe(quantity)} for ${namesIn(best)} (${best.memoryId}), not for ${entities.join(', ')}`,
            quantity,
          });
        }
      }
    }
  }

  return { ok: violations.length === 0, violations, checked };
}

export type Salvage = {
  text: string;
  /** Sentences removed outright. */
  dropped: number;
  /**
   * Unbacked counts removed from sentences that were otherwise sound.
   *
   * Counted in NUMBERS, not in sentences, because that is the unit the visitor is told
   * about: `lib/ask/handler.ts` renders this as "two numbers removed". It used to count
   * sentences, so an answer that lost two numbers from one sentence said "one number
   * removed" -- a small lie on the one line of the page whose entire job is to say
   * exactly what was taken.
   */
  redacted: number;
};

/**
 * A count the model made up by counting -- "three rollouts", "two products" -- when the
 * corpus lists the items without numbering them. Small, a bare word or one or two digits,
 * and of kind `count`. Nothing else qualifies: a multiple, a percentage, money, or a real
 * number attached to the wrong subject is a claim, and the whole sentence goes.
 */
function isCountedWord(q: Quantity): boolean {
  return q.kind === 'count' && q.value <= 12 && /^(?:[a-z]+|\d{1,2})$/i.test(q.raw.trim());
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A comma or a coordinator on either side of a number makes it an ITEM IN A SERIES, and a
 * series item cannot be deleted -- the punctuation that joined it stays behind.
 *
 * "to", "than" and "between" are here for the same reason as the comma: "more than three
 * rollouts" and "between three and five markets" both leave a hole a reader can see.
 */
const SERIES_BEFORE = /(?:,|\b(?:and|or|nor|to|than|between)\b)\s*$/i;
const SERIES_AFTER = /^(?:and|or|nor|to|than|through)\b/i;

/**
 * Remove counted words, or refuse to.
 *
 * THIS IS THE ONE THE LIVE SITE GOT WRONG. It used to be one `String.replace` of the word
 * and any space after it, and nothing else -- correct for the shape it was written for,
 * "three rollouts"
 * loses a determiner and reads as prose -- and wrong for every other position a number can
 * sit in. MJK's screenshot is the proof: the model wrote "Clips run five, ten or fifteen
 * seconds, with motion kept deliberately small", two counts were removed, and the page
 * printed "Clips run , or fifteen seconds". A site whose single strongest claim is that it
 * checks what it says cannot afford to look like it cannot write, so a redaction that
 * leaves a scar is worse than the sentence being gone.
 *
 * So the removal is only permitted from DETERMINER position, and that is decided at the
 * seam rather than by a list of shapes:
 *
 *   - the number counted a noun the sentence actually names (`unit`),
 *   - what precedes it is a word and a space, never a comma or a coordinator,
 *   - what follows it is a word, never punctuation and never a coordinator.
 *
 * Sentence-initial numbers fail the second test on purpose: "Five clips run" would lose
 * its capital and open lowercase. Everything that fails returns null, and the caller drops
 * the sentence -- which costs a true clause and buys a page that always reads as English.
 */
function redactCounts(sentence: string, quantities: readonly Quantity[]): string | null {
  let text = sentence;

  for (const quantity of quantities) {
    const found = new RegExp(`\\b${escapeRegExp(quantity.raw.trim())}\\b\\s*`, 'i').exec(text);
    if (!found || !quantity.unit) return null;

    const before = text.slice(0, found.index);
    const after = text.slice(found.index + found[0].length);
    const determiner =
      /[A-Za-z0-9)\]'"]\s$/.test(before) &&
      !SERIES_BEFORE.test(before) &&
      /^[A-Za-z]/.test(after) &&
      !SERIES_AFTER.test(after);
    if (!determiner) return null;

    text = before + after;
  }

  return text.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Rescue what is true.
 *
 * A sentence whose only fault is a counted word loses the word and stays -- but only when
 * the word can be lifted out without leaving a mark; see `redactCounts`, which is where
 * the live site's "Clips run , or fifteen seconds" came from. Every other violating
 * sentence is dropped, and so is one whose redaction would not read as English. The
 * remainder is returned only if it is still an answer
 * rather than a fragment: at least half the sentences survive, and either two are left or
 * the one that is left is long enough to carry a thought on its own. Otherwise null, and
 * the caller should show the licensed memory text rather than a shrug.
 *
 * PARAGRAPHS SURVIVE. `sentences()` normalises whitespace, because the licence unit is a
 * sentence and a newline inside a YAML folded scalar is not a boundary -- so an earlier
 * `kept.join(' ')` returned every salvaged answer as a single block. Measured on 14 model
 * answers on 2026-09-04: the four longest all wrote real paragraph breaks (four, four,
 * two and two blank lines), all four tripped the guard, and the visitor read every one of
 * them as one slab. `.answer-prose` carries `white-space: pre-wrap`, so a blank line is
 * the only formatting the answer surface has, and this was deleting it on the one answer
 * shape long enough to need it. Salvage now runs paragraph by paragraph and rejoins with
 * the break; a paragraph emptied by the guard goes rather than leaving a gap. Behaviour on
 * an answer with no blank line is unchanged, which is every fixture in the test suite.
 */
export function salvageDetailed(answer: string, result: GuardResult): Salvage | null {
  const bySentence = new Map<string, Violation[]>();
  for (const v of result.violations) bySentence.set(v.sentence, [...(bySentence.get(v.sentence) ?? []), v]);

  const paragraphs: string[] = [];
  let total = 0;
  let keptCount = 0;
  let dropped = 0;
  let redacted = 0;
  let onlySurvivor = '';

  for (const paragraph of answer.split(PARAGRAPH)) {
    const all = sentences(paragraph);
    total += all.length;
    const kept: string[] = [];

    for (const sentence of all) {
      const faults = bySentence.get(sentence);
      if (!faults) {
        kept.push(sentence);
        continue;
      }
      const onlyCounts = faults.every((v) => v.kind === 'unlicensed-quantity' && v.quantity && isCountedWord(v.quantity));
      const trimmed = onlyCounts ? redactCounts(sentence, faults.map((v) => v.quantity!)) : null;
      if (trimmed === null) {
        dropped++;
        continue;
      }
      kept.push(trimmed);
      redacted += faults.length;
    }

    keptCount += kept.length;
    if (kept.length) {
      onlySurvivor = kept[0];
      paragraphs.push(kept.join(' '));
    }
  }

  if (keptCount * 2 < total) return null;
  const substantive = keptCount >= 2 || (keptCount === 1 && onlySurvivor.split(/\s+/).length >= 12);
  if (!substantive) return null;
  return { text: paragraphs.join('\n\n'), dropped, redacted };
}

/** The text alone. See `salvageDetailed`. */
export function salvage(answer: string, result: GuardResult): string | null {
  return salvageDetailed(answer, result)?.text ?? null;
}
