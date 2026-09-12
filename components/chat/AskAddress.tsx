'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ASK_PARAM, askHref, cardQuestion } from '@/lib/card-question';
import { useAsk } from './ChatProvider';

/**
 * An answer has an address.
 *
 * `scripts/check-corpus.ts` has been asking for this in the repository's own words for
 * longer than any other open complaint: an answer "has no URL, which is fatal for the
 * audience that scans and forwards rather than converses". Until this component existed,
 * a visitor who asked the best question this site can be asked had nothing to send to
 * anybody. The answer was on their screen and nowhere else. Reload, and it was gone.
 *
 * This component owns `?ask=<memory-id>` end to end and is the only thing in the tree that
 * touches `history`. Two directions, and they are deliberately not symmetric.
 *
 * READING an address asks its question. `?ask=project-tallybridge` on a cold load resolves
 * the id against the corpus, builds the same string a card would build -- `cardQuestion`,
 * one function, so a link and a card cannot drift -- and asks it. The flight, the routing
 * and the answer are then the ordinary ones; nothing about this path is special downstream,
 * which is the property that makes it cheap.
 *
 * WRITING an address is derived, never plumbed. When an answer lands, the envelope already
 * carries `cites[0]` -- the memory retrieval ranked first -- and `evals/tier-a/cards.test.ts`
 * already asserts that a card question ranks its own memory first. So "this answer is the
 * answer to `cardQuestion(cites[0].title)`" is a question this component can ask of data it
 * already has, and the answer to it is the address. No new field on the wire, no argument
 * threaded through `ask()`, and -- this is the part that mattered -- no change to
 * `goToStop` or to `lib/flight.ts`, whose cancel-on-wheel/touch/key behaviour is the most
 * carefully measured code in the client and had no business being reopened for a URL.
 *
 * A consequence worth naming: every card press on the page becomes forwardable without
 * `components/stops/AskCard.tsx` changing at all. The card stays a `<button>` and keeps its
 * `aria-expanded` disclosure contract and its Space key, because the address is read off
 * the answer rather than off the control.
 *
 * WHY ONLY SOME ANSWERS GET AN ENTRY. A typed question has no address -- there is no id
 * that names it, and `?ask=` deliberately cannot carry prose -- so no `pushState` is made
 * for one. That is not a gap, it is the invariant: the URL is written exactly when it is
 * true. The cost is that the address bar can lag behind a typed follow-up, still naming
 * the last answer that had a name. That is the honest failure: a stale address points at a
 * real answer this session actually gave, where the alternative -- rewriting the entry the
 * visitor arrived on -- changes the address bar under someone who followed a link and
 * gives them nothing back for it.
 *
 * BACK MEANS BACK. Each addressable answer is one history entry, so Back walks back through
 * them, and Back off the first one leaves the site the way it always did. `popstate`
 * re-derives from the URL rather than restoring anything, which is why there is no answer
 * cache here and no second copy of the message list to keep in sync: the address IS the
 * state.
 */
export default function AskAddress({ titles }: { titles: Record<string, string> }) {
  const { answer, ask, dismiss } = useAsk();

  /**
   * The address currently on screen, as this component last acted on it.
   *
   * A ref and not state because nothing renders it -- this component draws nothing at all --
   * and because it has to be readable and writable from inside a `popstate` listener that
   * was registered once. It is also the loop breaker: `popstate` fires for entries this
   * component pushed as well as for the Back button, and without a record of what has
   * already been applied, arriving at an address would re-ask its own question.
   */
  const applied = useRef<string | null>(null);

  const apply = useCallback(
    (id: string | null) => {
      if (id === applied.current) return;
      applied.current = id;
      // Back past the first answer: the address says nothing is open, so nothing is.
      // `dismiss` is the site's existing undo -- the same one a second press of a card
      // performs -- so Back and the card agree about what "put it away" means.
      if (!id) {
        dismiss();
        return;
      }
      const title = titles[id];
      // An id that is not in the corpus is not an error to report, it is a link that has
      // gone stale -- a memory renamed, a URL mistyped, an address forwarded after the
      // corpus moved on. The page is already a complete document; leaving it exactly as it
      // is says the true thing, where an error message would invent a failure the visitor
      // did not cause and cannot fix.
      if (!title) return;
      ask(cardQuestion(title), 'link');
    },
    [ask, dismiss, titles],
  );

  /*
   * Nothing is asked while the intro gate is up, and the reason is a defect rather than
   * good manners.
   *
   * `INTRO_ARM` in `app/layout.tsx` dismisses the gate on the first wheel, key, pointer or
   * touchmove. `flyTo` cancels a flight on the first wheel, touch or key -- correctly: a
   * flight is a suggestion and the moment the visitor touches the page it is over. Asking
   * behind the gate puts those two rules in the same gesture: the flight starts under an
   * opaque overlay, and the very movement that lifts the overlay kills it, leaving the page
   * stranded at whatever scroll position the tween had reached, with the answer somewhere
   * else. The visitor never sees the page move, which is the one thing this site does.
   *
   * So the address waits for the gate. `INTRO_DECISION` already makes this argument for the
   * neighbouring case -- `if(location.hash)return;`, because somebody arriving at an anchor
   * was sent to a place rather than to the front door -- and an `?ask=` link is the same
   * kind of arrival. That script cannot be taught about this parameter from here, and it
   * does not need to be: waiting costs one observer and leaves the gate's own copy, and its
   * own reasons for existing, exactly as they are.
   */
  useEffect(() => {
    const read = () => new URLSearchParams(window.location.search).get(ASK_PARAM);
    const onPop = () => apply(read());
    const html = document.documentElement;

    const begin = () => {
      window.addEventListener('popstate', onPop);
      apply(read());
    };

    let observer: MutationObserver | null = null;
    if (html.dataset.intro === 'on') {
      observer = new MutationObserver(() => {
        if (html.dataset.intro === 'on') return;
        observer?.disconnect();
        begin();
      });
      observer.observe(html, { attributes: true, attributeFilter: ['data-intro'] });
    } else {
      begin();
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener('popstate', onPop);
    };
  }, [apply]);

  /*
   * The address this answer has, or null when it has none.
   *
   * Computed during render rather than in the effect below so the effect depends on a
   * string: `answer` is a fresh object on every streamed token, and an effect keyed on it
   * would push a history entry per token.
   */
  const cited = answer?.envelope?.cites[0];
  const title = cited ? titles[cited] : undefined;
  const address = title && answer?.question === cardQuestion(title) ? cited : null;

  useEffect(() => {
    if (!address || address === applied.current) return;
    applied.current = address;
    history.pushState(null, '', askHref(address));
  }, [address]);

  return null;
}
