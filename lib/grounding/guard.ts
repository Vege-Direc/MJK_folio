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
 *      never worked for.
 *   2. UNLICENSED QUANTITY. The number appears in no licence sentence at all.
 *   3. MISPAIRED QUANTITY. The number exists, but every sentence that licenses it is
 *      about someone else.
 *
 * Two carve-outs, both narrow and both stated plainly because both are how a leak would
 * get through:
 *
 *   - PRONOUN CARRY-OVER. "It cut setup time in half." names nobody, so it inherits the
 *     entities of the previous ANSWER sentence. Without this, the guard would either
 *     wave through every follow-up sentence or fail every one of them.
 *   - ENTITY-LESS SENTENCES. If carry-over finds nothing either, the quantity only has to
 *     be licensed by a memory in the top `topLicences` of the licence list. The default
 *     is the whole list, which makes this the weakest rule in the file: a document-
 *     opening sentence with a number and no name gets set-membership treatment. Callers
 *     holding a ranked retrieval set should pass `topLicences` and tighten it.
 */
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

export function guard(answer: string, licences: Memory[], options: GuardOptions = {}): GuardResult {
  const gazetteer = buildGazetteer(licences);
  const index = indexLicences(licences, gazetteer);
  const top = new Set(licences.slice(0, options.topLicences ?? licences.length).map((m) => m.id));

  const violations: Violation[] = [];
  const checked = { sentences: 0, quantities: 0, entities: 0 };
  let carried: string[] = [];

  for (const sentence of sentences(answer)) {
    checked.sentences++;
    const { known, unknown } = extractEntities(sentence, gazetteer);
    checked.entities += known.length + unknown.length;

    for (const name of unknown) {
      violations.push({
        sentence,
        kind: 'unknown-entity',
        detail:
          `"${name}" appears in none of the ${licences.length} licensed memories. The corpus is the ` +
          'complete list of names this site may say, so an unrecognised one is a fabrication, not a gap.',
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

  return { ok: violations.length === 0, violations, checked };
}

export type Salvage = {
  text: string;
  /** Sentences removed outright. */
  dropped: number;
  /** Sentences kept with an unbacked count removed from them. */
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
 * Rescue what is true.
 *
 * A sentence whose only fault is a counted word loses the word and stays. Every other
 * violating sentence is dropped. The remainder is returned only if it is still an answer
 * rather than a fragment: at least half the sentences survive, and either two are left or
 * the one that is left is long enough to carry a thought on its own. Otherwise null, and
 * the caller should show the licensed memory text rather than a shrug.
 */
export function salvageDetailed(answer: string, result: GuardResult): Salvage | null {
  const all = sentences(answer);
  const bySentence = new Map<string, Violation[]>();
  for (const v of result.violations) bySentence.set(v.sentence, [...(bySentence.get(v.sentence) ?? []), v]);

  const kept: string[] = [];
  let dropped = 0;
  let redacted = 0;

  for (const sentence of all) {
    const faults = bySentence.get(sentence);
    if (!faults) {
      kept.push(sentence);
      continue;
    }
    const onlyCounts = faults.every((v) => v.kind === 'unlicensed-quantity' && v.quantity && isCountedWord(v.quantity));
    if (!onlyCounts) {
      dropped++;
      continue;
    }
    let text = sentence;
    for (const v of faults) {
      text = text.replace(new RegExp(`\\b${escapeRegExp(v.quantity!.raw.trim())}\\b\\s*`, 'i'), '');
    }
    kept.push(text.replace(/\s{2,}/g, ' ').trim());
    redacted++;
  }

  if (kept.length * 2 < all.length) return null;
  const substantive = kept.length >= 2 || (kept.length === 1 && kept[0].split(/\s+/).length >= 12);
  if (!substantive) return null;
  return { text: kept.join(' '), dropped, redacted };
}

/** The text alone. See `salvageDetailed`. */
export function salvage(answer: string, result: GuardResult): string | null {
  return salvageDetailed(answer, result)?.text ?? null;
}
