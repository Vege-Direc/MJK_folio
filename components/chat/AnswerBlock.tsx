'use client';

import { STOPS } from '@/content/stops';
import { askHref, cardQuestion } from '@/lib/card-question';
import type { Answer } from './ChatProvider';
import { useAsk } from './ChatProvider';

/**
 * The tail shows only where the stop has no media column of its own. On a `cards`,
 * `timeline`, `carousel` or `contact` stop the memories already sit beside the text and a
 * question about one of them is a card the reader can already see.
 *
 * WHAT THIS LIST USED TO BE. Three cards naming the top-cited memories -- the answer's
 * provenance, which is to say the memories the answer had just been written from. Inert,
 * and an echo: read a paragraph, then read the names of the things the paragraph was
 * about. It is one element, and one question, now. The provenance did not move somewhere
 * worse; it was never doing the job it was credited with, because a reader who has just
 * read the paragraph does not need the paragraph's subjects listed underneath it.
 */
function showsCards(stopId: string | undefined): boolean {
  const stop = STOPS.find((s) => s.id === stopId);
  return stop?.compose === 'plain';
}

/**
 * The ordinary answer kicker is `§ ANSWER · <STOP>`, assembled from the stop's own
 * kicker. Docked inside that stop, directly beneath `§ 06 — Pivot`, it is the same
 * word twice and a second eyebrow stacked on the first — noise, not orientation.
 *
 * So the docked answer does not draw it, with one exception: a refusal carries
 * `§ NOT HERE`, which says something the stop's kicker does not and is the one case
 * where the reader genuinely needs telling that this is not an answer about this stop.
 * The rule is therefore "draw the kicker when it is not the ordinary one", and the
 * ordinary one is the only kicker the handler builds from a stop name.
 */
function isOrdinaryKicker(kicker: string | undefined): boolean {
  return (kicker ?? '').startsWith('§ ANSWER');
}

/**
 * One answer, laid out so that it is the foreground of the stop it lands in.
 *
 * The move that does that is COLOUR, not size. The answer's prose is the only body text
 * on the page rendered at full `--color-type`; the stop's own paragraph, the card
 * bodies, the dek and every label stay `--color-type-muted`. One token, and the answer
 * outranks everything around it without a border, a background, a panel or a second
 * heading competing with the stop's title. The 19px/17px step supports that; it is not
 * what carries it.
 *
 * Which is also why `envelope.title` is demoted here rather than promoted. It used to be
 * a 30px serif `<h3>` directly under the stop's own 70px serif title — two headings, one
 * subject, and on `cards` stops the answer's title was frequently the exact text of a
 * card 300px to its right. As a 20px muted dek it does the job a dek does: it tells you
 * what the paragraph below is about, and then gets out of the way.
 *
 * The stop's authored title is untouched. It is the stop's identity and the anchor the
 * smooth scroll lands on. The authored *paragraph* is what gives way, collapsing its
 * height in `AuthoredBody` so the answer is the only prose in the column — and
 * SHOW ORIGINAL brings it back without discarding the answer.
 *
 * Accessibility: the streaming body mutates dozens of times a second, so it is
 * `aria-hidden` while it streams and carries `aria-busy`; a visually-hidden live region
 * stays mounted from the first render and receives the finished text once, which is what
 * a screen reader should hear. Mounting a live region that already contains its text is
 * the classic way to have it announced by nobody.
 * Palette: DOM tokens only. The WebGL orange never appears here.
 */
export default function AnswerBlock({ answer, compact = false }: { answer: Answer; compact?: boolean }) {
  const { envelope, shown, streaming, question } = answer;
  const { ask, showOriginal, setShowOriginal } = useAsk();
  const done = !streaming && envelope !== null && envelope.status !== 'streaming';

  // Compact means the dock is showing this itself, with no stop kicker above it, so the
  // envelope's kicker is the only orientation there is.
  const kicker = compact ? envelope?.kicker : isOrdinaryKicker(envelope?.kicker) ? null : envelope?.kicker;

  return (
    <article className={compact ? 'answer answer-compact' : 'answer'} aria-busy={streaming || undefined} data-status={envelope?.status ?? 'pending'}>
      {kicker && <p className="answer-kicker">{kicker}</p>}

      <div className="answer-asked">
        <p className="answer-question">
          <span className="answer-asked-label">ASKED</span>
          {question}
        </p>
        {!compact && (
          <button type="button" className="answer-toggle" onClick={() => setShowOriginal(!showOriginal)}>
            {showOriginal ? 'Hide the section' : 'Show original'}
          </button>
        )}
      </div>

      {/*
        An empty title is a decision, not a missing value: the server drops the dek when
        no memory it licensed is actually reflected in the answer, because a heading that
        contradicts the paragraph beneath it is worse than no heading at all.

        And the client drops it again when the question already contains it. Cards ask
        `Tell me about {title}.`, so a card answer printed its own dek directly under an
        ASKED line that had just said the same words — "Tell me about AI agents." above
        "AI agents" above the prose. This is the same argument AnswerBlock already makes
        for suppressing the kicker on a docked answer: the same word twice is not a
        heading, it is an echo.
      */}
      {envelope?.title && !question.toLowerCase().includes(envelope.title.toLowerCase()) && (
        <p className="answer-dek">{envelope.title}</p>
      )}

      {/*
        A refusal has no body, and an empty paragraph is not nothing: it still takes its
        line-height and its margin, leaving a gap under the dek that reads as a failed load.
      */}
      {(shown || streaming) && (
        <p className="answer-prose" aria-hidden={streaming || undefined}>
          {shown}
          {streaming && <span className="answer-caret" aria-hidden="true" />}
        </p>
      )}

      {/*
        Mounted from the first render and empty until the guard has had the last word, so
        the region exists before its content does. A live region inserted with its text
        already in it is not reliably announced.
      */}
      {/*
        The title when there is no body, because that is the whole message in a refusal and
        it would otherwise be announced by nobody -- the dek above is an ordinary paragraph,
        read only by a visitor who navigates to it.
      */}
      <p className="sr-only" aria-live="polite">
        {done ? shown || envelope?.title || '' : ''}
      </p>

      {/*
        THE NEXT QUESTION, and the whole of it is one element that was already here.
        `nextQuestionFor` in `lib/ask/handler.ts` picks the memory on this stop the finished
        answer used LEAST, so this is the question the paragraph above did not answer.

        The title is a link now, and it is INSIDE the span rather than instead of it. That
        is not a detail. The span is a flex item, so an `<a>` put in its place is blockified
        and the global `a { }` rule's 1px rule stretches the full width of the column --
        which, stacked under the `border-top` the list item already carries, reads as a
        divider rather than as a link. Inline inside the span, the same rule hugs the words,
        the accent colour separates the question from the muted card text around it, and an
        inline box adds nothing to the line: MEASURED at 1280x720, the block version put the
        item at 20.5px against the span's 19.5 and took §09's slack from -0.8px to +0.2px,
        into a `.panel` that is `overflow: hidden` and destroys rather than scrolls.

        What the link buys over a click handler is everything a link already is: a focus
        ring, Enter, a status bar, middle-click, cmd-click, and `Copy link address` -- which
        is how the audience this site is aimed at actually forwards things. `WorkIndex`'s
        chapter tiles already made this move for the same reason.

        Modified clicks are left to the browser on purpose. A cmd- or middle-click here means
        "open that answer somewhere else", and `askHref` makes it a real address rather than
        a dead `#`.

        `aria-label` says the whole question -- "Tell me about X." -- while the visible text
        is X, so the accessible name contains the visible label and WCAG 2.5.3 Label in Name
        holds for voice control. The link's destination and the click's question are the same
        memory by construction: both are built from `card.id` and `card.title`.
      */}
      {envelope && envelope.cards.length > 0 && !compact && showsCards(envelope.stopId) && (
        <ul className="answer-cards">
          {envelope.cards.map((card) => (
            <li key={card.id} id={`card-${card.id}`}>
              <span className="answer-card-kicker">{card.kicker}</span>
              <span className="answer-card-title">
                <a
                  href={askHref(card.id)}
                  aria-label={cardQuestion(card.title)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    ask(cardQuestion(card.title), 'link');
                  }}
                >
                  {card.title}
                </a>
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
