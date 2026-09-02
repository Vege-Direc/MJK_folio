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
 * nothing. Only one reason still announces itself: `off-topic`, which is a deliberate
 * refusal rather than a failure, and a refusal the visitor must see to understand why
 * they did not get what they asked for.
 *
 * `hero` is authored-only everywhere else in this codebase -- a generated answer may
 * never target it -- and that rule holds here too: a null or `hero` stopId both resolve
 * to `now` before any memory is looked up.
 */
import type { StopId } from '../content/stops';
import { memoriesForStop } from './corpus/load';

export type FallbackReason = 'budget' | 'rate' | 'off-topic' | 'provider' | 'unguarded';

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
 * The one reason that speaks for itself. Quoted from `content/system-prompt.md`'s
 * refusal rather than reworded, so the visitor hears one sentence whether it came from
 * the model or from here; `evals/tier-a/security.test.ts` asserts they cannot drift.
 */
const REFUSAL = { kicker: '§ NOT HERE', title: 'Not my lane. Ask what I’ve built.' };

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

  if (reason === 'off-topic') {
    return { ...REFUSAL, body, cites, announced: true };
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
