import type { ReactNode } from 'react';
import { SITE } from '@/content/site';
import { ledeOf, mediaFirstOf, type Stop, type StopTitle } from '@/content/stops';
import { memoriesForStop } from '@/lib/corpus/load';
import ApparelPair from './ApparelPair';
import AskCard from './AskCard';
import AuthoredBody from './AuthoredBody';
import JewelEvidence from './JewelEvidence';
import MJK101Figure from './MJK101Figure';
import WorkIndex from './WorkIndex';
import { cardKicker } from './card-kicker';
import { cardsFrom, firstSentence } from './draw-rule';
import Carousel from './Carousel';
import Timeline from './Timeline';
import { timelineGroups } from './timeline-data';

/**
 * One stop, server-rendered. Twelve of these are the page.
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

/**
 * The kinds a stop may compose, and a generated answer cannot introduce another: `compose`
 * is a property of the STOP, read from `content/stops.ts`, and the model has no say in it.
 *
 * The card counts and the first-sentence cut used to live here as constants and a
 * function. They are in `./draw-rule` now, because `scripts/check-corpus.ts` has to know
 * exactly what this file draws in order to count which memories reach the HTML at all —
 * and it was knowing that by keeping a copy of these numbers plus four regexes over this
 * file's source to check the copy had not gone stale. One module, imported by both, and
 * there is nothing left to drift.
 */
type Compose = Stop['compose'];

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

/**
 * How many cards a stop draws is now a property of its compose kind rather than a literal
 * passed at one call site. It used to be `<Cards stop={stop} limit={2} />` on the one stop
 * that had a figure; there are three such stops now, and a second literal is how the two
 * would have started disagreeing.
 */
function Cards({ stop }: { stop: Stop }) {
  const memories = cardsFrom(stop.compose, memoriesForStop(stop.id));

  if (!memories.length) return null;

  return (
    <div className="card-row">
      {memories.map((m) => (
        // The card's id IS the memory's id: retrieval cites memory ids, so a pulse or a
        // scroll target can address the exact card an answer came from — and, since the
        // card became a control, so can the question it asks about itself.
        <AskCard key={m.id} id={m.id} title={m.title} stopId={stop.id}>
          <span className="mk">{cardKicker(m)}</span>
          <span className="mt">{m.title}</span>
          <span className="mb">{firstSentence(m.body)}</span>
        </AskCard>
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
        <AskCard key={m.id} id={m.id} title={m.title} stopId={stop.id}>
          <span className="mk">{cardKicker(m)}</span>
          <span className="mt">{m.title}</span>
          <span className="mb">{firstSentence(m.body)}</span>
        </AskCard>
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
     * §04, the index. No figure at all, and that is the change: this column used to be one
     * box arbitrating between four projects on the strength of whichever memory an answer
     * happened to cite first, so JewelAI could only be shown by hiding the apparel work
     * and the apparel work could only be shown by hiding JewelAI. Each project has a stop
     * now; this is the way in to them plus the cards for the work that stays here.
     */
    case 'index':
      return <WorkIndex stop={stop} />;
    /*
     * One figure over a short card list, twice. `proof` is §06's JewelAI evidence — the
     * photographs a client sends and what comes back — and `pair` is §05's supplier frame
     * beside the catalogue frame the pipeline made from it. Both point straight at their
     * figure: `WorkFigure`, the three-state machine that used to stand here and choose
     * between them, is deleted along with `FIGURE_BY_CITE`, `AMBIGUOUS_CITE` and the
     * `cites[0]` heuristic. After the split there is no contest to arbitrate.
     */
    case 'proof':
      return (
        <>
          <JewelEvidence />
          <Cards stop={stop} />
        </>
      );
    case 'pair':
      return (
        <>
          <ApparelPair />
          <Cards stop={stop} />
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
      // Which side this stop puts its words on, and whether it has a media column at
      // all. The CSS reads both. (This used to carry a second justification about
      // keeping a `backdrop-filter` reading glass off an ancestor with opacity < 1;
      // both the glass and that opacity are gone, so only the layout reason is left.)
      data-align={contentSide}
      data-centred={centred ? '' : undefined}
      /*
       * What this stop's media column IS, so the stylesheet can compose for it.
       *
       * Everything else the CSS needs it already had — which side the words take, and
       * whether there is a media column at all — but not what is in it, and on a phone
       * that matters: a stacked column has to be ORDERED, and the right order depends on
       * whether the media is one figure or a ten-row rail. `data-compose` is the same
       * authored field the renderer already switches on, published where a stylesheet
       * can read it, rather than a rule keyed on `#apac` — the id is a routing key and
       * the corpus's `stopId`, and no stylesheet has ever had an opinion about it.
       */
      data-compose={stop.compose}
      /*
       * Media above prose, on a phone only, on the stops that opt in.
       *
       * Below 900px the stylesheet orders `.content-zone` first and `.media-zone` second
       * on every stop, which is why the aircraft, the career rail and the motorcycle
       * photographs are all under the fold at 390x664. This attribute is the opt-out, and
       * it is an attribute rather than a global flip because the naive flip has been
       * screenshotted on an existing stop and it is wrong: it takes the § address and the
       * title off the screen along with the paragraph. What the rule keyed on this does
       * instead is order the four parts individually — kicker, title, media, body — which
       * is the shape §02 already proved.
       */
      data-media-first={mediaFirstOf(stop) ? '' : undefined}
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
