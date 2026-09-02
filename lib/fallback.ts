/**
 * What the site shows when it cannot, or should not, let the model answer.
 *
 * Every path that reaches this module -- the daily budget is spent, a visitor is going
 * too fast, the question is off-topic, the provider is down, or a generated answer
 * failed the grounding guard -- has one thing in common: there is no live, checked
 * answer to show. So none is invented. `fallbackBlock` builds its `body` out of
 * `memoriesForStop`'s own prose, verbatim, never paraphrased or summarised -- the same
 * guarantee the rest of the corpus pipeline makes for a live answer, held here too. A
 * fallback screen is not a degraded product; it is still 100% licensed copy, just
 * chosen deterministically instead of retrieved.
 *
 * `hero` is authored-only everywhere else in this codebase -- a generated answer may
 * never target it -- and that rule holds here too: a null or `hero` stopId both resolve
 * to `now` before any memory is looked up.
 */
import type { StopId } from '../content/stops';
import { memoriesForStop } from './corpus/load';

export type FallbackReason = 'budget' | 'rate' | 'off-topic' | 'provider' | 'unguarded';

export interface FallbackBlock {
  kicker: string;
  title: string;
  body: string;
  cites: string[];
}

/** hero has no memories of its own (the corpus schema forbids it) and is authored-only. */
const DEFAULT_STOP: StopId = 'now';

/**
 * Kicker and title per reason. Title is fixed copy, in voice, independent of which stop
 * it accompanies -- only `body` and `cites` vary with `stopId`. `off-topic`'s title is
 * quoted verbatim from `content/system-prompt.md`'s corpus-approved refusal, not
 * reworded here, for the same reason nothing else in this file paraphrases the corpus.
 */
const COPY: Record<FallbackReason, { kicker: string; title: string }> = {
  budget: {
    kicker: '§ RESTING',
    title: 'The mind is resting for today. Here is what it would have said.',
  },
  rate: {
    kicker: '§ SLOW DOWN',
    title: 'That is too many, too fast. Here is what it would have said.',
  },
  'off-topic': {
    kicker: '§ NOT HERE',
    title: 'I only talk about Mathew. Ask me what he shipped.',
  },
  provider: {
    kicker: '§ QUIET',
    title: 'The mind is quiet right now. Here is what it would have said.',
  },
  unguarded: {
    kicker: '§ VERIFIED',
    title: 'That answer did not check out. Here is what is verified instead.',
  },
};

export function fallbackBlock(stopId: StopId | null, reason: FallbackReason): FallbackBlock {
  const { kicker, title } = COPY[reason];
  const resolvedStop: StopId = stopId && stopId !== 'hero' ? stopId : DEFAULT_STOP;

  // The first one or two memories for the stop, in corpus order, verbatim. Two when a
  // second is available, so a stop whose lead memory is a single short sentence still
  // reads as a real answer rather than a fragment.
  const memories = memoriesForStop(resolvedStop).slice(0, 2);

  return {
    kicker,
    title,
    body: memories.map((m) => m.body).join('\n\n'),
    cites: memories.map((m) => m.id),
  };
}
