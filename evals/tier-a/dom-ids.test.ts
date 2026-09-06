/**
 * Every memory reaches `/` under exactly one DOM id.
 *
 * `AskCard`'s header states the property the ask mechanism rests on: "every card's DOM id IS
 * its memory's id". Retrieval cites memory ids, `?ask=` names one, and the WebGL layer pulses
 * by id, so a card is addressable only while that id belongs to one element. It had stopped
 * belonging to one element. Two memories were rendered twice on the home page:
 *
 *   `project-mrunn-erp`  §04's chapter tile   and  §07's card
 *   `krunch-labs`        §02's timeline row   and  §03's card
 *
 * `getElementById` returns the first match in document order, so both resolved to the second
 * view rather than to the card, and duplicate ids are invalid HTML besides — an `href="#id"`
 * or an `aria-controls` can land a screen reader somewhere nobody chose.
 *
 * WHAT THIS TEST IS, HONESTLY. It MODELS the render rather than observing it, exactly as
 * `scripts/check-corpus.ts` does and for the same reason: `AuthoredBody` throws outside
 * `<ChatProvider>`, so the tree cannot be rendered here. What makes the model trustworthy is
 * that every id below is composed from the same exported functions the components call --
 * `cardsFrom`, `WORK_CHAPTERS`, `chapterTileId`, `timelineRowId`, `timelineEntries` -- so the
 * only way to defeat it is to stop calling one of them in a component, which is a deliberate
 * act rather than a drift.
 *
 * It exists because the collision grows on its own. The index draws a tile per project stop
 * and every project stop draws cards, so each project added to `WORK_CHAPTERS` is another
 * chance for this, and nothing else in the suite would notice.
 */
import { describe, expect, it } from 'vitest';
import { STOPS } from '../../content/stops';
import { memoriesForStop } from '../../lib/corpus/load';
import {
  cardsFrom,
  chapterTileId,
  timelineRowId,
  WORK_CHAPTERS,
} from '../../components/stops/draw-rule';
import { timelineEntries } from '../../components/stops/timeline-data';

/** Every DOM id the home page's stop tree emits for a memory, with who emitted it. */
function memoryIds(): { id: string; from: string }[] {
  const out: { id: string; from: string }[] = [];

  for (const stop of STOPS) {
    // `contact` draws every memory it has, unfiltered by section, which is why it is not
    // routed through `cardsFrom` in the component either.
    const drawn =
      stop.compose === 'contact' ? memoriesForStop(stop.id) : cardsFrom(stop.compose, memoriesForStop(stop.id));
    for (const m of drawn) out.push({ id: m.id, from: `card on §${stop.index} ${stop.id}` });
  }

  for (const chapter of WORK_CHAPTERS) {
    out.push({ id: chapterTileId(chapter.memoryId), from: `index tile for ${chapter.stopId}` });
  }

  for (const entry of timelineEntries()) {
    out.push({ id: timelineRowId(entry.id), from: 'timeline row' });
  }

  return out;
}

describe('a memory id addresses one element', () => {
  it('emits no id twice', () => {
    const seen = new Map<string, string[]>();
    for (const { id, from } of memoryIds()) seen.set(id, [...(seen.get(id) ?? []), from]);
    const clashes = [...seen]
      .filter(([, from]) => from.length > 1)
      .map(([id, from]) => `  ${id}: ${from.join(' AND ')}`);
    expect(clashes, `a DOM id is claimed twice on /:\n${clashes.join('\n')}`).toEqual([]);
  });

  it('gives the bare memory id to the card and never to a second view', () => {
    // The contract in AskCard, stated the other way round: if a prefix ever disappeared, the
    // test above would catch the pair that collides today, but not a new one that happens not
    // to be drawn as a card. This catches the rule itself.
    const bare = new Set(timelineEntries().map((e) => e.id));
    const prefixed = [...WORK_CHAPTERS.map((c) => chapterTileId(c.memoryId)), ...[...bare].map(timelineRowId)];
    const leaked = prefixed.filter((id) => bare.has(id) || WORK_CHAPTERS.some((c) => c.memoryId === id));
    expect(leaked, `a second view is using a bare memory id: ${leaked.join(', ')}`).toEqual([]);
  });

  it('still has the collisions it was written for, under their prefixes', () => {
    const ids = memoryIds().map((x) => x.id);
    expect(ids).toContain('project-mrunn-erp');
    expect(ids).toContain(chapterTileId('project-mrunn-erp'));
    expect(ids).toContain('krunch-labs');
    expect(ids).toContain(timelineRowId('krunch-labs'));
  });
});
