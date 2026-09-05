/**
 * The shape of one timeline row, and the one thing the client needs to do with it.
 *
 * This file exists to keep `node:fs` out of the browser bundle, which is not a
 * theoretical concern: `Timeline.tsx` is a client component, `timeline-data.ts` reads the
 * corpus off disk, and a single value import of `periodLabel` across that line was enough
 * to drag `loadMemories` — and therefore `node:fs` — into a browser chunk and fail the
 * build with "the chunking context does not support external modules". A type import
 * would have been erased and cost nothing; a function import is a real edge in the module
 * graph. So the pure half lives here, importing nothing, and both sides may have it.
 */
export type TimelineEntry = {
  id: string;
  /** The authored period string, e.g. "2013-2017" or "2025-present". */
  period: string;
  /** The year it starts, for sorting and for nothing else. */
  start: number;
  /** The year it ends. An open period resolves to the current year. */
  end: number;
  /** The stop this memory belongs to. Cuts the rail into eras — see `timelineGroups`. */
  stopId: string;
  /**
   * True where this entry runs *inside* another rather than after it.
   *
   * Two of the ten genuinely overlap: the engineering internships sit inside the years
   * the degrees were being read, and The Triad Co was entered through Nanomark and runs
   * inside its span. They are indented rather than drawn, because two indents in ten
   * rows is a detail, and anything more systematic would be a Gantt chart wearing a
   * list's clothes — while both bodies already explain the relationship in prose.
   */
  nested: boolean;
  title: string;
  /** The first sentence. Shown on the closed row only where there is width for it. */
  summary: string;
  /** The whole memory body, revealed when the row opens. */
  body: string;
};

/**
 * One era of the rail: a run of consecutive entries sharing a stop.
 *
 * Flat groups rather than nested lists. The rail is one continuous spine and every tick
 * has to hang off it at the same x; nesting the lists would offset half of them and the
 * line would stop reading as one line.
 */
export type TimelineGroup = {
  stopId: string;
  /** e.g. "Paid media". */
  label: string;
  /** e.g. "2013–2024" or "2025–". */
  span: string;
  entries: TimelineEntry[];
};

/**
 * How a period is written on screen: an ASCII hyphen is a range in the source, but an
 * en dash is a range in print.
 */
export function periodLabel(period: string): string {
  return period.replace('-', '–');
}
