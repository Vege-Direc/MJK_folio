/**
 * The nine stops. Single source of truth for stop identity, layout and authored copy.
 *
 * Ids come from MJK_STOPS in the prototype (`reference/preview.html:2151`), the
 * authoritative design. `compose` is a property of the STOP, never of a generated
 * answer — the model has no layout authority. The deterministic router maps a question
 * to a stopId; the renderer maps stopId -> compose.
 *
 * Every memory in content/memories.yaml must carry a stopId from this list.
 * scripts/check-corpus.ts enforces that.
 *
 * ── ON THE COPY ────────────────────────────────────────────────────────────────
 * `title` and `body` are AUTHORED. They may carry voice; they may not carry a number,
 * a client name, an employer or a claim that content/memories.yaml does not license.
 * `evals/tier-a/claims.test.ts` scans this file and fails the build when they do.
 *
 * The prototype's copy was ported with the following removed, because the corpus does
 * not support them (the four in `claims.test.ts` plus five more found in the same pass):
 *
 *   "Isobar"                          — appears nowhere in the corpus; he did not work there
 *   "CANON · 5x awareness · 12 markets" — no awareness multiple, no market count, for anyone
 *   "LAUGHING COW · 2x spend"         — the 10x is Rustomjee's, at a different agency
 *   "A week of analyst work — replaced" — the licensed figure is "by half", and the week
 *                                          was never measured
 *   "Two short-service commissions. Aged out of the third window."  — not in the corpus
 *   "Two years, three attempts at the tank"                          — not in the corpus
 *   "A 1980s Yamaha RD350"            — the corpus says 1986
 *   "RD350 · 2016-2018"               — the corpus gives no restoration dates
 *   "This site — Next.js, R3F, streaming"  — R3F was deleted in this same change
 *
 * Three more came from the placeholder components this change replaced and are not
 * ported either: "2026 — v0.1", "then emails me a brief", "docks alongside this text".
 * The first is a version number nobody set, the other two promise behaviour that does
 * not exist.
 *
 * `title` is structured, not markup: the prototype carried `titleHTML` with a `<br>` and
 * a `<span class="muted">` and the renderer set it with innerHTML. Authored copy is
 * still copy — `{ strong, muted }` renders through React and cannot inject anything.
 */

export const STOPS = [
  {
    id: 'hero',
    index: 0,
    /*
     * The masthead names him. It used to read `MJK · SINGAPORE · 2026`, which told a
     * first-time visitor an initialism, a city and the current year — and then handed
     * them a tagline with no idea whose tagline it was, or what the remaining eight
     * stops were about. An initialism is not an introduction.
     */
    kicker: 'MATHEW JOHN KONDEKERIL · SINGAPORE',
    compose: 'hero',
    align: 'left',
    title: { strong: 'First I imagine it.', muted: 'Then I learn whatever it takes to build it.' },
    /*
     * `lede` is the introduction the hero was missing, and it is a separate field
     * rather than a longer `body` so the three jobs can be typeset apart: the tagline
     * earns the display size, the lede states the role at full strength, and the body
     * carries the detail and the way in. Every clause below is licensed by `who-i-am`
     * (name, the two engineering degrees, the decade of paid media across India and
     * Southeast Asia, Krunch Labs in Singapore since January 2025).
     */
    lede: 'Engineer by training, marketer by trade, builder by habit.',
    body: 'I trained in aerospace, spent a decade running paid media across India and Southeast Asia, and now build AI systems at Krunch Labs in Singapore. Scroll to travel the mind. Or type a question at the bottom.',
  },
  {
    id: 'origin',
    index: 1,
    kicker: '§ 01 — Origin',
    compose: 'plain',
    align: 'right',
    title: { strong: 'It started with', muted: 'wanting to fly.' },
    body: 'Not any aircraft — the fast ones. That is not the story people ask about first. It is the one that explains the rest.',
  },
  {
    id: 'engineering',
    index: 2,
    kicker: '§ 02 — Engineering',
    compose: 'plain',
    align: 'left',
    title: { strong: 'Mechanical, then', muted: 'aerospace.' },
    body: 'Mechanical engineering to get in the door. An aerospace design masters in the UK, because you cannot design what you do not understand. By the time it was finished, the market that needed those drawings was not hiring.',
  },
  {
    id: 'pivot',
    index: 3,
    kicker: '§ 03 — Pivot',
    compose: 'plain',
    align: 'right',
    title: { strong: 'So I rebuilt', muted: 'the toolkit.' },
    body: 'Marketing was the closest system to engineering that would take an aerospace graduate with no media experience. I brought engineering — code, automation, systems thinking — to a place that ran on spreadsheets.',
  },
  {
    id: 'apac',
    index: 4,
    kicker: '§ 04 — APAC',
    compose: 'timeline',
    align: 'left',
    title: { strong: 'A decade in paid media', muted: 'across the region.' },
    body: 'Omnicom, Kinnect, Hotstar, Taboola, Nanomark, Triad. The habit started at Kinnect: automate the report nobody wants to build twice.',
  },
  {
    id: 'rd350',
    index: 5,
    kicker: '§ 05 — Aside',
    compose: 'carousel',
    align: 'left',
    title: { strong: 'In parallel,', muted: 'a motorcycle.' },
    body: 'A 1986 Yamaha RD 350, stripped to the frame and rebuilt as a cafe racer of my own design. Self-taught fabrication, learned in the doing. Same loop as everything else — imagine, learn, build, keep going.',
  },
  {
    id: 'now',
    index: 6,
    kicker: '§ 06 — Now',
    compose: 'cards',
    align: 'right',
    title: { strong: 'Building the systems', muted: 'I used to run.' },
    body: 'Krunch Labs. MruNN — a chat-native ERP on Mastra. JewelAI — a LangGraph creative pipeline for jewellery. This site — Next.js, three.js, streaming.',
  },
  {
    id: 'work',
    index: 7,
    kicker: '§ 07 — Selected work',
    compose: 'cards',
    align: 'left',
    title: { strong: 'Things I have built.' },
    body: 'Agent pipelines, an ERP you talk to, an open-source bridge into Indian accounting, and the growth engines around them. Ask about any of them.',
  },
  {
    id: 'contact',
    index: 8,
    kicker: '§ 08 — Brief me',
    compose: 'contact',
    align: 'left',
    title: { strong: 'Not a form.', muted: 'Just tell me what you’re working on.' },
    body: 'Tell it the problem, the timeline, what’s been tried. Or reach me directly:',
  },
] as const;

export type Stop = (typeof STOPS)[number];
export type StopId = Stop['id'];
export type ComposeKind = Stop['compose'];
/**
 * The two halves of a stop title, rendered, never injected. Declared rather than
 * derived: `STOPS` is `as const`, so `Stop['title']` is a union of nine literal shapes
 * and the one stop with no second half (`work`) makes `.muted` unreadable on the union.
 */
export type StopTitle = { readonly strong: string; readonly muted?: string };

/**
 * The hero's introduction line, and only the hero has one.
 *
 * `STOPS` is `as const`, so `lede` is present on exactly one member of the union and
 * unreadable on the union itself. The `in` narrowing is the honest way to ask — it
 * keeps the field genuinely optional rather than widening every stop to carry a
 * property eight of them do not have.
 */
export function ledeOf(stop: Stop): string | undefined {
  return 'lede' in stop ? stop.lede : undefined;
}

export const STOP_IDS = STOPS.map((s) => s.id) as readonly StopId[];

/** hero is authored-only — a generated answer may never target it. */
export const ANSWERABLE_STOP_IDS = STOP_IDS.filter((id) => id !== 'hero');

export function stopById(id: StopId): Stop {
  const s = STOPS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown stopId: ${id}`);
  return s;
}
