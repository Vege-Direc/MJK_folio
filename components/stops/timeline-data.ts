import { loadMemories } from '@/lib/corpus/load';
import { parsePeriod, type Memory } from '@/lib/corpus/schema';
import type { TimelineEntry } from './timeline-entry';

/**
 * The career, in order, drawn entirely from the corpus.
 *
 * The selector is deliberately a rule rather than a list: every memory in the
 * `timeline` section that carries a `period`, sorted by the year it starts. Nothing here
 * names an employer or a year, so adding a job to `content/memories.yaml` puts it on the
 * page and nobody has to remember to edit a component. A `timeline` memory with no
 * `period` is not a dated entry — `career-overview` is prose about the shape of the
 * career, not a row in it — so the `period` is what qualifies an entry, not the section
 * alone.
 *
 * It reads across every stop rather than just `apac`, because a career does not stop at
 * a stop boundary: the two engineering entries belong to `engineering` and Krunch Labs
 * belongs to `now`, and a timeline that omitted them would start in 2013 and end in 2024.
 *
 * This lives beside the component rather than in `lib/corpus/load.ts` because it is a
 * view, not a corpus concern: it is the only caller, and `parsePeriod` is already
 * exported for exactly this kind of use.
 */

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

function tidy(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}

/** Sorted oldest first. Ties break on the id so the order is total and stable. */
export function timelineEntries(memories: Memory[] = loadMemories()): TimelineEntry[] {
  return memories
    .filter((m): m is Memory & { period: string } => m.section === 'timeline' && Boolean(m.period))
    .map((m) => {
      const parsed = parsePeriod(m.period);
      return {
        id: m.id,
        period: m.period,
        // A period that does not parse cannot be placed in time. The schema already
        // refuses to load one, so this is a floor, not a fallback with an opinion.
        start: parsed?.start ?? 0,
        title: m.title,
        summary: firstSentence(m.body),
        body: tidy(m.body),
      };
    })
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}
