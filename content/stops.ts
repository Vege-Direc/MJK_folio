/**
 * The nine stops. Single source of truth for stop identity and layout.
 *
 * Ids come from MJK_STOPS in public/preview.html (the authoritative design).
 * `compose` is a property of the STOP, never of a generated answer — the model
 * has no layout authority. The deterministic router maps a question to a
 * stopId; the renderer maps stopId -> compose.
 *
 * Every memory in content/memories.yaml must carry a stopId from this list.
 * scripts/check-corpus.ts enforces that.
 */

export const STOPS = [
  { id: 'hero',        index: 0, kicker: 'MJK · SINGAPORE · 2026', compose: 'hero',     align: 'left'  },
  { id: 'origin',      index: 1, kicker: '§ 01 — Origin',          compose: 'plain',    align: 'right' },
  { id: 'engineering', index: 2, kicker: '§ 02 — Engineering',     compose: 'plain',    align: 'left'  },
  { id: 'pivot',       index: 3, kicker: '§ 03 — Pivot',           compose: 'plain',    align: 'right' },
  { id: 'apac',        index: 4, kicker: '§ 04 — APAC · 2013→2024', compose: 'cards',   align: 'left'  },
  { id: 'rd350',       index: 5, kicker: '§ 05 — Aside',           compose: 'carousel', align: 'left'  },
  { id: 'now',         index: 6, kicker: '§ 06 — Now',             compose: 'cards',    align: 'right' },
  { id: 'work',        index: 7, kicker: '§ 07 — Selected work',   compose: 'cards',    align: 'left'  },
  { id: 'contact',     index: 8, kicker: '§ 08 — Brief me',        compose: 'contact',  align: 'left'  },
] as const;

export type Stop = (typeof STOPS)[number];
export type StopId = Stop['id'];
export type ComposeKind = Stop['compose'];

export const STOP_IDS = STOPS.map((s) => s.id) as readonly StopId[];

/** hero is authored-only — a generated answer may never target it. */
export const ANSWERABLE_STOP_IDS = STOP_IDS.filter((id) => id !== 'hero');

export function stopById(id: StopId): Stop {
  const s = STOPS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown stopId: ${id}`);
  return s;
}
