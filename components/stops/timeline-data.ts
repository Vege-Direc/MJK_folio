import { loadMemories } from '@/lib/corpus/load';
import { parsePeriod, type Memory } from '@/lib/corpus/schema';
import type { TimelineEntry, TimelineGroup } from './timeline-entry';

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
 * What each era is called on the rail.
 *
 * Derived, not invented: each label is the subject of that stop's own authored title —
 * `engineering` is "Mechanical, then aerospace", `apac` is "A decade in paid media",
 * `now` is "Building the systems I used to run". Keyed by stop rather than by employer
 * so the rule survives the corpus growing; a stop with no label here simply gets no
 * caption, and the rail carries on.
 */
const ERA_LABEL: Record<string, string> = {
  engineering: 'Engineering',
  apac: 'Paid media',
  now: 'Building',
};

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
  const rows = memories
    .filter((m): m is Memory & { period: string } => m.section === 'timeline' && Boolean(m.period))
    .map((m) => {
      const parsed = parsePeriod(m.period);
      return {
        id: m.id,
        period: m.period,
        // A period that does not parse cannot be placed in time. The schema already
        // refuses to load one, so this is a floor, not a fallback with an opinion.
        start: parsed?.start ?? 0,
        end: parsed?.end ?? parsed?.start ?? 0,
        stopId: m.stopId as string,
        nested: false,
        title: m.title,
        summary: firstSentence(m.body),
        body: tidy(m.body),
      };
    })
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

  /*
   * An entry is nested when an earlier one CONTAINS it: started before it and had not
   * finished when it did. Containment rather than mere overlap, because a range that ends
   * the year another starts is a handover, not a nesting — Omnicom to Kinnect in 2017 is
   * the succession this rule must not indent. Computed from the periods rather than
   * listed by id, so it stays true as the corpus changes and can never name an employer.
   */
  return rows.map((row, i) => ({
    ...row,
    nested: rows.some((other, j) => j < i && other.start < row.start && other.end >= row.end),
  }));
}

/**
 * The rail, cut into eras.
 *
 * A run, not a bucket: entries are already in date order, so an era ends the moment the
 * stop changes. That happens to give three clean runs today (two engineering, seven
 * apac, one now) and it would give four if a future memory interleaved them — which is
 * the honest answer, because the career would have interleaved.
 */
export function timelineGroups(entries: TimelineEntry[] = timelineEntries()): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  for (const entry of entries) {
    const open = groups[groups.length - 1];
    if (open && open.stopId === entry.stopId) {
      open.entries.push(entry);
      continue;
    }
    groups.push({
      stopId: entry.stopId,
      label: ERA_LABEL[entry.stopId] ?? '',
      span: '',
      entries: [entry],
    });
  }
  // The span is the era's own extent, read off its entries once they are all in.
  for (const g of groups) {
    const from = Math.min(...g.entries.map((e) => e.start));
    const open = g.entries.some((e) => e.period.endsWith('present'));
    const to = Math.max(...g.entries.map((e) => e.end));
    g.span = open ? `${from}–` : from === to ? `${from}` : `${from}–${to}`;
  }
  return groups;
}
