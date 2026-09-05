'use client';

import type { ReactNode } from 'react';
import { useAsk } from '@/components/chat/ChatProvider';
import { cardQuestion } from '@/lib/card-question';

/**
 * A card is a question that has not been asked yet.
 *
 * MJK, looking at §06: "some sections have information cutting off prematurely and user
 * can't expand to see more either... poor user experience right? We need to show what user
 * can explore." And underneath it, the larger question: "how do we guide them towards chat
 * based behaviour instead of just scroll based typical website behavior?"
 *
 * Those turn out to be one question. Every card's DOM id already IS its memory's id, and
 * retrieval already cites memory ids, so a card was addressable the whole time — nobody had
 * connected the two ends. Pressing one asks about that memory, the page flies to the section
 * and the answer arrives. Measured: the card reads "…for ERPs, creative…" and the answer
 * landing beside it opens "…for ERPs, creative pipelines and this site." The ellipsis is not
 * excused by the mechanism, it is RESOLVED by it, 700px apart on the same screen.
 *
 * It is also the only teaching moment on the page that costs nothing. Every mechanism that
 * added height failed: §06 has −18.1px of slack at 1280x720 and §07 has −74.5px, into an
 * `overflow: hidden` that destroys rather than scrolls, and the hero has exactly 0.0px at
 * 390x664. This adds no element and no pixel.
 *
 * A TOGGLE, NOT A TRIGGER, and that is the most important line here. Pressing the same card
 * again does not re-ask; it puts the answer away. Three things fall out of that at once. It
 * gives the site the undo it never had — `Show original` restores the authored paragraph
 * *alongside* the answer and never removes it. It gives the card a standard `aria-expanded`
 * disclosure contract instead of an invented one. And it sidesteps a measured defect: asking
 * the identical question twice leaves `showOriginal` unreset and runs no swap transition,
 * because `ChatProvider` compares question strings to notice a new question — §06 reached
 * 1518px with the authored paragraph stacked under a 1,434-character answer. A toggle never
 * sends the second one, so the comparison is never asked to tell two identical strings apart.
 *
 * PREFILL, THEN SUBMIT, in one action, and do not move focus. The prefill is what teaches:
 * the question appears in the field at the bottom of the screen and then runs, so the field's
 * role is demonstrated rather than described. Focus stays where it is because the card can be
 * 700px from the input on a desktop and, on a phone, the input is in a fixed bar — following
 * it would raise the keyboard over the answer that was just asked for.
 */
export default function AskCard({
  id,
  title,
  stopId,
  children,
}: {
  /** The memory id. Load-bearing: the answer's card list and any pulse target address it. */
  id: string;
  title: string;
  stopId: string;
  children: ReactNode;
}) {
  const { answer, asking, ask, setDraft, dismiss } = useAsk();
  const question = cardQuestion(title);

  /*
   * Asked means: this exact question is the one on screen, AND it landed on this card's own
   * stop. The stop test is not redundant — an answer that landed elsewhere must not light a
   * card in a section the visitor is not looking at.
   */
  const asked = answer !== null && answer.question === question && answer.envelope?.stopId === stopId;

  return (
    <button
      type="button"
      className="mini-card"
      id={id}
      aria-expanded={asked}
      aria-controls={`answer-${stopId}`}
      onClick={() => {
        if (asked) {
          dismiss();
          return;
        }
        // A question already in flight owns the field; overwriting it mid-stream would
        // leave the box showing something the page is not answering.
        if (asking) return;
        setDraft(question);
        ask(question);
      }}
    >
      {children}
    </button>
  );
}
