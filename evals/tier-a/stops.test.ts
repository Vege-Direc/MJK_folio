/**
 * `content/stops.ts` is the single source of truth for stop identity and layout, and
 * three other things read it: the corpus checker (every memory carries a stopId), the
 * router (a question maps to a stopId), and the renderer (a stopId maps to a compose
 * kind). Nothing else validates it, so a typo here surfaces as a blank section or a
 * memory that can never be reached.
 */
import { describe, expect, it } from 'vitest';
import type { ComposeKind } from '../../content/stops';
import { ANSWERABLE_STOP_IDS, STOPS, STOP_IDS, stopById } from '../../content/stops';
import { timelineEntries, timelineGroups } from '../../components/stops/timeline-data';
import { loadMemories } from '../../lib/corpus/load';
import { parsePeriod } from '../../lib/corpus/schema';

/**
 * The compose kinds the renderer knows how to draw, from the authoritative design in
 * `reference/preview.html`. A stop composing anything else renders as nothing.
 *
 * Typed as `ComposeKind[]` deliberately: add a compose kind to STOPS and this list
 * still type-checks (it is a subset), so the runtime assertion below stays the thing
 * that catches it — but delete a kind the renderer still needs and tsc says so.
 */
const RENDERABLE_COMPOSE: readonly ComposeKind[] = [
  'hero',
  'plain',
  'cards',
  'carousel',
  'contact',
  'timeline',
  // Added after launch and the only kind not in `reference/preview.html`: §05's general
  // arrangement of the MJK-101. See `components/stops/MJK101Figure.tsx`.
  'figure',
  // §06's JewelAI evidence, over a shortened card list. It used to be §04's, and it used
  // to draw a three-state machine that chose between two projects' figures on the strength
  // of an answer's first citation. Each project has a stop now, so it draws its figure.
  'proof',
  // §05's supplier frame beside the catalogue frame the pipeline made from it. The same
  // shape as `proof` with a different figure, and a separate kind rather than a prop
  // because `compose` is what the stylesheet keys its phone layout on.
  'pair',
  // §04. The one stop with no figure at all: chapter tiles into the three project stops,
  // over the cards for the work that has no stop of its own.
  'index',
];

describe('STOPS', () => {
  /*
   * Twelve, and it stops there. Not a round number — four measured walls, all recorded in
   * `SPEC-architecture.md` §7.1: `far-network.json`'s fixed volume is comfortable to about
   * 14, the flight clamp to about the same, the screenshot-measurement debt is linear in
   * the stop count and is re-paid on every change to it, and the 517px phone band is
   * already failed by four sections. The extension point past twelve is a TILE on §04's
   * index, not a thirteenth chapter — which is the whole reason this number does not have
   * to be re-argued the next time MJK ships something.
   */
  it('has twelve stops', () => {
    expect(STOPS).toHaveLength(12);
    expect(STOP_IDS).toHaveLength(12);
  });

  it('has unique ids', () => {
    expect(new Set(STOP_IDS).size).toBe(STOP_IDS.length);
  });

  it('indexes 0-11, contiguous and in order', () => {
    expect(STOPS.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('opens on hero', () => {
    expect(STOPS[0].id).toBe('hero');
    expect(stopById('hero').index).toBe(0);
  });

  /*
   * `lib/mind/waypoints.ts` gives the LAST vantage a nine-unit pullback, and the
   * condition it uses is `i === n - 1` — positional, and it has never known the word
   * `contact`. That pullback is what took the final frame's whole-frame luminance from
   * 127.6 to 92.2 and stopped the one screen a visitor is asked to act on reading as a
   * different website. Append a stop after `contact` and it is lost with no throw, no
   * log and no other failing test: the only symptom is a brighter screenshot nobody
   * takes. So the coupling between a copy file and a camera path is asserted here rather
   * than remembered.
   */
  it('ends on contact, because the last vantage gets the pullback', () => {
    expect(STOPS.at(-1)?.id).toBe('contact');
  });

  /*
   * `§ 05 — Engineering` is an address, and an address that disagrees with where the
   * thing actually is is worse than no address. Nothing else checks it: `kicker` and
   * `index` are two hand-authored fields that duplicate the same fact, and a reorder
   * edits both. They drifted apart silently until this line existed.
   */
  it('numbers its kickers in page order', () => {
    // hero is the masthead and carries a name, not a number.
    for (const stop of STOPS.slice(1)) {
      expect(stop.kicker, `${stop.id} is index ${stop.index}`).toMatch(
        new RegExp(`^§ ${String(stop.index).padStart(2, '0')} — `),
      );
    }
  });

  it('never lets a generated answer target hero', () => {
    // hero is authored-only. A model that can route to it can overwrite the one piece
    // of copy nobody reviews on the way past.
    expect(ANSWERABLE_STOP_IDS).not.toContain('hero');
    expect(ANSWERABLE_STOP_IDS).toHaveLength(11);
    expect([...ANSWERABLE_STOP_IDS].sort()).toEqual([...STOP_IDS].filter((id) => id !== 'hero').sort());
  });

  it('composes only what the renderer can draw', () => {
    for (const stop of STOPS) {
      expect(RENDERABLE_COMPOSE, `${stop.id} composes "${stop.compose}"`).toContain(stop.compose);
    }
  });

  it('gives every stop a kicker', () => {
    for (const stop of STOPS) expect(stop.kicker.trim().length).toBeGreaterThan(0);
  });

  it('throws on an unknown id rather than returning undefined', () => {
    expect(() => stopById('nope' as never)).toThrow(/unknown stopId/);
  });
});

/**
 * The timeline is the one part of the page whose content is a *rule* rather than a list:
 * every `timeline` memory carrying a `period`, oldest first. That is what lets someone
 * add a job to content/memories.yaml and have it appear without touching a component —
 * and it is also what makes it worth testing, because a rule can go wrong silently in
 * ways a hard-coded list cannot. A period that stops parsing sorts to year 0 and the
 * entry quietly leads the career; a memory that loses its period vanishes off the page.
 */
describe('the §02 timeline', () => {
  const entries = timelineEntries();

  it('is what the apac stop composes', () => {
    expect(stopById('apac').compose).toBe('timeline');
  });

  it('draws every dated timeline memory, and only those', () => {
    const expected = loadMemories().filter((m) => m.section === 'timeline' && m.period);
    expect(entries).toHaveLength(expected.length);
    expect(entries.length).toBeGreaterThanOrEqual(8);
    expect(new Set(entries.map((e) => e.id))).toEqual(new Set(expected.map((m) => m.id)));
  });

  it('gives every entry a period that parses', () => {
    for (const e of entries) {
      expect(e.period.trim().length, `${e.id} has no period`).toBeGreaterThan(0);
      expect(parsePeriod(e.period), `${e.id} period "${e.period}" does not parse`).not.toBeNull();
      // Year 0 is the selector's floor for an unparseable period. Reaching it means the
      // entry is on the page but no longer placed in time.
      expect(e.start, `${e.id} fell back to the unplaceable year`).toBeGreaterThan(1900);
    }
  });

  it('runs oldest first', () => {
    const years = entries.map((e) => e.start);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it('crosses stop boundaries, because a career does not stop at one', () => {
    // The education and Krunch Labs entries live on `engineering` and `now`. A selector
    // narrowed to `apac` would silently clip both ends of the career.
    const stops = new Set(
      entries.map((e) => loadMemories().find((m) => m.id === e.id)?.stopId).filter(Boolean),
    );
    expect(stops.size).toBeGreaterThan(1);
  });

  it('says nothing the corpus does not', () => {
    for (const e of entries) {
      const memory = loadMemories().find((m) => m.id === e.id);
      expect(memory, `${e.id} is not a memory`).toBeDefined();
      expect(e.title).toBe(memory?.title);
      // Whitespace is normalised for rendering; the words must still be the memory's.
      expect(memory?.body.replace(/\s+/g, ' ').trim()).toBe(e.body);
      expect(e.body.startsWith(e.summary)).toBe(true);
    }
  });
});

/**
 * The rail is cut into eras and two rows are indented, and both are RULES rather than
 * lists -- eras come from the stop each run belongs to, nesting from the periods
 * themselves. A rule can go wrong silently in ways a hard-coded list cannot: the
 * difference between a handover and a containment is one comparison operator, and
 * getting it wrong indents a succession that merely touches at a year boundary.
 */
describe('the timeline rail', () => {
  const groups = timelineGroups();

  it('covers every entry exactly once, in order', () => {
    const flat = groups.flatMap((g) => g.entries.map((e) => e.id));
    expect(flat).toEqual(timelineEntries().map((e) => e.id));
  });

  it('cuts an era wherever the stop changes, and nowhere else', () => {
    for (const g of groups) {
      expect(new Set(g.entries.map((e) => e.stopId)).size, `${g.stopId} run is not one stop`).toBe(1);
    }
    // Consecutive groups must differ, or the run was cut for no reason.
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i].stopId).not.toBe(groups[i - 1].stopId);
    }
  });

  it('labels and dates every era from its own entries', () => {
    for (const g of groups) {
      expect(g.label.length, `${g.stopId} has no era label`).toBeGreaterThan(0);
      const from = Math.min(...g.entries.map((e) => e.start));
      expect(g.span.startsWith(String(from)), `${g.stopId} span ${g.span} does not open at ${from}`).toBe(true);
    }
  });

  it('indents only entries an earlier one contains, never a handover', () => {
    const entries = timelineEntries();
    for (const e of entries) {
      const container = entries.find((o) => o.id !== e.id && o.start < e.start && o.end >= e.end);
      expect(e.nested, `${e.id} nesting disagrees with its period`).toBe(Boolean(container));
    }
    // A succession that merely touches at a year boundary is not a nesting.
    const nested = entries.filter((e) => e.nested).map((e) => e.id);
    expect(nested.length).toBeLessThan(entries.length / 2);
  });
});
