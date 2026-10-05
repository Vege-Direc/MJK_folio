import type { Memory } from '@/lib/corpus/schema';

/**
 * Tags that index a memory for retrieval but describe its job on the page rather than its
 * subject. `cta` is the whole list and the reason the list exists: it is the first tag on
 * two contact memories, so §08 — the conversion screen, the one place a visitor decides
 * whether to write to MJK — printed the eyebrow "CTA" above both of its cards. That is a
 * marketing department's word for the card, shown to the person the card is aimed at.
 *
 * The tag stays in the corpus, because it is doing real work in the router. It just does
 * not get to be a label.
 */
export const INTERNAL_TAGS = new Set(['cta']);

/**
 * The card kicker: the memory's period if it has one, else the first tag that names its
 * subject rather than its function. No kicker at all is a fine outcome — an eyebrow is an
 * address, and a card with nothing to say about where it sits should say nothing.
 *
 * This lives in its own file so `evals/tier-a/voice.test.ts` can read every kicker the
 * site will actually render without importing a React tree. The rule that visitor-facing
 * copy never explains the machine was only checking copy authored in `stops.ts` and the
 * fallbacks, which is why a tag reached the page for months.
 */
export function cardKicker(m: Memory): string {
  return m.period ?? m.tags.find((t) => !INTERNAL_TAGS.has(t)) ?? '';
}
