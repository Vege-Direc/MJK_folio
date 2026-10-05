/**
 * What the site shows when it cannot, or should not, let the model answer.
 *
 * Every path that reaches this module -- the daily budget is spent, a visitor is going
 * too fast, the provider is down, or a generated answer failed the grounding guard --
 * has one thing in common: there is no live, checked answer to show. So none is
 * invented. `fallbackBlock` builds its `body` out of `memoriesForStop`'s own prose,
 * verbatim, never paraphrased or summarised.
 *
 * WHAT CHANGED, AND WHY IT MATTERS. These blocks used to introduce themselves: "That is
 * too many, too fast. Here is what it would have said." The owner caught the flaw by
 * looking at one. He had asked why he wanted to fly and had been served his own account
 * of the cockpit at nine years old -- a complete, well-written answer to exactly the
 * question asked -- under a heading apologising for it and calling it a substitute for
 * something better. The site was undermining good content and raising a question in the
 * visitor's mind that nothing on the page then answered.
 *
 * The premise was wrong. Corpus prose is not a degraded answer; on this site it is the
 * best answer available, because it is the only text MJK actually wrote. A visitor was
 * never promised a model wrote anything, so presenting his words as the answer conceals
 * nothing. Two reasons still announce themselves -- `off-topic` and `unknown` -- because
 * both are deliberate refusals rather than failures, and a refusal the visitor must see
 * to understand why they did not get what they asked for.
 *
 * `hero` is authored-only everywhere else in this codebase -- a generated answer may
 * never target it -- and that rule holds here too: a null or `hero` stopId both resolve
 * to `now` before any memory is looked up.
 */
import type { StopId } from '../content/stops';
import { memoriesForStop } from './corpus/load';

export type FallbackReason = 'budget' | 'rate' | 'off-topic' | 'unknown' | 'provider' | 'unguarded';

export interface FallbackBlock {
  /**
   * Set only when the block announces itself. `null` means the caller should dress this
   * like any other answer, with the stop's ordinary answer kicker.
   */
  kicker: string | null;
  title: string;
  body: string;
  cites: string[];
  /**
   * Whether the visitor is being told something about the site rather than about MJK.
   * True only for a deliberate refusal.
   */
  announced: boolean;
}

/** hero has no memories of its own (the corpus schema forbids it) and is authored-only. */
const DEFAULT_STOP: StopId = 'now';

/**
 * The two reasons that speak for themselves. Quoted from `content/system-prompt.md`'s own
 * refusals rather than reworded, so the visitor hears one sentence whether it came from
 * the model or from here; `evals/tier-a/security.test.ts` asserts they cannot drift.
 *
 * THEY USED TO BE ONE, AND THAT WAS THE DEFECT. `retrieve` sets `topical: false` for three
 * different reasons -- a request to do the visitor's own work, a subject the corpus holds
 * nothing on, and a question with nothing in it to search for -- and this file answered all
 * three with "Not my lane. Ask what I've built." So "do you know Rust?", which is a fair
 * question and one a recruiter asks early, was answered as though it had been an
 * imposition. MJK, on the version that shipped: "if that version doesn't have the answer it
 * shouldn't make up stuff and it shouldn't act like a machine to the user."
 *
 * Declining to do someone's homework and not knowing something are different things, and a
 * person says them differently. `unknown` is the second one, and every word of it is doing
 * a job:
 *
 *   "I do not know that one" -- said once, plainly, with no apology and no explanation of
 *   the machinery that failed to find it.
 *
 *   "and I am not going to guess" -- the site's actual guarantee, stated as a choice he
 *   made rather than as a limitation he is stuck with. It is also true: the grounding guard
 *   is what makes it true, and this is the one place a visitor is told so in his voice.
 *
 *   "It is better put to me directly" -- an affordance, and the reason this block routes to
 *   `contact`: the page flies to §08, where the mail link, the resume and LinkedIn are.
 *
 * WHAT IS DELIBERATELY ABSENT IS A PROMISE. The sentence MJK first proposed was "I'll check
 * and get back to you", and it cannot ship: nothing here reaches an inbox, nothing is
 * recorded, and nobody reads the question afterwards. It would be a lie the moment it was
 * written -- and it is the one class of lie this architecture cannot catch, because
 * `lib/grounding/guard.ts` checks every claim against what has already happened and a
 * commitment is a claim about the future. `evals/tier-a/promises.test.ts` is the guard that
 * covers the gap, and it reads this file.
 */
const REFUSALS = {
  'off-topic': { kicker: '§ NOT HERE', title: 'Not my lane. Ask what I’ve built.' },
  unknown: {
    kicker: '§ NOT HERE',
    title: 'I do not know that one, and I am not going to guess. It is better put to me directly.',
  },
} as const;

/**
 * @param preferIds memory ids in priority order (typically the retrieval hits for the
 *   question). Memories on the stop that appear here lead, in this order; the rest follow
 *   in corpus order. Without it the first memories of the stop are used.
 */
export function fallbackBlock(
  stopId: StopId | null,
  reason: FallbackReason,
  preferIds: readonly string[] = [],
): FallbackBlock {
  const resolvedStop: StopId = stopId && stopId !== 'hero' ? stopId : DEFAULT_STOP;

  const onStop = memoriesForStop(resolvedStop);
  const rank = (id: string) => {
    const i = preferIds.indexOf(id);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  const ordered = [...onStop].sort((a, b) => rank(a.id) - rank(b.id));

  // The first one or two memories, verbatim. Two when a second is available, so a stop
  // whose lead memory is a single short sentence still reads as a real answer rather
  // than a fragment.
  const memories = ordered.slice(0, 2);
  const body = memories.map((m) => m.body).join('\n\n');
  const cites = memories.map((m) => m.id);

  /*
   * A refusal says one thing and stops.
   *
   * It used to say "Not my lane. Ask what I've built." and then print the first two
   * memories of whatever stop the router had guessed at -- so "write me a poem about cats"
   * produced a refusal followed by fifteen lines about JewelAI's video pipeline, a subject
   * the visitor had not raised, under a heading declining to discuss anything. It is the
   * one moment the site speaks about itself and it was saying two opposite things in the
   * same block.
   *
   * The premise was the same one `fallbackBlock` gets right everywhere else -- corpus prose
   * is a real answer -- applied to the one case where it is false. A refusal is not an
   * answer that came out short; it is the site declining, and prose stapled to it is not
   * evidence of anything except that the retriever matched a word.
   *
   * No cites either. Citing memories under text that quotes none of them claims a licence
   * the block does not have, and the WebGL layer would pulse cards for a question that was
   * never about them.
   */
  if (reason === 'off-topic' || reason === 'unknown') {
    return { ...REFUSALS[reason], body: '', cites: [], announced: true };
  }

  // Everything else is simply an answer. It takes the leading memory's own title, so it
  // is indistinguishable from a generated one -- which is the point, because it is just
  // as true and rather better written.
  return {
    kicker: null,
    title: memories[0]?.title ?? 'From the record',
    body,
    cites,
    announced: false,
  };
}
