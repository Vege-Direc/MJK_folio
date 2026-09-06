import { stopById, type Stop } from '@/content/stops';
import { memoriesForStop, memoryById } from '@/lib/corpus/load';
import AskCard from './AskCard';
import { cardKicker } from './card-kicker';
import { cardsFrom, chapterTileId, firstSentence, WORK_CHAPTERS } from './draw-rule';

/**
 * §04's media column: the index of the things he has built.
 *
 * WHAT IT REPLACES, AND WHY THAT HAD TO GO. `WorkFigure` was a box with three states —
 * the apparel pair, the JewelAI evidence, the JewelAI gate chart — chosen by whichever
 * memory a streamed answer happened to cite first. It was not a design, it was an
 * arbitration: the column had 653px at 1440x900, one figure plus two cards already spent
 * 647 of them, and `.panel { overflow: hidden }` destroys the excess rather than scrolling
 * it. So a second project could only ever be made visible by taking the floor away from
 * the first. MJK's verdict on that, and it is the whole brief for this file: "It shouldn't
 * be one for the other because then we're missing out showing off our work to clients."
 *
 * The fix is not a bigger column. Each project got a stop, and this one stopped being a
 * project's column and became the way in to all of them.
 *
 * THE COUNT ON EACH CHAPTER TILE IS COMPUTED, NEVER TYPED. It is the number of things
 * written down about that project beyond the sentence on the tile, straight from
 * `memoriesForStop`. That is the "detached honeypot" argument made concrete: a visible,
 * checkable trace that there is substance behind the link, rather than a decorative arrow
 * that promises nothing. It also cannot rot — write another memory and the tile counts it.
 *
 * PLAIN ANCHORS, NOT `<Link>` AND NOT A BUTTON. The targets are three sections of this
 * same document, so `href="#jewelai"` is the whole mechanism: it works with JavaScript
 * off, a crawler follows it, and a visitor can copy it. `FocusIntoView` already handles
 * where focus lands after a hash jump. Nothing here is a client component.
 */

function ChapterTiles() {
  return (
    /*
     * `nav`, because these three are navigation and the four below them are not. A screen
     * reader user gets one landmark holding exactly the three in-page destinations this
     * stop offers, and the cards stay what they are: questions.
     */
    <nav className="wi-chapters" aria-label="Sections about one project each">
      {WORK_CHAPTERS.map((chapter) => {
        const stop = stopById(chapter.stopId);
        const memory = memoryById(chapter.memoryId);
        if (!memory) return null;
        // Everything else written down about this project, beyond the sentence on the
        // tile. Computed, so it is right by construction and stays right.
        const more = memoriesForStop(chapter.stopId).length - 1;
        return (
          // NOT the bare memory id. This tile is a second view of a memory that lives on
          // another stop, where its own card holds `id={memory.id}` -- and `project-mrunn-erp`
          // was rendered twice as a DOM id because of this line, so `getElementById` for it
          // returned this anchor rather than §07's card. `chapterTileId` is the rule.
          <a key={chapter.stopId} className="mini-card wi-chapter" id={chapterTileId(memory.id)} href={`#${stop.id}`}>
            <span className="mk">
              {`§ ${String(stop.index).padStart(2, '0')} · ${more} more`}
            </span>
            <span className="mt">{memory.title}</span>
            <span className="mb">{firstSentence(memory.body)}</span>
          </a>
        );
      })}
    </nav>
  );
}

export default function WorkIndex({ stop }: { stop: Stop }) {
  const cards = cardsFrom(stop.compose, memoriesForStop(stop.id));

  return (
    <div className="work-index">
      <ChapterTiles />
      {/*
        Two columns, and this is the one card grid on the site that has them. Every other
        stop's cards sit under or beside a figure in a single column; this stop has no
        figure, so the column is the grid and seven tiles in one column would be ~800px
        into a ~653px band.
      */}
      <div className="wi-cards">
        {cards.map((m) => (
          // The card's id IS the memory's id, exactly as on every other stop: retrieval
          // cites memory ids, so a pulse or a scroll target can address the card an
          // answer came from, and so can the question the card asks about itself.
          <AskCard key={m.id} id={m.id} title={m.title} stopId={stop.id}>
            <span className="mk">{cardKicker(m)}</span>
            <span className="mt">{m.title}</span>
            <span className="mb">{firstSentence(m.body)}</span>
          </AskCard>
        ))}
      </div>
    </div>
  );
}
