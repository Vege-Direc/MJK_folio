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
    title: { strong: 'I build AI systems', muted: 'for people who have a business problem, not an AI problem.' },
    /*
     * `lede` is the introduction the hero was missing, and it is a separate field
     * rather than a longer `body` so the three jobs can be typeset apart: the tagline
     * earns the display size, the lede states the role at full strength, and the body
     * carries the detail and the way in. Every clause below is licensed by `who-i-am`
     * (name, the two engineering degrees, the decade of paid media across India and
     * Southeast Asia, Krunch Labs in Singapore since January 2025).
     */
    lede: 'Krunch Labs, Singapore. Multi-agent pipelines, custom ERPs, and the analytics to say whether any of it worked.',
    body: 'Before that: aerospace engineering at Brunel, then a decade running paid media across India and Southeast Asia for Hindustan Unilever, Visa, Skechers and Evian. Scroll to travel the mind, or ask it something at the bottom of the page.',
  },
  {
    id: 'origin',
    index: 1,
    kicker: '§ 01 — Origin',
    compose: 'plain',
    align: 'right',
    title: { strong: 'I wanted to fly', muted: 'fighter jets.' },
    body: 'I flew alone for the first time before I was ten, Trivandrum to Cochin, and cried most of the way. The crew kept me busy with a bag of chocolates, and then I was in the cockpit, looking at the instruments and the clouds through the windscreen. I have wanted to fly ever since, and I have not made it happen yet.',
  },
  {
    id: 'engineering',
    index: 2,
    kicker: '§ 02 — Engineering',
    /*
     * The one stop with a compose kind of its own, and it took three attempts to earn it.
     *
     * First a unit chart of the Airbus project's two cabin fits, which worked but drew a
     * sentence the paragraph already contained. Then a screenshot of the Visual Basic
     * engine simulator he wrote in 2010, which was real evidence but a white Windows
     * dialog on a black page — MJK's own verdict was that it "doesn't look good here or
     * fit the overall aesthetic of the website", and he was right.
     *
     * What unlocked the third attempt was material, not design. He sent the Airbus
     * presentation, and it carries his own CAD plan view of the aircraft together with a
     * full specification table. A general arrangement was previously forbidden here
     * because the corpus held no geometry and any drawing would have been an artist's
     * impression with his name on it. It now holds both, as `mjk-101`, so the outline can
     * be traced from his render and the dimensions taken from his table.
     */
    compose: 'figure',
    align: 'left',
    /*
     * General on purpose, and it took a live failure to see why. The title read "I drew an
     * airliner called the MJK-101", which is true, specific and provokes a question —
     * every property the copy rewrite was aiming for. Then MJK asked about his BITS
     * education, landed here, and read a headline about an aeroplane over an answer about
     * a mechanical degree in Dubai.
     *
     * This stop spans two degrees at two institutions on two continents. A title naming
     * only the second one is wrong for every question about the first, and roughly half of
     * them are. So the heading names the span and the FIGURE carries the specificity — it
     * now rests on the engine or the aircraft depending on what the answer was licensed
     * by, which is a better place for that job than a fixed line of type.
     */
    title: { strong: 'I read mechanical at BITS,', muted: 'then aerospace at Brunel.' },
    body: 'BITS Pilani had no aeronautical course, so I read mechanical and came to aerospace afterwards, at Brunel. It was the Airbus design project there: 100 passengers on short European routes, or 28 in business class across continents, sized for London City’s short runway. The UK aerospace market had stopped hiring by the time I finished it.',
  },
  {
    id: 'pivot',
    index: 3,
    kicker: '§ 03 — Pivot',
    compose: 'plain',
    align: 'right',
    title: { strong: 'I started over', muted: 'as a media trainee.' },
    body: 'After the masters I could not find design work in India — the market wanted computation and CFD, and I had specialised in design. My doctorate proposal at IIT Bombay was turned down. A family referral got me the interview at Omnicom; I started in May 2013 and was confirmed as a senior planner six months later.',
  },
  {
    id: 'apac',
    index: 4,
    kicker: '§ 04 — APAC',
    compose: 'timeline',
    align: 'left',
    title: { strong: 'A decade in paid media', muted: 'across India and Southeast Asia.' },
    body: 'At Hotstar I ran client relations for ICICI Lombard, Redbull and Apple through the 2019 IPL and Cricket World Cup, at a then-record 25 million concurrent viewers. Before that, at Kinnect, I automated the reporting with Supermetrics and Looker Studio and cut report generation time by half.',
  },
  {
    id: 'rd350',
    index: 5,
    kicker: '§ 05 — The RD 350',
    compose: 'carousel',
    align: 'left',
    title: { strong: 'I rebuilt a 1986 Yamaha RD 350', muted: 'as a cafe racer of my own design.' },
    body: 'The bike was my uncle’s. I rode it to work in Mumbai until it broke down, then took the gap between two Omnicom jobs — June to December 2014 — and rebuilt it at home in Kerala, bare frame to finished bike. I taught myself as I went: the seat, the tank, the handlebar and the headlight bracket were all made in-house, by trial and error. It is the proof that I can imagine something and get there with my own hands.',
  },
  {
    id: 'now',
    index: 6,
    kicker: '§ 06 — Now',
    compose: 'cards',
    align: 'right',
    title: { strong: 'Building the systems', muted: 'I used to run.' },
    body: 'Krunch Labs has run out of Singapore since January 2025: multi-agent pipelines, custom ERPs, automation, and the analytics to say whether any of it worked. Most engagements start as one automation and turn into the system around it. I still take paid media work, because I ran that side for a decade.',
  },
  {
    id: 'work',
    index: 7,
    kicker: '§ 07 — Selected work',
    compose: 'proof',
    align: 'left',
    title: { strong: 'Things I have built.' },
    body: 'JewelAI Studio never tells the model in words what a piece looks like. It asks for three to five photographs of one piece, shot from different angles, and sends the whole set with every image it generates — because describing a ring in text is how you get a different ring back.',
  },
  {
    id: 'contact',
    index: 8,
    kicker: '§ 08 — Brief me',
    compose: 'contact',
    align: 'left',
    title: { strong: 'Tell me the problem,', muted: 'when you need it, and what has been tried.' },
    body: 'I come back within a day with a scoped proposal or an honest no, and I say no about as often as yes. Ask below, or reach me directly:',
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
