import type { ReactNode } from 'react';
import { SITE } from '@/content/site';
import { ledeOf, type Stop, type StopTitle } from '@/content/stops';
import { memoriesForStop } from '@/lib/corpus/load';
import ApparelPair from './ApparelPair';
import AuthoredBody from './AuthoredBody';
import MJK101Figure from './MJK101Figure';
import { cardKicker } from './card-kicker';
import Carousel from './Carousel';
import Timeline from './Timeline';
import WorkFigure from './WorkFigure';
import { timelineGroups } from './timeline-data';

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

/**
 * How much of a card's description fits in the two lines the layout gives it.
 *
 * Two lines at the NARROWEST column a card ever gets, which is 351px on a 390px phone.
 * Measured on the built page rather than derived: 14px at 1.55 line-height in that column
 * takes about 44 characters a line, so 88 is the honest budget and anything past it was
 * being thrown away by CSS.
 */
const CARD_CHARS = 88;

/**
 * The first sentence of a memory body, cut to fit the card.
 *
 * Bodies are YAML folded scalars, so they arrive as one long line with the newlines
 * already collapsed. Splitting on a full stop followed by a space is enough, and falling
 * back to the whole body means a one-sentence memory renders whole rather than empty.
 *
 * THE SECOND CUT, AND WHY IT IS HERE RATHER THAN IN CSS. `.mini-card .mb` also carries
 * `-webkit-line-clamp: 2`, so a first sentence longer than two lines was truncated twice —
 * and the second truncation knows nothing about words. A judge panel found three cards
 * reading "…renders traditional forms when they ar…" and "…an AI assistant in front of it
 * — 27 MCP…", each with `scrollHeight` 65 against `clientHeight` 43 and free space under
 * the card.
 *
 * Raising the clamp to three lines was measured and rejected: it clears every desktop cut
 * but costs §07 43px, which fits at 1440 and 1920 and overflows a 1280x720 band that has
 * 15px of slack — a defect traded for a defect. And it still leaves three of six cut on a
 * phone, where the column is narrowest. Cutting on a word boundary here costs 0px at every
 * viewport and is the only version that fixes the phone too.
 *
 * The ellipsis is deliberate and the clamp stays. A visible cut is a promise that there is
 * more, and the card's id is the memory's id, so the whole thing is one question away in
 * the chat. The clamp remains as the backstop for a column narrower than any measured here.
 */
function firstSentence(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  const end = text.search(/[.!?](\s|$)/);
  const sentence = end === -1 ? text : text.slice(0, end + 1);
  if (sentence.length <= CARD_CHARS) return sentence;
  // Back up to the last space inside the budget, so the cut lands between words. The
  // fallback is the hard slice, for the pathological case of a single 88-character word.
  const cut = sentence.lastIndexOf(' ', CARD_CHARS);
  const kept = sentence.slice(0, cut > 0 ? cut : CARD_CHARS);
  // A word boundary is not always a good place to stop: "...syncs Indian accounting
  // software into a" is grammatically mid-thought and reads as a bug rather than as a
  // trim. Dropping a dangling function word and any punctuation that led into it costs
  // nothing and leaves the cut on a noun.
  // The group repeats, because "software into a" needs both words dropped, not one.
  return `${kept.replace(/(?:[\s,;:—-]+(?:a|an|the|of|to|in|into|on|for|and|or|with|that|its|their))+$/i, '').replace(/[,;:—-]$/, '')}…`;
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

function Cards({ stop, limit = MAX_CARDS }: { stop: Stop; limit?: number }) {
  const memories = memoriesForStop(stop.id)
    .filter((m) => CARD_SECTIONS.has(m.section))
    .slice(0, limit);

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
 * Four real destinations. The prototype's resume link was `href="#"` (:2258) while
 * `public/resume.pdf` sat there the whole time.
 *
 * LinkedIn was already a verified fact in `content/site.ts` and already went out in the
 * page's JSON-LD, where a search engine could read it and a visitor could not. For a
 * decade of agency work it is the first thing a recruiter checks, and it was the one
 * outbound link the site knew about and did not draw.
 */
const CONTACT_LINKS = [
  { href: '/resume.pdf', label: 'Download resume', kk: '01 · PDF', external: false },
  { href: `mailto:${SITE.email}`, label: SITE.email, kk: '02 · EMAIL', external: false },
  { href: SITE.linkedin, label: 'linkedin.com/in/mathew-john-kondekeril', kk: '03 · LINKEDIN', external: true },
  { href: SITE.github, label: 'github.com/Vege-Direc', kk: '04 · CODE', external: true },
] as const;

/**
 * The links come before the cards, and that ordering is the point of this component.
 *
 * The stop's own paragraph ends "Or reach me directly:" and it sits in the left column,
 * pointing at this one. It was pointing at three cards about how to brief MJK, with the
 * mail link, the resume and the GitHub profile another 400px below them. On a phone that
 * put every contact affordance on the site off the bottom of the screen: §08 is 1,194px
 * tall against a 630px readable band, so a visitor who scrolled to the section that
 * exists to be acted on saw only descriptions of the action.
 *
 * A colon is a promise about what comes next. These four links are the only outbound
 * paths on the whole site, and they are what the sentence above them is promising.
 */
function Contact({ stop }: { stop: Stop }) {
  const memories = memoriesForStop(stop.id);
  return (
    <div className="contact-zone">
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
      {memories.map((m) => (
        <div className="mini-card" id={m.id} key={m.id}>
          <div className="mk">{cardKicker(m)}</div>
          <div className="mt">{m.title}</div>
          <div className="mb">{firstSentence(m.body)}</div>
        </div>
      ))}
    </div>
  );
}

function media(stop: Stop): ReactNode {
  switch (stop.compose satisfies Compose) {
    case 'cards':
      return <Cards stop={stop} />;
    case 'timeline':
      return <Timeline groups={timelineGroups()} />;
    case 'carousel':
      return <Carousel />;
    case 'figure':
      return <MJK101Figure />;
    /*
     * §07 is the section a sceptic reads, and until now it answered them with four cards
     * of prose. A review put it plainly: no link, screenshot, repo or demo for any of the
     * work. So the column leads with a photograph the pipeline actually made from a
     * photograph a supplier actually sent, and the card list drops to two — which also
     * retires both cards about the third-party assessment, whose volume numbers that same
     * review called volume rather than outcomes.
     */
    /*
     * The photograph is now the DEFAULT state of that column rather than its only one.
     * §07 carries eighteen memories, seven of them JewelAI's, and there is no room to add
     * a second figure: the column has 653px at 1440x900 and this already spends 647 of
     * them, under a `.panel` that is `overflow: hidden`. So `WorkFigure` swaps the box's
     * contents on the first memory a streamed answer cited, and `ApparelPair` is handed
     * through as a prop so it stays a Server Component and this file stays out of it.
     */
    case 'proof':
      return (
        <>
          <WorkFigure pair={<ApparelPair />} />
          <Cards stop={stop} limit={2} />
        </>
      );
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
