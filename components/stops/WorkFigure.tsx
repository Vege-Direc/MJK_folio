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
type Figure = 'evidence' | 'gates' | 'pair';

const FIGURE_BY_CITE: Readonly<Record<string, Figure>> = {
  'jewelai-gates': 'gates',
  'jewelai-reads-the-piece': 'evidence',
  'jewelai-the-ring': 'evidence',
  'jewelai-video': 'evidence',
  'jewelai-platform': 'evidence',
  'project-jewel-ai': 'evidence',
  /*
   * The apparel work is a state now rather than the floor, because the DEFAULT changed.
   *
   * It used to be that anything not recognised fell through to the pair, so these three
   * needed no entry. Now that the default is `evidence` they do, or a question about the
   * photoshoot pipeline would be answered beside a photograph of a ring.
   */
  'project-photoshoot-pipeline': 'pair',
  'photoshoot-how-it-works': 'pair',
  'photoshoot-numbers': 'pair',
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

function figureFor(cites: readonly string[]): Figure | undefined {
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
  if (state === 'pair') return <>{pair}</>;

  /*
   * THE DEFAULT IS THE JEWELAI EVIDENCE, and it used to be the apparel pair.
   *
   * MJK asked what the plan was for JewelAI and whether it needed a section of its own.
   * The honest answer to the first half is that a visitor who scrolled all nine sections
   * and never typed saw NOTHING of it — the assets were in place, both figures worked, and
   * neither was reachable without knowing to type the name. Meanwhile §07's authored
   * paragraph opens with the words "JewelAI Studio" and every clause of it is JewelAI,
   * beside a photograph of a kaftan the paragraph does not mention. And a motorcycle hobby
   * has the largest media treatment on the site.
   *
   * It was worse than an oversight. None of the four suggested prompts reached a JewelAI
   * figure: "Show me the AI work." cites `build-overview` first, and `build-overview`'s
   * body LEADS with JewelAI Studio — so the broadest question the site offers produced an
   * answer about JewelAI printed next to a kaftan.
   *
   * The height objection that made this a state machine still holds and is unchanged; this
   * only swaps which state is the floor. Measured: 0.0px at 1440x900, and it SAVES 141.8px
   * at 1920, 255.7px at 2560 and 104.3px at 390x664, the last on a section already flagged
   * for overrunning the dock.
   *
   * It is one line to put back, and it is a content decision rather than a layout one.
   */
  return <JewelEvidence />;
}
