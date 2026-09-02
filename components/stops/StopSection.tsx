import type { ReactNode } from 'react';
import { ledeOf, type Stop, type StopTitle } from '@/content/stops';
import { memoriesForStop } from '@/lib/corpus/load';
import type { Memory } from '@/lib/corpus/schema';
import AuthoredBody from './AuthoredBody';
import Carousel from './Carousel';

/**
 * One stop, server-rendered. Nine of these are the page.
 *
 * Ported from `renderStopHTML` (reference/preview.html:2264-2291), which was five string
 * concatenations with no escaping — `renderCarousel` interpolated a caption straight into
 * an `alt` attribute. React removes that whole class of bug for free, and the titles that
 * arrived as `titleHTML` with a `<br>` and a `<span class="muted">` are structured data
 * here, so there is no `dangerouslySetInnerHTML` anywhere in this tree.
 *
 * Server Component on purpose. The prose is the page; only the canvas, the scroll
 * listener and the carousel need to be client code, and none of them is here.
 */

/** The prototype's five, and no more. A generated answer cannot introduce a sixth. */
type Compose = Stop['compose'];

/**
 * Cards per stop.
 *
 * A stop is one viewport tall and the grid is two columns, so four is what fits — the
 * number the prototype hard-coded per stop before the corpus existed. `apac` and `now`
 * each carry eleven memories now, and showing all of them would push a 100svh panel into
 * `overflow: hidden` and silently cut the last row in half. First four in corpus order:
 * the order in `content/memories.yaml` is authored, so this is a choice an author can
 * change by moving a memory up, without touching a component.
 */
const MAX_CARDS = 4;

/** Cards are drawn from the corpus, so a card can never claim what a memory does not. */
const CARD_SECTIONS = new Set(['projects', 'capabilities', 'timeline']);

/** The card kicker: the memory's period if it has one, else its first tag. */
function cardKicker(m: Memory): string {
  return m.period ?? m.tags[0] ?? '';
}

/**
 * The first sentence of a memory body.
 *
 * Bodies are YAML folded scalars, so they arrive as one long line with the newlines
 * already collapsed. Splitting on a full stop followed by a space is enough, and falling
 * back to the whole body means a one-sentence memory renders whole rather than empty.
 */
function firstSentence(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  const end = text.search(/[.!?](\s|$)/);
  return end === -1 ? text : text.slice(0, end + 1);
}

/**
 * The hero's title is the page's `<h1>` and every other stop's is an `<h2>`.
 *
 * Until this change there was no `<h1>` in the document at all — nine `<h2>`s and
 * nothing above them — which is a heading outline with no root. The hero is the only
 * honest candidate: it is the one title that names the page rather than a section of
 * it. Styling is unchanged, because `.section-title` was never tied to the tag.
 */
function Title({ title, level }: { title: StopTitle; level: 1 | 2 }) {
  const Tag = level === 1 ? 'h1' : 'h2';
  return (
    <Tag className="section-title">
      {title.strong}
      {title.muted ? (
        <>
          <br />
          <span className="muted">{title.muted}</span>
        </>
      ) : null}
    </Tag>
  );
}

function Content({ stop, wide }: { stop: Stop; wide?: boolean }) {
  const lede = ledeOf(stop);
  return (
    <div className={wide ? 'content-zone' : `content-zone ${stop.align === 'right' ? 'right' : 'left'}`}>
      <p className="section-kicker">{stop.kicker}</p>
      <Title title={stop.title} level={stop.id === 'hero' ? 1 : 2} />
      <div className="section-body-wrap">
        {/*
          The authored paragraph is passed as a server-rendered child, so it is in the
          HTML whether or not the client ever wakes up. AuthoredBody only owns whether
          it is *collapsed* — an answer landing on this stop animates its height to
          zero so the answer reads as the foreground, and SHOW ORIGINAL brings it back.
        */}
        <AuthoredBody stopId={stop.id}>
          {lede ? <p className="section-lede">{lede}</p> : null}
          <p className="section-body">{stop.body}</p>
        </AuthoredBody>
        {/*
          Where a streamed answer docks, inside the stop it belongs to and in the stop's
          own type. Empty until the chat step fills it — an id, not a component, so the
          seam exists before anything is wired to it.
        */}
        <div id={`answer-${stop.id}`} />
      </div>
    </div>
  );
}

function Cards({ stop }: { stop: Stop }) {
  const memories = memoriesForStop(stop.id)
    .filter((m) => CARD_SECTIONS.has(m.section))
    .slice(0, MAX_CARDS);

  if (!memories.length) return null;

  return (
    <div className="card-row">
      {memories.map((m) => (
        // The card's id IS the memory's id: retrieval cites memory ids, so a pulse or a
        // scroll target can address the exact card an answer came from.
        <div className="mini-card" id={m.id} key={m.id}>
          <div className="mk">{cardKicker(m)}</div>
          <div className="mt">{m.title}</div>
          <div className="mb">{firstSentence(m.body)}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Three real destinations. The prototype's resume link was `href="#"` (:2258) while
 * `public/resume.pdf` sat there the whole time.
 */
const CONTACT_LINKS = [
  { href: '/resume.pdf', label: 'Download resume', kk: '01 · PDF', external: false },
  { href: 'mailto:mathew_johnk@hotmail.com', label: 'mathew_johnk@hotmail.com', kk: '02 · EMAIL', external: false },
  { href: 'https://github.com/Vege-Direc', label: 'github.com/Vege-Direc', kk: '03 · CODE', external: true },
] as const;

function Contact({ stop }: { stop: Stop }) {
  const memories = memoriesForStop(stop.id);
  return (
    <div className="contact-zone">
      {memories.map((m) => (
        <div className="mini-card" id={m.id} key={m.id}>
          <div className="mk">{cardKicker(m)}</div>
          <div className="mt">{m.title}</div>
          <div className="mb">{firstSentence(m.body)}</div>
        </div>
      ))}
      <div className="contact-links">
        {CONTACT_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            {...(l.href.endsWith('.pdf') ? { download: true } : {})}
          >
            <span className="kl">{l.label}</span>
            <span className="kk">{l.kk}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function media(stop: Stop): ReactNode {
  switch (stop.compose satisfies Compose) {
    case 'cards':
      return <Cards stop={stop} />;
    case 'carousel':
      return <Carousel />;
    case 'contact':
      return <Contact stop={stop} />;
    default:
      return null;
  }
}

export default function StopSection({ stop }: { stop: Stop }) {
  const centred = stop.compose === 'hero' || stop.compose === 'plain';
  const contentSide = stop.align === 'right' ? 'right' : 'left';
  const mediaSide = contentSide === 'left' ? 'right' : 'left';

  return (
    <section
      id={stop.id}
      data-stop={stop.index}
      // Rendered by the server so the first paint already has stop 0 lit and the other
      // eight sitting back. ScrollProgress takes it over on the first scroll.
      data-active={stop.index === 0 ? 'true' : 'false'}
      // The reading glass hangs off this element, so the two facts it needs to place
      // itself live here: which side the text is on, and whether there is a media
      // column at all. It cannot hang off `.section-inner` — that takes `opacity` when
      // the stop is inactive, and an ancestor below 1 makes a backdrop root, which
      // would leave `backdrop-filter` with nothing to sample.
      data-align={contentSide}
      data-centred={centred ? '' : undefined}
      className="panel"
    >
      {/*
        `data-align` carries the authored left/right alternation onto the element that
        can actually act on it. Without it the one-column stops shrink-wrapped and
        centred, so `align` was inert and the first five stops had five different,
        unchosen left margins. The scrim reads it too, to know which half to sit under.
      */}
      {centred ? (
        <div className="section-inner center-stage" data-align={contentSide}>
          <Content stop={stop} wide />
        </div>
      ) : (
        <div className="section-inner" data-align={contentSide}>
          <Content stop={stop} />
          <div className={`media-zone ${mediaSide}`}>{media(stop)}</div>
        </div>
      )}
    </section>
  );
}
