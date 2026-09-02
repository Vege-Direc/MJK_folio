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
  title: string;
  /** The first sentence, shown on the closed row. */
  summary: string;
  /** The whole memory body, revealed when the row opens. */
  body: string;
};

/**
 * How a period is written on screen: an ASCII hyphen is a range in the source, but an
 * en dash is a range in print.
 */
export function periodLabel(period: string): string {
  return period.replace('-', '–');
}
