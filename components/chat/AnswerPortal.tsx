'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AnswerBlock from './AnswerBlock';
import { useAsk, type Answer } from './ChatProvider';
import { useAnswerTarget } from './useAnswerTarget';

/** Long enough for the outgoing answer to finish fading before it is unmounted. */
const SWAP_MS = 260;

/**
 * Two answers in the same place, for one transition.
 *
 * A second question landing on the stop the reader is already on used to swap the prose
 * underneath them with no transition at all, and because `.content-zone` is centred, a
 * shorter answer re-centred the whole column and moved the stop's title by about 90px.
 * The reader's eye was on that title when it happened.
 *
 * So the outgoing answer is kept for one beat and both are laid over each other in a
 * single grid cell: the old one fades out, the new one fades in, and the container's
 * height is what carries the difference between them. Keying on the question rather than
 * on object identity matters — `answer` is a fresh object on every streamed token, and
 * keying on that would restart the transition dozens of times a second.
 *
 * Under `prefers-reduced-motion` the opacity and the lift are dropped but the height
 * transition is kept, deliberately. A silent 90px jump is a discontinuity, and that is
 * worse for someone sensitive to motion than a short contained move; the preference asks
 * for less movement, not for things to teleport.
 */
function AnswerSwap({ answer }: { answer: Answer }) {
  const [outgoing, setOutgoing] = useState<Answer | null>(null);
  const [question, setQuestion] = useState(answer.question);
  const [settled, setSettled] = useState<Answer | null>(answer.envelope ? answer : null);

  /*
   * The finished form of whichever answer is on screen.
   *
   * Remembering it here rather than in a ref is what keeps this to two state writes per
   * question instead of two per streamed token: an answer can only be replaced once it
   * has finished, because `ask` refuses to send while one is in flight. So the answer
   * that has to fade out is always a completed one, and completed is the only moment
   * worth recording.
   */
  if (!answer.streaming && answer.envelope && settled?.question !== answer.question) {
    setSettled(answer);
  }

  /*
   * An answer with no envelope has not been routed yet — the question has been sent and
   * the server has not said which stop it belongs to. Keep the previous answer on screen
   * for those few seconds rather than blanking the column, and start the swap at the
   * moment the new one actually has something to show.
   */
  const routed = answer.envelope !== null;

  if (routed && answer.question !== question) {
    setQuestion(answer.question);
    setOutgoing(settled);
  }

  useEffect(() => {
    if (!outgoing) return;
    const t = setTimeout(() => setOutgoing(null), SWAP_MS);
    return () => clearTimeout(t);
  }, [outgoing]);

  const current = routed ? answer : settled;
  if (!current) return null;

  return (
    <div className="answer-swap" data-swapping={outgoing ? '' : undefined}>
      {outgoing && (
        <div className="answer-layer answer-layer-out" aria-hidden="true" key={outgoing.question}>
          <AnswerBlock answer={outgoing} />
        </div>
      )}
      <div className="answer-layer answer-layer-in" key={current.question}>
        <AnswerBlock answer={current} />
      </div>
    </div>
  );
}

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
  const stopId = answer?.envelope?.stopId ?? null;

  /*
   * The stop the answer is currently living in, held across the gap.
   *
   * Between sending a question and the server naming a stop, the new answer has no
   * envelope — so this used to resolve to no target at all, return null, and unmount the
   * whole subtree. That threw away everything `AnswerSwap` remembers, which is why a
   * second question replaced the first with no transition however carefully the
   * transition was written: there was nothing left to fade out. Remembering the last
   * stop keeps the portal, and the answer in it, exactly where it was until the
   * replacement is ready to take over.
   */
  const [lastStop, setLastStop] = useState<string | null>(stopId);
  if (stopId && stopId !== lastStop) setLastStop(stopId);

  const target = useAnswerTarget(stopId ?? lastStop);
  if (!answer || !target) return null;
  return createPortal(<AnswerSwap answer={answer} />, target);
}
