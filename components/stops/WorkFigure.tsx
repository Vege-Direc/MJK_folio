'use client';

import type { ReactNode } from 'react';
import { useAsk } from '../chat/ChatProvider';
import JewelEvidence from './JewelEvidence';
import JewelGates from './JewelGates';

/**
 * §07's media column, as one box with three states rather than a stack of figures.
 *
 * WHY IT IS A STATE MACHINE AND NOT A STACK. Measured on the built page at 1440x900: the
 * media column has 653px of height, and §07 already spends 647 of them on the apparel pair
 * plus two cards. Above 900px `.panel` is `overflow: hidden`, so anything ADDED to that
 * column is not scrolled out of reach, it is destroyed — silently, and whichever thing
 * happens to be last. So a JewelAI figure could only ever be a state of the box. That is
 * also the cheaper answer: neither JewelAI state is in the DOM until it is chosen, so the
 * three reference crops, the 1024px still and the 225kB clip cost nothing at rest.
 *
 * WHY `cites[0]` AND NOT `includes`. §02's figure asks `cites.includes('mjk-101')`, and
 * that is right there because exactly one memory on that stop is about the aircraft. §07
 * carries eighteen memories of which seven are JewelAI's, and retrieval licenses an answer
 * against several at once, so `includes` over a set that large would fire on almost any
 * question that touched this stop and the apparel pair would effectively never show. The
 * first cited id is the one retrieval ranked highest — it is what the answer is most about
 * — so it is the honest thing to key on. It is still deterministic and the model still has
 * no say in it, which is the rule the whole architecture rests on.
 *
 * WHAT THE DEFAULT IS, AND THE ONE THING WORTH MJK'S EYE. The default is the apparel pair,
 * so nothing about §07 changes for a visitor who never asks. Worth noticing though: §07's
 * authored paragraph is now entirely about JewelAI — "it asks for three to five
 * photographs of one piece... and sends the whole set with every image it generates" — and
 * the picture printed beside it at rest is the apparel work, which that paragraph no
 * longer mentions. Swapping the default to `evidence` is one line here. It is a content
 * call, not a layout one, so it is left as MJK's.
 */

/**
 * Which JewelAI memory selects which state.
 *
 * `jewelai-gates` is the only one whose subject IS the chart — it opens "What I care about
 * most in JewelAI Studio is that it is allowed to stop", and the lane is that sentence
 * drawn. Everything else about JewelAI gets the photographs, including
 * `jewelai-infrastructure`, whose queues and buckets neither figure shows: an answer about
 * JewelAI beside a picture of JewelAI is right even when the picture is not of the exact
 * clause, and an answer about JewelAI beside a picture of a kaftan is not.
 */
const FIGURE_BY_CITE: Readonly<Record<string, 'evidence' | 'gates'>> = {
  'jewelai-gates': 'gates',
  'jewelai-reads-the-piece': 'evidence',
  'jewelai-the-ring': 'evidence',
  'jewelai-video': 'evidence',
  'jewelai-platform': 'evidence',
  'project-jewel-ai': 'evidence',
};

/**
 * The one cite that says "this is about JewelAI" without saying which figure.
 *
 * `jewelai-infrastructure` is queues, buckets and signed URLs, and neither state draws any
 * of that. It would be a footnote except that retrieval ranks it FIRST for two of the
 * questions the gate chart exists to answer — run against `lib/retrieve.ts` directly, "how
 * does jewelai check its work" returns it ahead of `jewelai-gates`, and so does "does the
 * pipeline ever refuse to run". It matches on "checkpoints into Postgres" and "while work
 * is genuinely in progress" and "runs on", which are the words those questions use.
 *
 * So it is treated as a pass-through: it still settles that the column leaves the apparel
 * pair, and the cite behind it settles which figure. Walking the whole citation list would
 * not do — an apparel question cites `jewelai-reads-the-piece` fourth, and walking would
 * put a ring on the screen for a question about a kaftan.
 */
const AMBIGUOUS_CITE = 'jewelai-infrastructure';

function figureFor(cites: readonly string[]): 'evidence' | 'gates' | undefined {
  const first = cites[0];
  if (!first) return undefined;
  if (first !== AMBIGUOUS_CITE) return FIGURE_BY_CITE[first];
  return FIGURE_BY_CITE[cites[1] ?? ''] ?? 'evidence';
}

export default function WorkFigure({ pair }: { pair: ReactNode }) {
  const { answer } = useAsk();
  const envelope = answer?.envelope;

  /*
   * Gated on the stop as well as the citation. An answer that landed on §06 must not
   * quietly rearrange §07 behind the visitor's back — that is the failure `TASKS.md` item
   * 21 records in the other direction, where the figure and the answer disagreed.
   */
  const state = envelope?.stopId === 'work' ? figureFor(envelope.cites) : undefined;

  if (state === 'gates') return <JewelGates />;
  if (state === 'evidence') return <JewelEvidence />;

  /*
   * `pair` arrives as a prop rather than an import because `ApparelPair` is a Server
   * Component and a parallel change is adding more pairs to it. Passing it through keeps
   * it server-rendered and keeps this file out of that component entirely.
   */
  return <>{pair}</>;
}
