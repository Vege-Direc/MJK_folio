'use client';

import type { ReactNode } from 'react';
import { useAsk } from '@/components/chat/ChatProvider';

/**
 * The stop's authored paragraph, and whether it is currently making way for an answer.
 *
 * The paragraph itself is a server-rendered child passed straight through, so it is in
 * the initial HTML and survives no-JS, a failed hydration and a dead provider exactly as
 * it did before. This component adds one thing: when an answer lands on *this* stop, the
 * paragraph's height animates to zero so the answer is the only body text in the column.
 *
 * Height, not `display: none`. The old behaviour appended the answer below the paragraph
 * and let the column re-centre, which moved the stop title by 90px with no transition at
 * the moment the reader's eye was on it. A collapse that is animated is a collapse the
 * reader can follow; the `grid-template-rows: 0fr -> 1fr` idiom does it without anyone
 * having to measure the paragraph first.
 *
 * `inert` rather than `aria-hidden` alone: a collapsed paragraph must leave the tab order
 * and the accessibility tree together, or a keyboard visitor tabs into text nobody can
 * see. It is a plain boolean attribute in React 19.
 */
export default function AuthoredBody({ stopId, children }: { stopId: string; children: ReactNode }) {
  const { answer, showOriginal } = useAsk();
  const answered = answer?.envelope?.stopId === stopId;
  const collapsed = answered && !showOriginal;

  return (
    <div className="authored-body" data-collapsed={collapsed || undefined} inert={collapsed || undefined}>
      <div className="authored-body-inner">{children}</div>
    </div>
  );
}
