'use client';

import { createPortal } from 'react-dom';
import AnswerBlock from './AnswerBlock';
import { useAsk } from './ChatProvider';
import { useAnswerTarget } from './useAnswerTarget';

/**
 * Puts the answer inside the stop it belongs to.
 *
 * Every stop section renders an empty `#answer-<stopId>` container; when the envelope
 * names a stop, this portals the answer into that container so it reads as part of the
 * page, under the stop's own title, rather than as a chat bubble. If the container is not
 * on the page (an older layout, or a stop without one), the dock shows the answer itself.
 */
export default function AnswerPortal() {
  const { answer } = useAsk();
  const target = useAnswerTarget(answer?.envelope?.stopId ?? null);
  if (!answer || !target) return null;
  return createPortal(<AnswerBlock answer={answer} />, target);
}
