# SPEC — Architecture: twelve stops, one index, two routes

Implementation spec for TASKS 40 / 41 / 45 / 45b / 46, written 2026-09-05 against
`scratchpad/research/C-architecture.md` and the "Research verdicts, 2026-09-05" section of
`TASKS.md`. **No repository file was changed to write this.** The routing numbers in §2.5
were measured read-only, by importing `lib/retrieve.ts` and re-running its own vote
arithmetic against a simulated `stopId` remap; §9 records how, so they can be re-run.

Read §2 before writing any code. Six of its eight traps fail **silently**.

## STATUS

| § | section | state |
|---|---|---|
| 1 | The target state — twelve stops, two routes | done |
| 2 | The traps, each with its fix | done |
| 3 | Migration order — shippable increments | done |
| 4 | The exact authored copy, licensed clause by clause | done |
| 5 | The gap list, refreshed | done |
| 6 | What could go wrong, ranked by likelihood x cost | done |
| 7 | What NOT to build | done |
| 8 | What is NOT verified | done |
| 9 | How the measurements in this spec were taken | done |

This file is assembled from `spec-parts/*.md` in the same directory (`cat spec-parts/*.md >
SPEC-architecture.md`). Edit the parts, not this file.

---

# 1. THE TARGET STATE

## 1.1 The shape, in one paragraph

Twelve stops on the spine. §07 stops being one project's figure and becomes **the index of
the things he has built**. Three projects get a stop each — §08 JewelAI, §09 the apparel
photoshoot pipeline, §10 MruNN-ERP. Depth for two of those three hangs off the spine as
**server-rendered routes**, `/work/jewelai` and `/work/apparel`. `contact` stays last and
must stay last (§2.2).

**Twelve is terminal, not a stage.** The index is the extension point: the eighth thing MJK
ships becomes a tile on §07, not a §12. That is the whole reason the number does not have to
be re-argued the next time he builds something.

## 1.2 The spine

`compose` is a property of the stop, never of an answer. §4 cites the memory licensing each
clause of the authored copy.

| # | id | kicker | compose | draws | corpus memories it holds | assets |
|---|---|---|---|---|---|---|
| 0 | `hero` | `MATHEW JOHN KONDEKERIL · SINGAPORE` | `hero` | title, lede, body | (none — authored only) | — |
| 1 | `origin` | `§ 01 — Origin` | `plain` | prose only | 4 | — |
| 2 | `engineering` | `§ 02 — Engineering` | `figure` | MJK-101 / engine morph | 4 | in-module vectors |
| 3 | `pivot` | `§ 03 — Pivot` | `plain` | prose only | 2 | — |
| 4 | `apac` | `§ 04 — APAC` | `timeline` | career rail | 16 | — |
| 5 | `rd350` | `§ 05 — The RD 350` | `carousel` | 5 frames + before/after | 2 | `public/media/rd350/*` |
| 6 | `now` | `§ 06 — Now` | `cards` | 4 cards | 5 | — |
| 7 | `work` | `§ 07 — Selected work` | **`index`** (new kind) | **3 chapter tiles + 4 card tiles, no figure** | `build-overview`, `awards`, `project-tallybridge`, `outreach-engine`, `artha-gtm` (+ `paxel-assessment`, `paxel-numbers` — G10) | — |
| 8 | `jewelai` | `§ 08 — JewelAI Studio` | **`proof`** (reused) | 3 refs → image → clip, then 2 cards | `project-jewel-ai`, `jewelai-reads-the-piece`, `jewelai-gates`, `jewelai-video`, `jewelai-infrastructure`, `jewelai-the-ring`, `jewelai-platform` (7) | `media/jewelai/ref-1..3.jpg`, `generated.jpg`, `clip.mp4` |
| 9 | `apparel` | `§ 09 — The photoshoot pipeline` | **`pair`** (new kind) | before/after + 4-position pager, then 2 cards | `project-photoshoot-pipeline`, `photoshoot-how-it-works`, `photoshoot-numbers` (3) | `media/apparel/{supplier,catalogue}-{8,78,82,104}.jpg` |
| 10 | `mrunn` | `§ 10 — MruNN-ERP` | **`cards`** now → **`video`** when the recording lands | 2 cards now; a 16:9 poster + play control later | `project-mrunn-erp`, `mrunn-approval-gate` | **none on disk** — G3 |
| 11 | `contact` | `§ 11 — Brief me` | `contact` | 4 links + 2 cards | 2 | — |

Load-bearing notes, not colour:

- **All twelve project memories move. This is measured, not preferred.** The obvious
  alternative — keep the one-line summaries `project-jewel-ai`, `project-photoshoot-pipeline`
  and `project-mrunn-erp` on the index and move only the deep memories — **fails
  `evals/tier-a/cards.test.ts`**, which is an all-or-nothing gate. That test asserts that
  every card's `Tell me about {title}.` routes to the card's own stop. With
  `project-jewel-ai` left on `work`, "Tell me about JewelAI Studio." routes to `jewelai` at
  a 0.72 share — a card on §07 that promises §07 and delivers §08. Measured; see §2.5 and §9.
  With all twelve moved, all 43 card questions pass. **So the full split it is.**
- **Consequence: §07's index draws two kinds of tile.**
  - **Three chapter tiles** — JewelAI Studio, the photoshoot pipeline, MruNN-ERP. These are
    **in-page anchor links to §08 / §09 / §10**, not `AskCard`s. Their title and one-line
    description are read from `project-jewel-ai`, `project-photoshoot-pipeline` and
    `project-mrunn-erp`, which now live on those stops — so the text is still corpus text,
    drawn rather than authored, and `firstSentence()` already does the trimming.
  - **Four card tiles** — `project-tallybridge`, `outreach-engine`, `artha-gtm`, `awards`.
    Ordinary `AskCard`s on `work`, unchanged in behaviour.
  A chapter tile should carry a **real count** as its kicker ("6 more about this one",
  computed from `memoriesForStop`), not a decorative arrow. That is the "detached honeypot"
  argument from the research made concrete: a visible trace that substance exists, and it
  costs nothing to render. Do not invent the number — compute it.
- **§08 reuses `compose: 'proof'`.** `proof` already means "one figure over a short card
  list", which is exactly what §08 is. Its figure is `JewelEvidence` extended to three
  stations per TASKS 41; `JewelGates` moves to `/work/jewelai`, where it has room.
- **§10 ships as `cards` and becomes `video` later.** Changing `compose` later is one line
  and does **not** change `M`, so it costs no second re-measurement pass. Holding §10 back
  until the video exists costs two passes (9→11, then 11→12), and the re-measurement is the
  largest line item in this migration (§2.1). Recommendation: ship at n=12 now. State the
  trade to MJK, because §10 is the thinnest stop on the page until the recording exists.
- **MruNN has no route.** MJK, 2026-09-05: no clients yet. A build with no users is a
  legitimate capability demonstration; it is not a case study, and a route would be a page
  promising depth it does not have. **The site says nothing at all about client status.** The
  corpus licenses no client claim, so none is made, and no disclaimer is written. Do not add
  "not yet launched", "pre-launch", "in development", "coming soon" or any other hedge
  anywhere on the site or in a route.
- **The `§ NN` labels now run 01 to 11.** `DESIGN.md` defends them "for stops 1 through 8";
  that line needs the number changed. The argument is unchanged.

## 1.3 The routes

Two, not three.

| route | carries | licensed by | assets | status |
|---|---|---|---|---|
| `/work/jewelai` | how it reads a piece; the gates (`JewelGates` moves here); the video half; what it runs on; the ring | 7 memories — the richest subject in the corpus | `ref-1..3.jpg`, `generated.jpg`, `clip.mp4` | **buildable today, no gaps** |
| `/work/apparel` | the five agents; the critic and its pass mark; the ledger | `project-photoshoot-pipeline`, `photoshoot-how-it-works`, `photoshoot-numbers` | four `supplier-`/`catalogue-` pairs | **buildable today, no gaps** |
| ~~`/work/mrunn`~~ | — | — | — | **not built.** No clients, no outcome, no asset. The stop is the whole of it |

**Routes do not fork the chat.** A route page carries the same `stopId` as its spine stop; it
does not get one of its own. Justification in §2.8, and it is a decision with measured
grounds, not a default.

## 1.4 What is deleted

- `components/stops/WorkFigure.tsx` — the whole three-state machine, including
  `FIGURE_BY_CITE`, `AMBIGUOUS_CITE` and the `cites[0]` heuristic. It exists only to
  arbitrate one 653px column between two projects; after the split there is no contest. Net
  simplification.
- The `limit={2}` special case for `proof` in `StopSection.tsx` becomes a per-compose rule
  rather than a literal.

## 1.5 Out of scope, and named so it is not smuggled in

The intro portrait (44), the two client websites (42 — blocked on G1), the animated flowchart
(43), the mobile scene budget (47/48). None of them blocks this work and this work blocks
none of them. **TASKS 38's mobile flip for the six EXISTING stops is also out of scope** —
§2.7 explains why. Only the three new stops are media-first here.
---

# 2. THE TRAPS

Eight of them. Six fail silently — no throw, no log, no red test. Two throw, and those two
are the friendly ones.

Quick index, with what happens if you miss it:

| # | trap | fails how | cost of missing it |
|---|---|---|---|
| 2.1 | `mulberry32(0x5eed ^ M)` re-rolls the whole field | silent | every screenshot number in `PLAN.md` / `TASKS.md` is quietly false |
| 2.2 | `V[8]`'s pullback is on the LAST NODE | silent | §11 reverts to the pale frame; luminance 92.2 → 127.6 |
| 2.3 | `scene.ts:162` hard-codes `buildWaypoints(9)` | silent | 12 sections mapped onto 8 camera segments; no pulse past stop 8 |
| 2.4 | `lib/flight.ts`'s 820ms clamp is saturated | silent | the longest flight tears at 2.67x the stated threshold |
| 2.5 | the routing vote splits four ways | **loud** (CI) | the highest-risk item. Measured in detail below |
| 2.6 | `far-network.json` is a fixed volume | silent | fine at 12; a hard ceiling near 16 |
| 2.7 | `globals.css:3256` orders prose first on mobile | silent | new stops repeat the §05 failure — media below the fold |
| 2.8 | routes could fork the chat | silent | a second stopId space with no waypoint and no section |

Plus two that **throw**, and are therefore safe: `scripts/check-corpus.ts:51`'s
`Record<Exclude<StopId, 'hero'>, ...>` fails `npm run typecheck` until the three new stops are
added to `SECTIONS_FOR_STOP`; and `evals/tier-a/stops.test.ts` fails on `toHaveLength(9)` and
`ANSWERABLE_STOP_IDS` `toHaveLength(8)`. **Neither is in the research's grep list.** They are
the only two places where the codebase notices a stop-count change on its own.

---

## 2.1 The seed re-roll. The largest line item, and it is measurement, not code.

`lib/mind/scene.ts:265`:

    const rng = mulberry32(0x5eed ^ M);

One generator drives the entire secondary network, the Galton-Watson sub-branches, the tier-2
midground seeding and the dust. `0x5eed ^ M` is a **different seed for every M**:

| M | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|
| seed | 24292 | 24295 | 24294 | 24289 | 24288 | 24291 |

The twelve somas the camera looks at stay exactly where they are (§2.2). Everything around
them — every filament, every midground cluster, every dust mote — is a different stream.
**Nothing on the page is pixel-identical after M changes.**

### Which numbers die

These are recorded in `PLAN.md` and `TASKS.md` as measured facts. After the change they are
measurements of a scene that no longer exists. Do not carry them forward; re-take them.

| number | where it is quoted | what it measured |
|---|---|---|
| `contact` whole-frame luminance **127.6 → 92.2** | `waypoints.ts:57-73`, PLAN §4.5, C-arch §3.1 | the terminal-pullback fix. **Re-measure on §11, not §08** |
| far-node frustum coverage **3.4% / 10.6% / 15.5% / 37.8%** | PLAN | how much of `far-network.json` is on screen per tier |
| **10.79:1 p95 halo contrast** on the pixels body text sits on, worst of six animated frames | TASKS 39 "what to protect" | the single strongest accessibility claim on the site. It is a claim about the *scene behind the glyphs*, and the scene changed |
| bright-pixel coverage **−71% median / −50% worst frame** at 1440x900; **−58% median, −24% mean luminance** on a phone | TASKS 29 | the near-falloff fix |
| the phone's worst band **u = 0.78–0.86 at 16.26%** above luminance 160 | TASKS 29, still open | that band is now a *different part of the path* — u=0.78 was between §07 and §08 at n=9 and is between §09 and §10 at n=12 |
| the carousel frame's border **under 1.2:1 for 24% of its length, median 1.43** | TASKS 39 | hairlines over the scene |
| per-stop panel heights and the 517px readable band arithmetic | TASKS 38, C-arch §5.2b | unaffected by the seed (DOM, not scene) — **these survive** |
| the mobile scene's **1.16% pixel change on the first screen** | TASKS 29/48 | first screen is `hero`, whose vantage is bit-identical — but the field around it re-rolls, so re-take it |

### The re-measurement pass, as a work item

This is **increment 6** in §3, and it is not a footnote. Budget it as one working session.

1. Build at n=12. Screenshot every stop at **1440x900, 1280x720 and 390x664** — 36 frames.
2. Re-take the contact-frame luminance on **§11** and confirm it is near 92, not near 128.
   If it is near 128 you have appended past contact; see §2.2.
3. Re-take the p95 halo contrast on the pixels body text actually sits on, worst of six
   animated frames, **on every stop**. This is the measurement `DESIGN.md` treats as
   non-negotiable, and it is now unverified on twelve stops.
4. Re-run the phone luminance sweep and find where the new worst band is.
5. Rewrite the numbers in `PLAN.md` and `TASKS.md` **in place**, with the date and n=12
   beside them. Do not leave two generations of numbers in one file.

**Do not screenshot-judge an image within 8 seconds of a cold navigation.** TASKS 30 records
two false "the images do not load" reports caused by the standalone image optimizer resizing
on first request: every frame empty at 2.5s, all eight decoded at 9s.

---

## 2.2 `V[8]`'s 9-unit pullback is attached to the LAST NODE, not to `contact`.

`lib/mind/waypoints.ts`:

    if (i === n - 1) return p.clone().addScaledVector(dirN, -9).add(new THREE.Vector3(0, 1.4, 0));

The condition is `i === n - 1`. It is positional. It has never known the word `contact`.

That pullback is the fix that took the last screen's whole-frame luminance from 127.6 to
92.2 and stopped it reading as a different website — the one screen a visitor is asked to act
on.

**The rule, and it is absolute:**

> Insert the three new stops **between `work` and `contact`**. `contact` must remain the last
> element of `STOPS`. Append anything after it and §11 silently loses the pullback, the frame
> goes pale, and the reading light has nothing to weight toward.

Verified in the research by re-running the generator: `S[0..8]` are **bit-identical floats**
at n=9 and n=14, and `V[0..7]` likewise. Only `V[8]` changes, and correctly: at n=12 it
becomes an interior vantage (it is now `jewelai`) and the terminal rule moves to `V[11]`,
which is `contact`. That is exactly what is wanted, and it happens for free **provided
contact stays last**.

**Detection:** step 2 of the re-measurement pass. There is no test for it and one cannot
cheaply be written — it is a pixel property of a rendered frame.

---

## 2.3 `scene.ts:162` hard-codes nine, and nothing throws.

    const waypoints = opts.waypoints ?? buildWaypoints(9);

`MindCanvas` does not pass `opts.waypoints`, so the literal is what runs. If `STOPS` grows to
twelve and this stays at nine:

- `ScrollProgress` maps twelve sections onto an eight-segment camera path. `data-stop` reports
  0..11; the camera only knows 0..8. The two disagree for the entire second half of the page.
- `handle.pulse(i)` is guarded `i >= 1 && i < M`. An out-of-range index is **silently
  ignored** — a routed answer landing on §09, §10 or §11 fires no light and logs nothing.
- `opts.textSides` comes from `STOPS.map(...)`; extra entries are never reached, so the
  reading light's side is right for the first nine stops and undefined past them.

None of these throws. None of them appears in a test.

**The fix is structural, not a number.** Do not change `9` to `12`. Pass the waypoints (or at
minimum `STOPS.length`) in from `MindCanvas`, exactly the way `textSides` already is, so
`content/stops.ts` is the single source and the two cannot drift again. The next person to add
a stop must not have to know this file exists.

    // components/mind/MindCanvas.tsx — alongside the existing textSides
    waypoints: buildWaypoints(STOPS.length),

and in `scene.ts`, make the parameter required rather than defaulted, so omitting it is a
type error instead of a wrong scene.

**Detection while developing:** add an assertion in `ScrollProgress` or `MindCanvas` that
`waypoints.length === STOPS.length` and throws in development. Cheap, and it converts the
whole class of failure from silent to loud.

---

## 2.4 The flight clamp is already saturated.

`lib/flight.ts:39`:

    return Math.min(820, Math.max(340, 300 + 70 * (distance / Math.max(viewport, 1))));

At n=9 the hero→contact flight is 7,821px and asks for 948ms. It is **already clamped** to
820ms. The file's own measured table puts its peak at **274 px/frame against a stated tearing
threshold of ~141** — 1.94x over, and the comment says so honestly.

Because the clamp is saturated, peak velocity on the longest flight scales linearly with n:

| n | longest flight | duration | peak px/frame | x threshold |
|---|---|---|---|---|
| 9 | 7,821px | 820ms (clamped) | 274 | 1.94x |
| 12 | ~10,754px | 820ms | ~377 | **2.67x** |

**Fix, one line:**

    return Math.min(820 * (STOPS.length - 1) / 8, Math.max(340, 300 + 70 * (distance / Math.max(viewport, 1))));

At n=12 that is 1,128ms, which holds today's already-over-threshold peak rather than making it
worse. The cost is a longer hijack on the rarest flight; the file's own header already argues
that the visitor is waiting on an answer at the far end.

**Import `STOPS` into `lib/flight.ts` rather than hard-coding 1,128**, for the same reason as
§2.3 — a literal here is the next silent drift.

**This is arithmetic on the file's own two recorded data points (844px/370ms → peak 65, and
7,821px/820ms → peak 274, both giving k ≈ 1.71 x mean). It has NOT been re-measured in a
browser.** Say so wherever the number is quoted.

---

## 2.5 The routing vote. **The highest-risk item, and it is now measured.**

### The mechanism

`lib/retrieve.ts` `vote()` accumulates BM25 mass per `stopId`:

    m = best + STOP_SUPPORT * (sum of the rest)      // STOP_SUPPORT = 0.35
    share = winner's m / total m

and `confident = topical && (engaged || share >= MIN_SHARE)`, with `MIN_SHARE = 0.5`.

Today all nineteen `work` memories vote for one stop, so almost every work question has a
share near 1.0 **by construction — there is only one stop in the ballot**. Split `work` four
ways and both the winner and the share change.

### What CI actually gates — and it is not what the research said

Three assertions in `evals/tier-a/routing.test.ts`, over a table of **64 rows** (the research
said 72 and 11 `work` rows; the file has **64 rows and 10** `work` rows — count them before
quoting either number):

1. `accuracy >= MIN_ACCURACY (0.9)` — at n=64 that allows **6 misses**.
2. **`hedged / 64 <= 0.1`** — correctly-routed-but-unconfident. At n=64 that allows **6
   hedges**. *This is the binding constraint, not accuracy.*
3. every table row must come back `topical` (the field `lib/ask/handler.ts` actually branches
   on). `topical` depends on `topScore`, which a `stopId` remap does not change — **so no new
   refusals are possible from this work.** That is worth knowing; it is the failure mode that
   would cost MJK a customer.

Plus: `routing.test.ts` asserts the table **covers every answerable stop**. Three new
answerable stops means the table *must* gain rows for `jewelai`, `apparel` and `mrunn` or the
suite fails on a different assertion entirely.

### Two harder gates the research never mentioned, and they are all-or-nothing

`MIN_ACCURACY` allows six misses. These allow none.

4. **`evals/tier-a/cards.test.ts`** — for every one of the 43 cardable memories,
   `retrieve(cardQuestion(m.title), { viewing: m.stopId }).stopId` must equal `m.stopId`,
   **and** `hits[0].memory.id` must equal `m.id`. A card is a control; the test asserts the
   promise it makes. Empty-array assertion, no tolerance.
5. **`evals/tier-a/voice.test.ts`** — every entry in `stopPrompts` must route to its own stop
   with `viewing` set, must be **≤ 40 characters**, and every stop must offer **exactly four**
   (a stop offering three or five republishes `--dock-h` and relays every section).
   Empty-array assertion, no tolerance.

**Gate 4 is what decides the split**, and it decides it against the intuitive answer. §1.2
records the measurement. **Gate 5 kills two of §07's four current prompts** — "How does
JewelAI read a piece?" and "Does the pipeline ever refuse?" both route to `jewelai` after the
split. §4.6 gives a measured replacement set for all four affected stops.

### Measured: the full split, before any mitigation

Simulated by taking the real hit lists from `retrieve()` for all 64 rows and re-running
`vote()` with the twelve remapped memories (§9 has the method). Baseline first:

| | accuracy | hedged | worst shares |
|---|---|---|---|
| **today, n=9** | 64/64 = 1.000 | 2/64 = 0.031 | `who did you work for at omnicom` 0.497; `What actually shipped at Taboola?` 0.445 |
| **full split, expectations unchanged** | 61/64 = 0.953 | 4/64 | see below |
| **full split, three rows re-expected** | **64/64 = 1.000** | **5/64 = 0.078** (cap 0.10) | 0.347 |

The three rows that move, and what they become:

| question | today | after the split | verdict |
|---|---|---|---|
| `tell me about jewelai studio` | `work` (1.00) | **`jewelai` (1.00)** | re-expect to `jewelai`. This is the feature working |
| `what's mrunn` | `work` (0.89) | **`mrunn` (0.77)** | re-expect to `mrunn`. Same |
| `do you build multi agent systems` | `work` (0.56) | **`now` (0.347)** | **the one genuine casualty.** See below |

### The one genuine casualty, and exactly why it happens

`do you build multi agent systems` retrieves:

    123.40  work   build-overview
     82.12  now    how-i-work-with-agents
     77.10  now    cap-ai-agents
     76.85  now    what-i-do-now
     71.88  work   project-photoshoot-pipeline
     60.96  work   project-mrunn-erp

Today `work` = 123.40 + 0.35 x (71.88 + 60.96) = 169.89 against `now` = 136.00. **`work` wins
only because two project memories are propping it up.** Take them away and `build-overview`
stands alone at 123.40 against `now`'s 136.00, and `now` wins with a 0.347 share.

### The mitigation, in the order to try it

**1. Re-expect the row to `now`, and say why in the table's own comment.** This is what
`routing-table.ts`'s header instructs: *"Where the corpus genuinely puts the answer somewhere
other than the obvious stop, fix the EXPECTATION and say why in a comment — never widen an
alias until the table goes green. An alias tuned to a test is a lie that passes."*

And under the new IA it is arguably the *right* answer: `work` is now an index of named
artefacts, and `now` is the capability stop whose authored body already reads "multi-agent
pipelines, custom ERPs, automation, and the analytics to say whether any of it worked." A
capability question belongs on the capability stop. **Recommended.**

It leaves the row correctly-routed but hedged at 0.347, which spends one of the six hedge
slots.

**2. Add the required new rows, which buys back the hedge margin.** The table must gain rows
for the three new stops anyway. Twelve candidate rows were measured; eleven route correctly
**and confidently**:

| stop | question | lands | share |
|---|---|---|---|
| jewelai | `how does jewelai read a piece of jewellery` | jewelai | 1.000 |
| jewelai | `how does jewelai check its work` | jewelai | 1.000 |
| jewelai | `what does jewelai studio run on` | jewelai | 1.000 |
| jewelai | `tell me about the ring` | jewelai | 1.000 |
| jewelai | `does the pipeline ever refuse to run` | jewelai | 0.621 |
| jewelai | `how does the video work` | jewelai | 0.559 |
| apparel | `how do you turn a supplier photo into a catalogue image` | apparel | 0.955 |
| apparel | `what is the pass mark for the critic` | apparel | 0.877 |
| apparel | `what did the catalogue images cost` | apparel | 0.676 |
| apparel | `how does the photoshoot pipeline work` | apparel | 0.670 |
| apparel | `tell me about the clothing work` | apparel | 0.530 |
| mrunn | `is it gst compliant` | mrunn | 1.000 |
| mrunn | `does anything change without approval` | mrunn | 0.919 |
| mrunn | `tell me about mrunn erp` | mrunn | 0.842 |
| mrunn | `what's mrunn` | mrunn | 0.771 |
| mrunn | `what is a chat native erp` | mrunn | 0.666 |

`why send three photographs` was also tried and hedges at 0.452 — **do not add it**; it spends
a slot for nothing.

Adding twelve of these takes the table to 76 rows: the hedge cap rises from 6 to 7.6 while the
hedge count stays at 5. Margin restored from 5-of-6 to 5-of-7.

**3. Do NOT add an alias.** Not on the first attempt and probably not at all. The file forbids
it in its own words, and an alias that makes "multi agent systems" point at `work` is a lie
that passes: the corpus really does put that answer on `now`.

**4. If accuracy still drops after 1 and 2 — what I would actually do, in order:**

   a. **Read the misses, never the percentage.** `npm run route:eval` prints every row with
      scores. A router is judged on which questions it gets wrong.
   b. **Check whether the "miss" is the eval being wrong.** After this change the eval encodes
      a nine-stop world. Two of the three rows that moved are the feature working correctly.
      A third moving is not automatically a regression.
   c. **If a genuine miss remains, move a memory, not a threshold.** The `stopId` field is the
      lever with the honest semantics: it says where the answer lives. **But note that the
      obvious move — keeping the three `project-*` summaries on `work` — is closed:** it
      recovers `do you build multi agent systems` (it stays on `work` at 0.43, hedged, 64/64
      accuracy) and then fails `cards.test.ts` outright, which has no tolerance. Measured. So
      the memory that moves has to be a different one, and there is no obvious candidate.
   d. **Only then consider `STOP_SUPPORT` or `MIN_SHARE`.** Both are global. Changing either
      re-decides all 64 rows plus the twenty buyer questions, and both were read off
      `route:eval`'s printed bands rather than chosen. Touching them is the last resort, and
      it needs its own before/after table.
   e. **What I would NOT do:** lower `MIN_ACCURACY`, or delete the failing row. Both are ways
      of making the instrument agree with the build.

### Two things this measurement does not cover

- **The buyer questions.** `BUYER_QUESTIONS` is judged separately, on `OFFER_STOPS` and on not
  refusing. `do you build chatbots` was measured going from `work`(0.59) to `work`(0.33) —
  still an offer stop, still topical, so still answered, but no longer confident. Several
  other buyer rows are decided by the `engaged` override rather than by the vote, and the
  simulation cannot see that path. **Run the real suite; do not trust the simulation for
  these.**
- **`opts.viewing`.** Every number above was taken with no viewport prior. The prior adds mass
  to the stop on screen, weighted by how little the question said for itself. On the page a
  visitor parked on §08 asking a JewelAI question gets *more* share, not less, so the real
  numbers should be no worse. Not verified.

---

## 2.6 `far-network.json` is a fixed volume.

Precomputed, static, 4,664 nodes, bbox z from +56.24 to −199.04. Its z histogram thins at the
far end: 468 nodes in −140..−120, 410 in −160..−140, 328 in −180..−160, **59 in −200..−180**.

Camera z reaches −94.8 at n=9, **−125.7 at n=12**, −146.2 at n=14, and roughly −199 at n≈19.

- **n=12 is comfortable** — the last stop sits in a bucket holding 468 nodes.
- n≈16 puts it in the thinning tail.
- n≥19 flies out of the volume and the desktop background empties.

**Nothing to do at twelve. Record the ceiling** so the next person does not discover it by
watching the background disappear. Mobile never draws it (`farNetwork: false`), so this is
desktop-only.

---

## 2.7 The mobile order rule — the mechanism behind TASKS 38.

`app/globals.css:3256-3265`, inside the mobile breakpoint:

    .content-zone,
    .content-zone.right,
    .center-stage .content-zone { order: 1; … }

and at :3305-3311:

    .media-zone, .media-zone.left, .media-zone.right { order: 2; … }

**Prose first, media second, on every stop, on every phone.** That single pair of rules is why
the aircraft, the timeline rows and the RD 350 photographs are below the fold at 390x664. The
desktop already alternates (`.media-zone.left { order: 1 }` / `.right { order: 2 }` at
:514-521), so the machinery exists and is simply not used on mobile.

### For the three NEW stops: media-first from the start

Add an opt-in rather than flipping the global rule. A `mediaFirst: true` field on the stop,
rendered as a data attribute on the section, and inside the mobile breakpoint only:

    [data-media-first] .content-zone { order: 2; }
    [data-media-first] .media-zone  { order: 1; }

Set it on `jewelai`, `apparel` and `mrunn`. A phone visitor scrolling flat-out then sees a
JewelAI image, an apparel before/after and (later) an ERP frame — which is precisely what the
research requires the spine to carry: **the spine carries existence, the branch carries
depth.**

### And the authored bodies must be 2 to 4 lines, not 8

The 390x664 readable band is 517px. Working the budget per stop:

| stop | media height at 390 wide | kicker + title | left for body + caption | verdict |
|---|---|---|---|---|
| §08 jewelai | ~150px if the three refs lie horizontally | ~120px | ~245px | 4–5 lines |
| §09 apparel | **332px** — `--pair-h: min(50svh, 100cqw/0.963)`, and the CSS comment says 50svh is 332px on a 390x664 phone | ~120px | **~65px, i.e. 2 lines** | **tightest on the site** |
| §10 mrunn (as cards) | two cards, ~200px | ~120px | ~200px | 3 lines |
| §10 mrunn (as video) | 16:9 in a 351px column = **197px** | ~120px | ~200px | 3–4 lines |

§05's body is nine lines today, and that is why the only photography on the site is below the
fold. **Do not repeat it.** §4's copy is written to these budgets.

### Flipping the six EXISTING stops is a separate, untested job

The research found the mechanism, and TASKS 38 may therefore be cheaper than recorded — the
lever is one declaration, not a rebuild. But:

> **The flip has NOT been tested on any existing stop. Screenshot it; do not assume it.**

It is a per-section judgement, not a CSS fix. Flipping §04 puts the timeline rail above the
sentence that explains what the rail is, and that may read badly. **Out of scope here.** If
the `[data-media-first]` opt-in above is built, flipping an existing stop later is one field
in `content/stops.ts` plus one screenshot each — which is the right shape for that work.

---

## 2.8 Routes must not fork the chat.

**Recommendation: a route page carries the same `stopId` as its spine stop. It does not get
one of its own.** Four grounds, in order of force:

1. **A `stopId` is a camera vantage.** `ANSWERABLE_STOP_IDS` derives from `STOPS`, and every
   member has a waypoint, a `<section data-stop>`, an `#answer-<id>` container and a
   `handle.pulse(index)` target. A route has none of those. Adding `'jewelai-route'` to
   `StopId` would put a value into the router that `ScrollProgress`, `pulse()` and
   `AnswerPortal` all have no answer for — and `pulse()` fails silently (§2.3).
2. **It would split the vote a third time.** §2.5 measured the hedge budget at 5 of 6 used.
   Splitting `jewelai` again between a stop and a route pushes more rows under `MIN_SHARE`,
   and `MIN_SHARE` is what decides whether the site sounds sure of itself.
3. **Progressive disclosure caps at two levels** (Nielsen). Spine → route is two. Spine →
   route → its own chat identity is three.
4. **The chat's behaviour must not depend on which URL you are on.** Same question, same
   answer, same citations, wherever it is asked.

### The concrete consequences, which the research did not name

`ChatDock` and `ChatProvider` are mounted in `app/layout.tsx`, **not** in `app/page.tsx`. So
the dock renders on `/work/jewelai` whether or not that was intended. Three things follow and
each needs a decision in increment 7:

- **`viewingStop()` reads `document.documentElement.dataset.stop`.** `ScrollProgress` is
  mounted on the page, not the layout. On a hard load of a route, `data-stop` is absent and
  `Number(undefined)` is `NaN`, so `viewingStop()` returns `undefined` — correct, harmless.
  **After a client-side navigation from the page, `data-stop` is STALE** and the route inherits
  whatever stop the visitor was last on as a retrieval prior. Fix: clear or set
  `data-stop` explicitly on route mount. One `useEffect`.
- **`goToStop()` no-ops the flight** when `document.getElementById(route.stopId)` is null,
  which it is on a route — but it still dispatches `ROUTE_EVENT`. Decide deliberately whether
  a question asked on `/work/jewelai` should navigate back to `/#jewelai` and fly, or answer
  in place. **Recommended for the first increment: answer in place, no navigation.** A route
  is a document; a question asked there is a question about the thing on screen.
- **`AnswerPortal` has a documented fallback** — "if the container is not on the page … the
  dock shows the answer itself". That is the behaviour a route gets for free. **Verify it;
  the comment is not a test.** If it does not hold, an answer asked on a route renders
  nowhere, which is the worst possible failure and completely invisible in CI.

### Where a route's own copy is checked

`evals/tier-a/claims.test.ts` scans `content/stops.ts`, `content/static-copy.ts` and
`components/stops/*.tsx`. **A new `app/work/[project]/page.tsx` is scanned by none of them.**
Extend `copySources()` to include the route's authored copy, or the route becomes the one
place on the site where an unlicensed number can ship. See §3, increment 7.
---

# 3. THE MIGRATION ORDER

Seven increments. **You can stop after any one of them and have a working, deployable site.**
Each states its files, the evals it moves, what to screenshot, and how to revert.

Increment 2 is the only large one, and it is large because it cannot honestly be split further
— the memories and the sections that draw them have to move together or the site shows a
figure keyed to memories that are no longer on that stop.

| # | what | risk | reversible by |
|---|---|---|---|
| 0 | make the stop count structural | **none** — bit-identical output | one revert |
| 1 | §07 index copy + prompts, still at n=9 | low | one revert |
| 2 | **the spine: 12 stops, memories split, evals** | **high** | one revert |
| 3 | media-first on the three new stops (mobile) | low | one CSS block |
| 4 | TASKS 41 — three stations in the JewelAI figure | low | one component |
| 5 | **the re-measurement pass** (no code) | none | n/a |
| 6 | `/work/jewelai` and `/work/apparel` | medium | delete the route dir |
| 7 | §10 becomes `video` — **blocked on G3** | low | one field |

---

## Increment 0 — make the stop count structural. No visible change.

Do this first and alone, so that when the spine changes there is nothing left to remember.

**Files**

| file | change |
|---|---|
| `lib/mind/scene.ts:162` | `opts.waypoints ?? buildWaypoints(9)` → make `waypoints` a **required** option. Delete the default entirely, so omitting it is a type error |
| `components/mind/MindCanvas.tsx` | pass `waypoints: buildWaypoints(STOPS.length)`, beside the existing `textSides: STOPS.map(...)` |
| `lib/flight.ts:39` | `Math.min(820, …)` → `Math.min(820 * (STOPS.length - 1) / 8, …)`. Import `STOPS`; do not hard-code 1128 |
| `components/mind/ScrollProgress.tsx` or `MindCanvas` | a development-only assertion that `waypoints.length === STOPS.length`, which throws. Converts §2.3's whole failure class from silent to loud |

**At n=9 this is a no-op by construction.** `buildWaypoints(STOPS.length)` is
`buildWaypoints(9)`, and `820 * 8 / 8` is `820`. That is the point: it is the change with no
behaviour in it.

**Evals**: none move. Full suite must stay green.

**Screenshot**: one frame at 1440x900 on §01 and one on §08 before and after. They must be
identical. If they are not, the waypoints are not being threaded the way you think.

**Rollback**: revert the commit. Nothing else depends on it.

---

## Increment 1 — §07's copy and prompts, still at n=9.

Small, isolatable, and it de-risks increment 2 by getting the copy through `claims.test.ts`
before anything structural moves.

**Files**

| file | change |
|---|---|
| `content/stops.ts` | `work.title` and `work.body` → §4.1's copy. `compose` unchanged for now |
| `content/static-copy.ts` | `stopPrompts.work` → §4.6's four. **Two of the current four break in increment 2**; replacing them now means increment 2 does not have to |

**Evals**: `claims.test.ts` scans the new body. `voice.test.ts` re-checks the four prompts —
all four measured at ≤ 34 characters and routing to `work` today and after the split (§4.6).

**Screenshot**: §07 at 1440x900 and 390x664. The body is shorter than the one it replaces, so
the media column gains slack rather than losing it. Confirm the panel did not shrink below the
figure.

**Rollback**: revert. Two files, no structure.

---

## Increment 2 — the spine. Twelve stops.

The large one. Do it in this order inside the branch; the middle states will not build and
that is expected.

**Files, in dependency order**

| # | file | change |
|---|---|---|
| 1 | `content/stops.ts` | insert `jewelai` (8), `apparel` (9), `mrunn` (10) **between `work` and `contact`**. `contact.index` 8 → 11, kicker `§ 08 — Brief me` → `§ 11 — Brief me`. `work.compose` `'proof'` → `'index'`. Add `mediaFirst: true` to the three new stops (used in increment 3) |
| 2 | `content/memories.yaml` | move **12** `stopId`s: 7 → `jewelai`, 3 → `apparel`, 2 → `mrunn`. The exact list is §3.2 below |
| 3 | `scripts/check-corpus.ts:51` | `SECTIONS_FOR_STOP` — add `jewelai: ['projects']`, `apparel: ['projects']`, `mrunn: ['projects']`. **This is a `Record<Exclude<StopId,'hero'>, …>`, so `npm run typecheck` fails until you do.** It is the codebase's only structural alarm |
| 4 | `components/stops/StopSection.tsx` | add compose kinds `index` and `pair`; point `proof` at `JewelEvidence` directly; replace the `limit={2}` literal with a per-compose rule |
| 5 | `components/stops/WorkIndex.tsx` | **new.** Three chapter tiles (anchors to `#jewelai`, `#apparel`, `#mrunn`, kicker = a computed memory count) + four `AskCard` tiles. Server Component |
| 6 | `components/stops/WorkFigure.tsx` | **delete.** With it go `FIGURE_BY_CITE`, `AMBIGUOUS_CITE` and the `cites[0]` heuristic |
| 7 | `content/static-copy.ts` | `stopPrompts` — add `jewelai`, `apparel`, `mrunn`, four each, from §4.6 |
| 8 | `evals/tier-a/stops.test.ts:39-40` | `toHaveLength(9)` → `12` (twice); the index array `[0..8]` → `[0..11]`; `ANSWERABLE_STOP_IDS` `toHaveLength(8)` → `11`; add `index` and `pair` to `RENDERABLE_COMPOSE` |
| 9 | `evals/tier-a/routing-table.ts` | re-expect three rows; add 12 new rows. §3.3 below has the exact set, measured |
| 10 | `app/not-found.tsx:19` | "The other nine do" → "The other eleven do" |
| 11 | `app/globals.css`, `app/page.tsx`, `DESIGN.md`, `PLAN.md`, comment headers listed in the research's §3.8 | prose only — "nine stops" → "twelve". No behaviour. Do it in the same commit so the repo never says nine and means twelve |

**Evals that move**

- `stops.test.ts` — four assertions, all mechanical.
- `routing.test.ts` — measured at **64/64 accuracy and 5/64 hedged (cap 6)** with three
  re-expectations, and **5/76 (cap 7.6)** once the twelve new rows are added. §2.5.
- `cards.test.ts` — measured green on all 43 cards under the full split. **Run it; it is the
  gate that decided the split.**
- `voice.test.ts` — needs the new prompt sets or it fails on coverage and routing.
- `claims.test.ts` — scans the three new bodies. §4 is written to pass it; verify rather than
  assume, because the `MAGNITUDE` scan is blunt on purpose.
- `corpus:check` — runs on `prebuild`. `apparel` (3), `jewelai` (7), `mrunn` (2) all clear
  `MIN_MEMORIES_PER_STOP`. **`mrunn` is exactly at the floor**, so removing either of its two
  memories later turns the build yellow.
- `viewport.test.ts`, `grounding.test.ts`, `ask-route.test.ts` — not expected to move, but
  they read the corpus and the stop list. Run the whole suite, not a subset.

**What to screenshot** — 36 frames, and this is also the input to increment 5:

- All twelve stops at **1440x900**, **1280x720**, **390x664**.
- §07 specifically: does the two-kind tile grid fit 653px at 1440x900 under
  `.panel { overflow: hidden }`, which **destroys** overflow rather than scrolling it? Seven
  tiles in two columns is four rows; the figure it replaces was ~430px and two cards ~200px.
  **This is not verified. Measure it before believing the layout fits.**
- §11 contact: the frame must not be pale. That is trap §2.2 showing itself.
- The dock height at 390x664 on each of the three new stops — five of nine sections already
  overrun it (TASKS 30, item 11), and three more sections is three more chances.

**Rollback**: one revert. The change is large but it is a single coherent commit; there is no
half-state worth keeping. Do not split it across deploys.

**What could still be wrong after it is green**: everything in §2.1. A green suite says the
routing and the copy survived. It says nothing about the scene, because nothing tests the
scene.

## 3.2 The exact `stopId` moves

Twelve lines in `content/memories.yaml`. Nothing else in the file changes.

| memory id | from | to |
|---|---|---|
| `project-jewel-ai` | work | **jewelai** |
| `jewelai-platform` | work | **jewelai** |
| `jewelai-reads-the-piece` | work | **jewelai** |
| `jewelai-gates` | work | **jewelai** |
| `jewelai-video` | work | **jewelai** |
| `jewelai-infrastructure` | work | **jewelai** |
| `jewelai-the-ring` | work | **jewelai** |
| `project-photoshoot-pipeline` | work | **apparel** |
| `photoshoot-how-it-works` | work | **apparel** |
| `photoshoot-numbers` | work | **apparel** |
| `project-mrunn-erp` | work | **mrunn** |
| `mrunn-approval-gate` | work | **mrunn** |

Staying on `work` (7): `build-overview`, `awards`, `project-tallybridge`, `outreach-engine`,
`artha-gtm`, `paxel-assessment`, `paxel-numbers`. The last two are G10 and are MJK's call; if
they go, `work` has five and the index has four card tiles instead of… four. (`awards` plus
three projects. The count works out either way, which is convenient rather than designed.)

## 3.3 The exact routing-table edits

**Three re-expectations**, each with the reason written into the file as the table's own rules
require:

| question | was | becomes | comment to write |
|---|---|---|---|
| `tell me about jewelai studio` | work | **jewelai** | the split working: JewelAI has a stop now |
| `what's mrunn` | work | **mrunn** | same |
| `do you build multi agent systems` | work | **now** | `work` is an index of named artefacts; `now` is the capability stop, and its authored body already reads "multi-agent pipelines, custom ERPs, automation". Measured: `work` used to win this only because two project memories propped it up (§2.5) |

**Twelve new rows**, all measured routing correctly and confidently (share in brackets):

    ...cases('jewelai',
      'how does jewelai read a piece of jewellery',   // 1.000
      'how does jewelai check its work',              // 1.000
      'what does jewelai studio run on',              // 1.000
      'does the pipeline ever refuse to run',         // 0.621
    ),
    ...cases('apparel',
      'how do you turn a supplier photo into a catalogue image',  // 0.955
      'what is the pass mark for the critic',                     // 0.877
      'what did the catalogue images cost',                       // 0.676
      'how does the photoshoot pipeline work',                    // 0.670
    ),
    ...cases('mrunn',
      'is it gst compliant',                    // 1.000
      'does anything change without approval',  // 0.919
      "tell me about mrunn erp",                // 0.842
      'what is a chat native erp',              // 0.666
    ),

**Do not add `why send three photographs`** — measured at 0.452, it would spend a hedge slot
and buy nothing.

---

## Increment 3 — media-first on mobile, for the three new stops only.

**Files**

| file | change |
|---|---|
| `components/stops/StopSection.tsx` | render `data-media-first` on the `<section>` when `stop.mediaFirst` |
| `app/globals.css`, inside the existing mobile breakpoint, **after** :3256-3265 and :3305-3311 | `[data-media-first] .content-zone { order: 2 } [data-media-first] .media-zone { order: 1 }` |

**Evals**: none.

**Screenshot**: §08, §09, §10 at 390x664 only. What must be true: the first screen shows the
media, not the prose. §09 is the tight one — 332px of pair plus ~120px of kicker and title
leaves ~65px, so the body's first two lines are all that is visible above the fold, by design.

**Rollback**: delete the two CSS rules. The `mediaFirst` field becomes inert; leave it.

**Explicitly not done here**: flipping §02, §04, §05, §07. That is TASKS 38, it is a
per-section composition judgement, and **the flip has never been tested on any existing
stop**. The opt-in built here makes that job one field plus one screenshot per stop, later.

---

## Increment 4 — TASKS 41: the JewelAI figure draws three stations.

**Files**: `components/stops/JewelEvidence.tsx` only.

Today it draws two stations — three references, one arrow, one output tile whose still is the
video's poster. The reason on file is sound as far as it goes: the generated still **is** frame
0 of the clip, mean absolute luma difference 3.37 of 255, so two tiles side by side would print
the same picture twice.

But that argues against printing it twice, not against drawing three stations. `jewelai-video`
licenses "It animates one of the images the pipeline has already made and already checked".
Three marks and two arrows says what the pipeline does and says the second thing MJK asked for:
**the image is a deliverable on its own**, and a client who needs only stills stops at the
middle station.

**Draw the third station as the video control, not as a second copy of the still.** The
middle mark is the generated image; the right mark is the clip behind a real control with a
duration label — which also fixes TASKS 39's finding that `▶ PLAY`, `SHOW ORIGINAL` and
`↻ REPLAY` are typographically identical to the captions beside them.

**Evals**: `claims.test.ts` scans the component's labels and caption.

**Screenshot**: §08 at 1440x900, 1280x720 and 390x664. On the phone the three-mark strip must
stay under ~150px or increment 3's budget breaks.

**Rollback**: revert the component.

---

## Increment 5 — the re-measurement pass. No code.

This is §2.1 in full and it is a work item, not a footnote. Budget one session. Output is
edits to `PLAN.md` and `TASKS.md`, in place, dated, with `n=12` beside each number.

**Do it after increments 2, 3 and 4 and before increment 6**, because it needs the final DOM
and the final scene, and because a route is a different page whose numbers are its own.

**Rollback**: not applicable. If the numbers come back bad — for example the p95 halo contrast
falls below 4.5:1 on some stop because the re-rolled field is brighter behind that stop's text
— then the finding is real and it needs its own fix. **Do not revert the spine to make a
measurement look better.**

---

## Increment 6 — the two routes.

**Files**

| # | file | change |
|---|---|---|
| 1 | `app/layout.tsx` / `app/page.tsx` | hoist `<MindCanvas/>` into the layout so the scene survives a client-side navigation. `<ScrollProgress/>` and `<FocusIntoView/>` **stay on the page** — they are about the spine |
| 2 | `app/work/[project]/page.tsx` | new. Server Component, `generateStaticParams` for `jewelai` and `apparel`, `notFound()` for anything else. Content read from the corpus |
| 3 | `components/stops/JewelGates.tsx` | move here from §07's media column. 24 inline paths, 1.4 kB, zero JS, and it finally has room |
| 4 | route mount | clear or set `document.documentElement.dataset.stop` — §2.8. One `useEffect` in a tiny client component |
| 5 | `evals/tier-a/claims.test.ts` | extend `copySources()` to include `app/work/**`. **Without this the route is the one place on the site where an unlicensed number can ship** |
| 6 | `app/robots.ts`, `app/sitemap.ts` | three URLs now, not one. G11: `AI_CRAWLER_USER_AGENTS` was one decision about one page and is now a policy |
| 7 | `content/site.ts` or the stop | a quiet route link on §08 and §09. One link, not a button. The figure and the cards do the attracting |

**Evals**: `claims.test.ts` gains files. `site.test.ts` may assert the sitemap. Nothing in the
routing suite moves, because the route has no `stopId` of its own (§2.8).

**Verify by hand, because nothing tests it**:

1. `/work/jewelai` with **JavaScript disabled** renders the whole page. That property is the
   entire argument for routes over the three rejected shapes; if it does not hold, the
   increment has bought nothing.
2. Ask a question from the dock on `/work/jewelai`. `AnswerPortal`'s documented fallback says
   the dock shows the answer when there is no `#answer-<stopId>` container. **The comment is
   not a test.** If it fails, the answer renders nowhere and CI will never notice.
3. Back from `/work/jewelai` returns to the spine at the position you left. Next.js `<Link>`
   maintains scroll when the target content is already in the viewport and otherwise scrolls to
   the top of the new page element; that is documented, not emergent, but confirm it here.
4. The camera does not jump when the route mounts. The cheapest honest version is: it parks at
   §08's vantage and holds.

**Screenshot**: both routes at 1440x900, 1280x720, 390x664. Plus the spine's §08 and §09 with
the route link present, to confirm the link did not cost the media column any height.

**Rollback**: delete `app/work/`, un-hoist `MindCanvas`, revert the `claims.test.ts` and
`robots.ts` edits. Four files. The spine is untouched by this increment, which is the point of
doing it last.

---

## Increment 7 — §10 becomes `video`. Blocked on G3.

Not startable. Listed so the slot is designed with the architecture rather than bolted on.

When the recording exists: `mrunn.compose` `'cards'` → `'video'`, one new compose kind, a 16:9
frame with `playsinline muted controls preload="none" poster="…"` and **no `autoplay`, no
`loop`** — an autoplaying loop on a scroll page hits all three conditions of WCAG 2.2.2
(Level A) and makes a pause control mandatory; poster-plus-play satisfies it by construction.
The caption doubles as the SC 1.2.1 text alternative for video-only media.

Target ≤ 1.5 MB for 30s at 1280x720, h264 High, CRF 24–26, `-tune stillimage`, poster JPEG
under 60 kB. **That target is an estimate from encoding heuristics, not a test encode.** Do not
shrink toward 640x640 or CRF 30 to match the JewelAI clip's 225 kB — a screen capture is the
opposite content class, and legible UI text is the whole deliverable.

**No `M` change, so no re-measurement pass.** That is the reason §10 ships as `cards` now.
---

# 4. THE AUTHORED COPY

Written to three constraints at once:

1. **2 to 4 lines of body**, not eight — §2.7's phone budget.
2. **No number, client name or claim `content/memories.yaml` does not license.** Every clause
   below cites its memory id. `evals/tier-a/claims.test.ts` enforces this; **every string in
   §4.1–§4.5 was run through that file's own `MAGNITUDE` scan and `RETIRED_CLAIMS` patterns
   against the live corpus, and all pass** (§9 records how).
3. **MJK's standing rule: no AI slop, no rhythmic duality-style sentences, no poetic framing
   for no reason.** No sentence below is built as "not X, but Y" or "X, and also X". Every
   sentence states one thing that is true and stops.

**And the rule that governs §10 specifically: the site says nothing about MruNN's client
status.** The corpus licenses no client claim, so none is made. There is no disclaimer, no
"not yet launched", no hedge, and none is to be added later. Silence here is the correct
answer, not a compromise — a disclaimer would be the only way to turn a normal capability
demonstration into a weakness.

---

## 4.1 §07 `work` — the index

    kicker: '§ 07 — Selected work'                       (unchanged)
    compose: 'index'
    align: 'left'                                        (unchanged)
    title: { strong: 'Things I have built.' }             (unchanged)
    body:
      'The things I have shipped, rather than the jobs I have held. Each one below is a
       question that has not been asked yet — press it and the site answers from a corpus
       it is not allowed to contradict. Three of them have a section of their own after
       this.'

| clause | licensed by |
|---|---|
| "The things I have shipped, rather than the jobs I have held." | `build-overview` — its opening sentence, verbatim |
| "the site answers from a corpus it is not allowed to contradict" | `build-overview` — "this site, which answers questions about me from a corpus it is not allowed to contradict" |
| "Each one below is a question that has not been asked yet — press it" | no factual claim. It describes the page's own mechanism, which `AskCard` already implements (TASKS 33), and it is the one line on this stop doing task 34's job |
| "Three of them have a section of their own after this." | site structure, not a claim about the work |

The title is unchanged deliberately. `DESIGN.md` treats a stop's title as its identity and the
anchor a flight lands on; "Things I have built." was already the right title for an index and
changing it would cost more than it buys.

**What was removed and why:** the current body is four sentences entirely about JewelAI —
"JewelAI Studio never tells the model in words what a piece looks like…". That copy is correct
and it moves to §08's title and body, where it is now beside the JewelAI figure instead of
beside a photograph of a kaftan.

---

## 4.2 §08 `jewelai`

    id: 'jewelai', index: 8
    kicker: '§ 08 — JewelAI Studio'
    compose: 'proof'
    align: 'right'                      (alternates from §07's left)
    mediaFirst: true
    title: { strong: 'It is never told in words', muted: 'what the piece looks like.' }
    body:
      'Three to five photographs of one piece go in together, and the whole set travels with
       every image the pipeline generates. A judge scores what comes back against those
       photographs, and a failure is made again with the judge’s own complaint folded into
       the prompt. The clip animates an image that has already been through all of that.'

| clause | licensed by |
|---|---|
| title, both halves | `jewelai-reads-the-piece` — "the model is never told in words what the piece looks like, because describing a ring in text is how you get a different ring back" |
| "Three to five photographs of one piece go in together" | `jewelai-reads-the-piece` — "asks for three to five photographs of one piece, shot from different angles, and the whole set travels together" |
| "the whole set travels with every image the pipeline generates" | `jewelai-reads-the-piece` — "every image the pipeline generates is produced with the entire reference set attached to the prompt" |
| "A judge scores what comes back against those photographs" | `jewelai-gates` — "After generation a judge scores each image against the original photographs" |
| "a failure is made again with the judge's own complaint folded into the prompt" | `jewelai-gates` — "the judge's specific complaint is folded back into the prompt and the image is made again" |
| "The clip animates an image that has already been through all of that" | `jewelai-platform` — "the video animates an image the pipeline has already generated and already checked"; `jewelai-video` says the same |

**Deliberately not written**, because the corpus does not license it: any count of retries.
`jewelai-gates` says the image "is made again"; it does not say once. `photoshoot-how-it-works`
does say "exactly one more attempt" — but that is the apparel pipeline, and borrowing it here
would be a fabrication of exactly the kind `claims.test.ts` exists to catch.

**Cards** (2, drawn from the stop's own memories in corpus order): `project-jewel-ai` and
`jewelai-reads-the-piece`. Move `project-jewel-ai` to the top of the jewelai block in
`memories.yaml` if a different pair is wanted — `StopSection` takes the first N in corpus
order, which is an authored choice, not a component change.

---

## 4.3 §09 `apparel`

    id: 'apparel', index: 9
    kicker: '§ 09 — The photoshoot pipeline'
    compose: 'pair'
    align: 'left'
    mediaFirst: true
    title: { strong: 'One flat supplier photograph in.', muted: 'A finished catalogue image out.' }
    body:
      'Five agents do the work in between, and a validator checks the prompt before any money
       is spent on it. What fails the critic is kept rather than deleted, and that is the
       part that made the thing improve.'

| clause | licensed by |
|---|---|
| "One flat supplier photograph in." | `photoshoot-how-it-works` — "A supplier sends one flat photograph of a garment" |
| "A finished catalogue image out." | `photoshoot-how-it-works` — "What comes out is a finished catalogue image", verbatim to the scanner |
| "Five agents do the work in between" | `photoshoot-how-it-works`, verbatim |
| "a validator checks the prompt before any money is spent on it" | `photoshoot-how-it-works` — "a validator checks the prompt against the category's rules before any money is spent on it" |
| "What fails the critic is kept rather than deleted, and that is the part that made the thing improve" | `photoshoot-numbers` — "55 attempts failed the critic and were kept rather than deleted, which is the part that made the thing improve" |

**This is the tightest body on the site by design.** §09's media is 332px at 390px wide
(`--pair-h: min(50svh, 100cqw/0.963)`, and the CSS comment records 50svh as 332px on a
390x664 phone), leaving roughly 65px of the 517px readable band — two lines. The body above is
two sentences and reads as two to three lines at that width. **Measure it; do not assume.**

**Deliberately not written:** the ledger numbers — 107 runs, 249 jobs, 125 accepted images,
seven categories, 55 kept failures, $27. All are licensed by `photoshoot-numbers` and all
belong on `/work/apparel`, where there is room to give them a table rather than a clause. A
number in a two-line body is a number nobody reads.

**A word on the title's grammar.** "A finished catalogue image out." is the corpus's own
phrase and it survives the magnitude scan **only** in that exact form — "a catalogue image
out" fails, because the corpus says "a *finished* catalogue image" and the scan is a substring
test. That is a real constraint, not a stylistic one: do not tidy the adjective away.

**Cards** (2): `project-photoshoot-pipeline` and `photoshoot-numbers`.

---

## 4.4 §10 `mrunn`

    id: 'mrunn', index: 10
    kicker: '§ 10 — MruNN-ERP'
    compose: 'cards'                    ('video' in increment 7)
    align: 'right'
    mediaFirst: true
    title: { strong: 'An ERP you talk to,', muted: 'that still renders a form when a form is the right tool.' }
    body:
      'Purchase orders, invoices and stock queries, through a Mastra multi-agent system on
       Telegram and the web. No data change ships without a human sign-off. I built it
       because every ERP I have used makes the person translate their intent into a form.'

| clause | licensed by |
|---|---|
| "An ERP you talk to" | `project-mrunn-erp`, verbatim |
| "that still renders a form when a form is the right tool" | `project-mrunn-erp` — "also renders traditional forms when they are the right tool" |
| "Purchase orders, invoices and stock queries, through a Mastra multi-agent system" | `project-mrunn-erp`, near-verbatim |
| "on Telegram and the web" | `mrunn-approval-gate` — "built for Indian SMBs on Telegram and the web" |
| "No data change ships without a human sign-off." | `mrunn-approval-gate` — "approval-gated: no data change ships without a human sign-off", verbatim |
| "I built it because every ERP I have used makes the person translate their intent into a form." | `project-mrunn-erp` — "Built because every ERP I've used forces the human to translate their intent into a form" |

**Deliberately not written:**

- **Anything about clients, users, launch state or results.** There is no user count, no time
  saved, no client and no date in the corpus, because there is nothing yet to measure. The
  page therefore says what it is and shows it, and says nothing else. **No disclaimer.**
- "GST and HSN compliant for Indian trading businesses" is licensed by `mrunn-approval-gate`
  and is left to the card, which draws it from the corpus directly. Four clauses is a
  five-line body and this stop's budget is three.

**Cards** (2): `project-mrunn-erp` and `mrunn-approval-gate` — which are also, until the video
exists, the whole of this stop's media column.

---

## 4.5 §11 `contact` — the only change is its address

    kicker: '§ 08 — Brief me'   →   '§ 11 — Brief me'
    index: 8                    →   11

Title and body unchanged. `DESIGN.md`'s defence of the `§ NN` labels — "an address in a
navigable space" — is the reason this has to be right: an address that lies is worse than no
address.

---

## 4.6 The dock's per-stop prompts

`content/static-copy.ts`. Four per stop, ≤ 40 characters each (`voice.test.ts` enforces both,
with no tolerance), and **each must route to its own stop with `viewing` set**. Every line
below was measured under the post-split corpus; the share is in brackets.

**`work` — replaces all four.** Two of the current four break: "How does JewelAI read a
piece?" routes to `jewelai` (1.00) and "Does the pipeline ever refuse?" routes to `jewelai`
(0.63) after the split. Both are correct behaviour and both fail `voice.test.ts`.

    work: [
      'What have you built?',                 // 20ch, work 0.61
      'Tell me about TallyBridge.',           // 26ch, work 1.00
      'What is Artha?',                       // 14ch, work 1.00
      'Tell me about the outreach engine.',   // 34ch, work 0.79
    ]

**`jewelai` — new.** The two that broke on `work` move here, where they belong.

    jewelai: [
      'How does it read a piece?',            // 25ch, jewelai 0.93
      'Does the pipeline ever refuse?',       // 30ch, jewelai 0.63
      'What does JewelAI Studio run on?',     // 32ch, jewelai 1.00
      'Tell me about the ring.',              // 23ch, jewelai 1.00
    ]

**`apparel` — new.**

    apparel: [
      'What does a supplier photo become?',   // 34ch, apparel 0.86
      'How is a garment staged?',             // 24ch, apparel 1.00
      'What does the critic score?',          // 27ch, apparel 0.73
      'How many images were accepted?',       // 30ch, apparel 0.66
    ]

**`mrunn` — new.**

    mrunn: [
      'What is MruNN-ERP?',                   // 18ch, mrunn 0.84
      'Does anything change without approval?',// 38ch, mrunn 0.92
      'Is it GST compliant?',                 // 20ch, mrunn 1.00
      'Why not just a form?',                 // 20ch, mrunn 1.00
    ]

**Measured and rejected**, so nobody re-proposes them:

| candidate | routes to | why not |
|---|---|---|
| `How does it check its work?` (jewelai) | `now` (0.32) | "work" and "check" are all over `how-i-work-with-agents` |
| `What is the critic looking for?` (apparel) | `work` (0.56) | — |
| `What did the catalogue cost?` (apparel) | `contact` (0.47) | "cost" is a buying word; the engagement shape catches it |
| `Where does it run?` (mrunn) | `jewelai` (0.71) | `jewelai-infrastructure` owns "runs on" |
| `What happens to a failed image?` (apparel) | `pivot` (0.66) | — |

**All twenty-four existing prompts on the other seven stops were re-checked under the split
and every one still routes to its own stop.** No other stop needs touching.

---

## 4.7 What could NOT be written, and why

These are gaps, not omissions. Each is a clause someone will want and nobody may write.

| wanted | blocked by |
|---|---|
| Any outcome for MruNN — a user, a client, a time saved, a date | **G4.** The corpus licenses architecture only. §10 says what it is and shows it |
| A link to JewelAI, MruNN or TallyBridge from anywhere on the site | **G5 / G6.** TallyBridge is MIT open source and still has no URL in the repo |
| Anything at all about `asanjokutch.org` or `ad-symphony.com` | **G1.** No memory names either site, its stack, his role, or any outcome. Not a stop, not a route, **not a tile** |
| A retry count in §08's body | the corpus says "made again", not "made again once" |
| The ledger numbers in §09's body | licensed, but they belong on the route where they can be a table |
| Any statement of the form "not yet launched" / "pre-launch" / "no clients yet" | **the rule, not a gap.** The corpus licenses no client claim, so none is made — and an absence nobody asked about is never volunteered |
---

# 5. THE GAP LIST, REFRESHED

Checked against `content/memories.yaml`, `content/site.ts`, `app/robots.ts` and
`app/sitemap.ts` as they stand on 2026-09-05. The research's list is carried forward with two
changes: **G4 is closed by a fact rather than left open**, and **G3 is downgraded** from
blocking to deferred, because §10 now ships without the video.

## 5.1 Blocking absolutely — nothing may be written

| # | gap | what MJK must supply | what it blocks |
|---|---|---|---|
| **G1** | **The two client websites: every fact.** No memory names `asanjokutch.org` or `ad-symphony.com`, their stack, dates, his role or any outcome | **per site**: what he actually did (built it / designed it / ran the media), when, on what stack, whether the client may be named or must stay anonymous like every other Krunch Labs client, and one outcome he will stand behind | TASKS 42 entirely. Not a stop, not a route, **not a tile.** A tile whose caption says nothing is worse than no tile |
| **G2** | **Whether the Shopify preview link may be published.** The URL he sent carries `?preview_theme_id=186809876844`, a Shopify **unpublished theme preview** | a yes/no, and if no, confirmation that the live storefront is the one to show | anything drawn from that URL. Preview links are also not durable |

## 5.2 Closed since the research was written

| # | gap | what closed it |
|---|---|---|
| **G4** | **MruNN has no outcome in the corpus.** Was "the highest-value single fact he could supply" | **MJK, 2026-09-05: MruNN has no clients yet.** That is a fact, not a hole. The consequence is architectural: MruNN is a spine stop with no route, and the site says nothing at all about client status. No corpus change is needed. See §1.2 and §4.4 |

## 5.3 Blocking depth, not existence — the site ships without them

| # | gap | detail | cost of leaving it |
|---|---|---|---|
| **G3** | **The MruNN recording, and whether it can show real data.** An ERP screen is full of client names, SKUs and amounts, and no guard inspects pixels — `claims.test.ts` scans `content/stops.ts`, not video frames | **decide before recording**: seeded demo tenant, or real data with the names changed. The only demo narrative the corpus licenses today is *type a request → the system proposes the change → a human approves it → the record updates*, about 25 seconds. Anything else in the recording needs corpus before it can be captioned | §10 stays two cards. It is the thinnest stop on the page until this lands. **Not blocking the migration** |
| **G5** | **TallyBridge has no URL anywhere in the repo.** The corpus says MIT open source with 27 MCP tools; `content/site.ts` holds only email, GitHub profile and LinkedIn | the repo URL | the cheapest possible upgrade from *claim* to *checkable*, and it is still not done. It is one line in `content/site.ts` |
| **G6** | **No link for JewelAI or MruNN either.** | whether they are public at all | if they are not public, **say so** — "not public" is a fact a visitor is actively looking for once a project is named, and silence there reads as evasion. Note this is the opposite of the MruNN client-status rule: client status is not a question the page raises; a missing link on a named project is |
| **G7** | **TallyBridge has exactly one memory.** | more corpus, if he wants it to be more than a tile | it stays a card tile on the index. That is a correct outcome, not a defect |
| **G8** | **`outreach-engine` and `artha-gtm` have one memory each and no asset.** | — | card tiles. Not stops. A stop with an empty media column advertises less than a card does |

## 5.4 Needs a decision from MJK, not a fact

| # | question | why it needs him |
|---|---|---|
| **G9** | **Artha is named, and it is the only named Krunch Labs client on the site.** `artha-gtm` licenses "the go-to-market growth engine for Artha, an AI-commerce SaaS". The agency-era brands (Canon, Evian, Skechers, Laughing Cow, Hindustan Unilever, Visa) are named as *campaign* work, which is normal in that trade; Artha is different in kind | the constraint as written ("no client is named anywhere on the site") does not match what the corpus licenses. **The index draws a tile for Artha**, so this gets more prominent, not less. Settle it before increment 2 |
| **G10** | **Paxel.** It borrows Y Combinator's name for authority, and 208,803 lines / 993 commits are volume rather than outcomes. It currently occupies two of §07's four card slots | the index frees those slots. Whether Paxel survives at all is his call. **If it goes, `work` drops to five memories and the index has four card tiles either way** — the arithmetic works out the same, which is convenient rather than designed |
| **G11** | **Whether `/work/*` may be indexed by the AI crawlers in `AI_CRAWLER_USER_AGENTS`.** `app/robots.ts` blocks them from `/` today; `app/sitemap.ts` lists exactly two URLs and its comment says "this list grows exactly as fast as `app/` grows real pages — no speculative entries" | one decision about one page becomes a policy about four. It is a two-line change either way, and it is his call, not the implementer's |

## 5.5 Also still open, and unrelated to this work

Carried from `TASKS.md` so nobody thinks this spec closed them: the wider RD 350 photograph;
the contact address (a hotmail address and a pseudonymous GitHub handle are the human contact
for a Singapore AI consultancy); whether to store visitors' questions; the Fraunces/Inter
pairing; the hero's name label; a proper photograph of his head for task 44.
---

# 6. WHAT COULD GO WRONG

Ranked by likelihood x cost. "Detection" is the thing that actually notices — not the thing
that ought to. Where nothing notices, that is stated, because those are the ones that ship.

## Rank 1 — §07's index does not fit 653px, and `overflow: hidden` destroys the excess

**Likelihood: high. Cost: medium — a visibly broken section.**

`.panel { overflow: hidden }` above 900px does not scroll the excess, it deletes it, silently,
and whichever element happens to be last. §07's column has ~653px at 1440x900. Seven tiles in
two columns is four rows. The figure they replace was ~430px and the two cards ~200px, so
there is roughly the right amount of room — **and that is an estimate, not a measurement.**
At 1280x720 the column is smaller and §07 already had 15px of slack before this change.

**Detection**: nothing automated. Screenshot §07 at 1440x900, 1280x720 and 390x664 in
increment 2, and count the tiles on screen against the seven that should be there.

**If it does not fit**: drop the two Paxel tiles (G10 wants them gone anyway), or make the
chapter tiles a single-row strip of three above a 2x2 card grid. Do **not** add a scroll
region — §7.2.

## Rank 2 — the routing hedge budget runs out

**Likelihood: medium. Cost: high — red CI, and the fix is not obvious.**

Measured: 5 hedges of a cap of 6 at 64 rows; 5 of 7.6 once the twelve new rows are added. One
more question falling under `MIN_SHARE = 0.5` turns `routing.test.ts` red on the assertion
nobody thinks about — not accuracy, the *hedge ratio*. Three rows already sit between 0.44 and
0.50, so they are one corpus edit from flipping.

**Detection**: `npm test` — but read the failure text, which names the hedged questions.
`npm run route:eval` prints every row with scores.

**Mitigation order**: §2.5 step 4. In one line: add the measured new rows first (they raise the
denominator), re-expect before re-aliasing, and touch `STOP_SUPPORT` / `MIN_SHARE` last and
never without a before/after table.

## Rank 3 — the re-measurement never happens, and the docs keep lying

**Likelihood: high. Cost: high, but deferred — which is exactly why it happens.**

Increment 5 is the only increment with no code in it, no test that fails without it, and no
visible symptom. `PLAN.md` and `TASKS.md` will simply carry numbers measured against a scene
that no longer exists, and the next person will build on them. The 10.79:1 halo-contrast p95 is
the one that matters most: it is the site's strongest accessibility claim and it is a claim
about the scene behind the glyphs.

**Detection**: none. It is a discipline problem.

**Mitigation**: do increment 5 in the same working session as increment 4, and treat it as
blocking increment 6. If it must slip, **mark the affected numbers in `PLAN.md` and
`TASKS.md` as `unverified at n=12` in increment 2** — one edit, and it stops the numbers being
quoted as facts in the meantime.

## Rank 4 — §11 comes back pale

**Likelihood: low if the insertion is done right. Cost: high — the last screen a visitor is
asked to act on reads as a different website.**

`V[n-1]`'s 9-unit pullback is positional. Insert before `contact` and it follows; append after
`contact` and §11 silently loses it (§2.2). Nothing throws; the only symptom is a frame that
looks wrong.

**Detection**: step 2 of the re-measurement pass — whole-frame luminance on §11, which should
land near 92, not near 128. There is no test and one cannot cheaply be written.

## Rank 5 — an answer asked on a route renders nowhere

**Likelihood: medium. Cost: high — completely invisible, and it is a broken feature on a page
built to look finished.**

`ChatDock` and `ChatProvider` live in `app/layout.tsx`, so the dock renders on `/work/jewelai`
whether or not anyone decided it should. `AnswerPortal` has a documented fallback — "if the
container is not on the page … the dock shows the answer itself" — but that is a comment, not
a test, and there is no `#answer-jewelai` on a route.

**Detection**: manual, in increment 6, step 2 of its verification list. CI will never see it.

**Also in this family**: `viewingStop()` reads `document.documentElement.dataset.stop`, which
`ScrollProgress` sets on the page and nothing clears on a route. After a client-side navigation
the route inherits a stale retrieval prior. One `useEffect` fixes it, and nothing detects it.

## Rank 6 — a routed answer lands on a stop the camera cannot reach

**Likelihood: low, but only because increment 0 exists. Cost: high.**

If `scene.ts:162` is left at `buildWaypoints(9)`, `handle.pulse(i)` silently ignores any index
≥ 9, `textSides` is undefined past the ninth stop, and `ScrollProgress` maps twelve sections
onto eight segments. **Nothing throws and nothing logs.**

**Detection**: the development assertion specified in increment 0
(`waypoints.length === STOPS.length`). That is the whole reason increment 0 is first and alone.

## Rank 7 — the three new stops overrun the dock on a phone

**Likelihood: medium. Cost: medium.**

Five of nine sections already run past the dock when scrolled to their own top (`TASKS.md`,
"Open, not started"), and §07's phone height has been recorded three different ways — 1132,
1030 and 1062 — which means it has never been measured cleanly. Three more sections is three
more chances, and §09's 332px pair is the tallest single media element on the site.

**Detection**: the 390x664 screenshots in increments 2 and 3.

**Mitigation**: the bodies in §4 are already short. If a stop still overruns, shorten the body
before touching the media — the media is the reason the stop exists.

## Rank 8 — `claims.test.ts` fails on copy that is actually true

**Likelihood: low — every string in §4 was run through the scan. Cost: low, and it fails
loudly.**

The `MAGNITUDE` scan is a substring test against the normalised corpus, so it is blunt in both
directions. "a catalogue image out" fails while "a finished catalogue image out" passes,
because the corpus says "finished". If someone tidies an adjective out of §09's title, the
build goes red for a reason that looks arbitrary. §4.3 records why the adjective is load-bearing.

**Detection**: `npm test`, loudly, with the offending phrase named.

## Rank 9 — the field reads thin at n=12

**Likelihood: low. Cost: low.**

`t2Seeds` (26/10) and `nebulaPoints` (9000/2700) are placed across the whole path, so both
dilute per segment by `8/(M-1)` — **−27% at n=12**. `config.ts` records that turning the
nebula off "is a different scene — the neuropil haze vanishes, the somas lose their glow and
read as bare balls", so a 27% thinning is the most likely visible consequence of twelve stops.

**Detection**: increment 5's screenshots, judged by eye against the ones taken before.

**Mitigation, only if it reads thin**: make both per-segment — `t2Seeds = round(3.25 * (M-1))`,
`nebulaPoints = round(1125 * (M-1))`. That costs frame budget linearly on a mobile tier tuned
at M=9, and TASKS 47 already reports the phone dropping frames. **Ship n=12 with them untouched
first and look at it.** Render, then measure, then decide.

## Rank 10 — the longest flight tears more visibly

**Likelihood: certain if increment 0 is skipped; otherwise none. Cost: medium.**

2.67x the stated tearing threshold at n=12 against 1.94x today. One line, and it is in
increment 0.

**Detection**: none automated, and the fix is arithmetic on the file's own two recorded data
points — **not re-measured in a browser by anyone.**

## Rank 11 — `far-network.json` empties behind the last stop

**Likelihood: none at twelve. Cost: high if it ever happens.**

Camera z reaches −125.7 at n=12, in a far-field bucket holding 468 nodes. Comfortable to
n=14, hard ceiling near n=16, and the desktop background empties past n≈19. Mobile never
draws it.

**Detection**: visual only, and it degrades gradually rather than failing.

**This is recorded so the ceiling is known, not because it binds.** Twelve is terminal anyway
(§1.1), which is the actual mitigation.

## Rank 12 — someone flips the mobile order rule for the existing stops on the way past

**Likelihood: low. Cost: medium.**

Increment 3 makes it one field. TASKS 38's four sections would then be media-first with a
single edit each — and **the flip has never been tested on any existing stop.** §04's timeline
above the sentence that explains what the timeline is may read badly, and §04 is "the single
best-executed component on the site at any viewport".

**Detection**: only a screenshot.

**Mitigation**: increment 3 sets `mediaFirst` on exactly three stops. Do not set a fourth in
the same commit.
---

# 7. WHAT NOT TO BUILD

Recorded so it is not re-proposed. Each entry says what was rejected, on what grounds, and —
where it matters — what would have to change for the answer to change.

## 7.1 Not more than thirteen stops on the spine, ever

The index is the extension point. New work becomes a **tile, not a chapter**. Otherwise this
decision has to be re-made every time MJK ships something, and the whole point of the shape is
that it does not.

Twelve was not chosen from a scroll-depth percentile — **no published dataset indexes drop-off
by chapter count on a scroll-driven page**, and everything in circulation comes from text
articles where scrolling is incidental. It comes from this repo's four measurable walls: the
`far-network.json` volume (comfortable to 14), the flight clamp (one-line-fixable to about 14),
the screenshot-measurement debt (linear in n, and re-paid on every M change), and the 517px
phone band (already failed by four of nine sections).

## 7.2 Not a nested scroll region inside a stop

On this page the document scroll **is** the camera: `ScrollProgress` → `setProgress` →
`sampleSeg`. A gesture consumed by an inner container moves nothing, so a nested scroller is a
region where the flight silently stops working — a far worse failure here than on an ordinary
page.

Three further costs, all real: scroll chaining and the "which thing am I scrolling" ambiguity,
worsened by trackpad momentum, which `overscroll-behavior: contain` makes deterministic rather
than removes; the axe rule `scrollable-region-focusable` against WCAG 2.1.1 (Level A), which
means `tabindex="0"` and a visible ring on a site whose audit protects all 25 focus rings; and
a head-on contradiction with `.panel { overflow: hidden }`, which is load-bearing.

**Ranked 4th of 4 by the research. Nothing would change this answer short of the camera no
longer following the document.**

## 7.3 Not a tree-shaped scroll remap

Highest visual payoff of the four shapes considered, and it still loses.

It breaks the invariant this repo learned the hard way and wrote down in `MindCanvas`: *"The
scene has one authority over where it is, and it is the document."* That line is the fix for
the `data-stop` / `data-active` fight where the camera and the scroll disagreed about which
stop was current. Remapping scroll either removes that authority or duplicates `flight.ts`
into a second coordinate space; either way it re-opens the defect the file was written to close.

Also: the scrollbar stops telling the truth, and `DESIGN.md`'s protected list is explicit that
"browser surfaces carry the design: selection, caret, scrollbars, focus rings". Back and reload
both need bespoke work — `history.pushState` per entry, a `popstate` handler that unwinds the
camera, and `history.scrollRestoration` set to `'manual'` because its default `'auto'` will
restore an offset that no longer maps to the same content. And it fails the TASKS-24 rule: a
branch that exists only as a JS scroll remap does not exist for a crawler or a JS-off visitor.

**In fairness:** NN/g's "Scrolljacking 101" is not a blanket condemnation and names legitimate
uses. The objection here is specific to this repo's document-is-the-authority invariant, not a
general prohibition.

## 7.4 Not JS-inserted branch sections

Best fit to the machinery that already exists — `ScrollProgress` already re-measures on section
resize, `buildWaypoints` already takes n, `data-stop` is already positional — and it is
disqualified by one thing: **`M`**.

If branch stops are real sections then `STOPS.length` is dynamic, `buildWaypoints(n)` must
re-run, and §2.1 applies: the seed is `0x5eed ^ M`, so **opening a branch re-rolls the entire
secondary field, midground and dust while the visitor is looking at it.** The scene would
visibly change around them.

Also, the repo has already measured the adjacent failure: a growing figure moved the camera
431–554px, and `overflow-anchor: none` is applied to the answer surface and **not** to the
media column — so the browser's anchoring fights the insertion exactly where it is not
disabled.

**One correction the research owed the record, and it is kept here:** sections *inserted* by JS
after a click are the crawl risk, but **hidden-but-present-in-HTML is fine** — Google's
mobile-first guidance says content may sit in accordions or tabs so long as it is equivalent to
desktop, and collapsed content carries full ranking weight. So crawlability alone does not rule
out a server-rendered hidden branch. What rules that out is §7.6.

## 7.5 Not a lightbox, gallery overlay, carousel or filmstrip for the projects

A carousel hides n−1 of n at all times, which is the same defect as today with more JavaScript
— on a project that has already measured what an off-screen carousel costs (a timer and a
repaint running behind eight other stops) and whose audit flags `▶ PLAY` as not reading as a
control at all.

A lightbox was rejected separately, in TASKS 24, along with a `/how does .* work/` question-shape
regex (the corpus already encodes the distinction and a regex would drift from it), a new
envelope field (`cites` already carries the signal, in order), and an interactive diagram.

## 7.6 Not an accordion, and not "an index that expands"

Ruled out by the project's own measurement, not by taste: `PLAN.md` §2 records **4,104
characters of page text already sitting inside twelve closed timeline rows against 7,903 of
total page text**, and `impeccable detect` counts it as an anti-pattern. Adding project depth
to that makes a recorded defect worse. NN/g's qualitative finding — "valuable content hidden
under an accordion may be missed altogether" — points the same way.

TASKS 34 also tested and rejected an in-place expander on the cards: §04's accordion already
puts more than half its text behind a tap, and the answer delivers the same facts better.

**Honest qualification:** a server-rendered collapsed branch *would* discharge the
"reachable without asking" rule — it is in the HTML, so it is crawlable. **Routes are the best
option, not the only legal one**, and that distinction matters if the route work ever proves
too expensive.

## 7.7 Not a camera path along the existing dendrites

Measured, and each fact on its own is disqualifying:

- A whole tuft reaches **6.40–9.69 units** from its spine node against a **10.59-unit** mean
  segment; sub-branch segments are **1.32 units**. Flying "down a branch" is about 2.6 units of
  new travel and then it ends. It is a tuft, not a corridor.
- On mobile the branch is **one node long** (`subBranchDepth: 2`); measured zero depth-3 nodes
  against 115 on desktop.
- Positions are stable per reload but **not per device**, and `growGW` consumes rng in a
  data-dependent order, so changing `subBranchProb`, `subLenDecay` or `subBranchDepth` re-rolls
  every position after the first divergence. A camera stop named against a sub-node moves when
  someone tunes the scene.
- **The filaments sway and the spine deliberately does not.** `depthAmp = [0, 0.12, 0.28, 0.42]`
  by branch order; spine nodes get amp 0. `curves.ts` states the reason without ambiguity:
  "Spine axons connect two amp-0 spine nodes => no sway, so the camera path stays stable."
- You cannot choose which node has a branch: `parent = 1 + floor(rng() * (M-1))`, node 0 never
  gets one, and the distribution is lumpy.

**The scene draws the metaphor, not the mechanism.** That is still worth a lot — a branch
entrance reads as native rather than bolted on. What it does not supply is a free camera path.

**What would change the answer**: a `buildBranch(originIndex, m)` beside `buildWaypoints` —
deterministic, amp 0 like the spine, segments sized like spine segments, rendered through the
same `makeCurve` / `tubeWithTangent` / `tubeMat`. About 40 lines plus a piecewise `sampleSeg`.
Not expensive, but new structure rather than reuse, and **`M` stops being the stop count**,
which is the genuinely invasive part. Increment-3-of-Phase-3 material at most, and only if a
parked camera reads flat at a route.

## 7.8 Not a stop for TallyBridge, the outreach engine, or Artha

One memory and no asset is a tile. **A stop with an empty media column advertises less than a
card does.**

## 7.9 Not a route for MruNN

MJK, 2026-09-05: no clients yet. A build with no users is a legitimate capability
demonstration, and a route would be a page promising depth it does not have. When there is a
client, it earns a route.

## 7.10 Not autoplay and not `loop` on the ERP video

An autoplaying 20–40s loop on a scroll page hits all three conditions of WCAG 2.2.2 (Level A),
which makes a pause control mandatory; poster-plus-play satisfies the criterion by construction
because the visitor starts it. Autoplay is also unreliable across engines, so the
poster-plus-play fallback has to exist regardless — build only it. And no `loop`: a demo that
silently restarts is an irritant, and a loop is what drags 2.2.2 back into scope.

## 7.11 Not 640x640 or CRF 30 for a screen capture

The existing JewelAI clip is 230,314 bytes at 640x640, h264 CRF 30. A screen capture is the
opposite content class: temporally cheaper, spatially far more demanding, because sharp UI text
is exactly what high-CRF h264 smears. **Legible UI text is the whole deliverable**; an
unreadable ERP demo is worse than a screenshot. If it lands over 2.5 MB, cut duration, not
quality.

## 7.12 Not appending any stop after `contact`

It would take the terminal pullback away from `contact` and bring back the pale frame
`PLAN.md` §4.5 fixed. §2.2.

## 7.13 Not touching the seed `20260723`

It is the spine generator's seed and it is independent of n. Changing it moves every filament,
node cluster and dust mote in the scene, for nothing.

## 7.14 Not writing a word about the two websites until G1 lands

Not a stop, not a route, **not a tile**. A tile whose caption says nothing is worse than no
tile.

## 7.15 Not relying on the chat to carry any project's existence

Site-embedded live chat engages 5–15% of visitors — **RETRACTED 2026-09-05: traced to an unattributed editorial page citing no dataset, vendor, sample size or year. The checkable anchors are 0.84% (Smartsupp, 4.78bn visits) and 0.5% (GA4 demo store); the honest estimate is 2–8% of sessions.** The original claim was an aggregated practitioner benchmark, not a
primary vendor number — and **no source anywhere publishes "% of site visitors who engage an
on-page AI chat"**. Compound it with roughly half of sessions never reaching half the page and
the chat's reach on a portfolio is single digits.

And the site's own constitution already settles it: **anything a question can reveal must also
be reachable without asking.** That rule was written for exactly this temptation.

> **The chat carries DETAIL. The scroll must carry EXISTENCE.**

That is the real diagnosis of TASKS 40, and it is not the column arithmetic: seventeen of the
nineteen `work` memories are currently reachable *only* by asking. The site is in violation of
its own rule and the 653px column is the symptom.

## 7.16 Not a first-run overlay or tutorial for the new sections

Tested and rejected in TASKS 34: NN/g's controlled test at n=70 found task success unchanged
and perceived ease **worse** with the tutorial, 4.92 against 5.49, p=.047.

And one number that was quoted in support of the opposite conclusion is **retracted**: the
"attract loop lost by 90% over 502 sessions" figure has no primary source and must not be
repeated. What survives is the direction — the honeypot effect, Wouters/Downs et al., DIS 2016
— and the closest measured analogue, 8.6s passive against 20.9s interactive on *dwell time*,
whose authorship could not be cleanly confirmed. The 502 sessions belong to a different study
(Müller et al., "Looking Glass", CHI 2012).

**Applied here**: a branch entrance that is a static `Read the case study →` **is** an attract
loop. What outperformed it was visible reactivity. So the entrance is built from what the page
already does — a figure that is the proof, two cards that are two real questions, a computed
count, and one quiet link. §1.2.
---

# 8. WHAT IS NOT VERIFIED

This project treats an honest "not verified" as more valuable than a confident guess, so this
section is the important one to read before quoting anything above.

## 8.1 Not verified by me, and it matters

- **I did not run the site, and I took no screenshot.** Every DOM, layout, height and viewport
  number in this spec is read from the repo's own recorded measurements or from its CSS, not
  re-measured. That includes the 653px §07 column, the 517px readable band, the 332px pair
  height and every panel height in §2.7's table. **The §07 index fit (risk rank 1) is
  therefore an estimate.**
- **No scene number here was re-measured.** The luminance, contrast and pixel-coverage figures
  in §2.1 are quoted only in order to say that they die. Do not read the fact that they are
  written down as a claim that they still hold.
- **The flight-clamp arithmetic in §2.4 is arithmetic**, on the file's own two recorded data
  points (844px/370ms → peak 65; 7,821px/820ms → peak 274, both giving k ≈ 1.71 x mean). It
  has not been re-measured in a browser by me or by the research.
- **The camera and field arithmetic in §2.1, §2.2 and §2.6 comes from the research
  re-implementing `buildWaypoints`, `secondary` and `growGW` and running them.** That is
  stronger than an estimate and weaker than a screenshot. I did not re-run it.
- **The mobile order flip has never been tested on any existing stop**, and §04's timeline
  above its own explanation is the case most likely to read badly.
- **`AnswerPortal`'s dock fallback on a route is a code comment, not a test.** If it is wrong,
  an answer asked on `/work/jewelai` renders nowhere and nothing notices.

## 8.2 Verified by me, and how far it goes

The routing, card and prompt numbers in §2.5, §3.3 and §4.6 **were measured**, not estimated:
by importing the live `lib/retrieve.ts`, taking its real hit lists for each question, and
re-running `vote()`'s own arithmetic with a simulated `stopId` remap. §9 gives the method.

What that is good for and what it is not:

- **It is a faithful simulation of `vote()`**, because the remap changes only which stop a hit
  belongs to, and `vote()` reads nothing else. The scores are the real scores.
- **It does not run the real test files.** It reproduces their assertions; it does not execute
  them. Run `npm test` before believing any of it.
- **Every measurement was taken with no viewport prior** except the card and prompt checks,
  which set `viewing` because those code paths always do. On the live page a visitor parked on
  §08 asking a JewelAI question should get a *higher* share, not lower, so the real numbers
  should be no worse. **Not verified.**
- **The buyer questions are only partly covered.** Several are decided by the `engaged`
  override rather than by the vote, and the simulation cannot see that path. `do you build
  chatbots` was measured going from `work`(0.59) to `work`(0.33) — still an offer stop, still
  topical, so still answered, but no longer confident. **Run the real suite for these.**
- **The `claims.test.ts` check in §4 re-implements that file's `MAGNITUDE` regex, `normalise()`
  and `RETIRED_CLAIMS` patterns verbatim against the live `content/memories.yaml`.** It does
  not run the file. Two magnitudes fire and both are licensed: "an image"
  (`jewelai-platform`: "the video animates an image the pipeline has already generated") and
  "A finished catalogue image" (`photoshoot-how-it-works`, verbatim).

## 8.3 Carried forward from the research, unverified there too

- **No published dataset indexes scroll drop-off by chapter count**, and none compares
  optional-depth against forced-linear on portfolio or case-study pages. MJK's drop-off premise
  is untested in the literature. The research searched for it and did not manufacture a number.
- **No published CTR exists for optional "read more" / "see case study" affordances.** So
  nobody can say what fraction will take a route link — only how to make it more likely.
- **The video file-size target (≤ 1.5 MB / 30s / 1280x720 / CRF 24–26) is an estimate from
  encoding heuristics, not a test encode**, and no benchmarked source exists on UI-text
  legibility at specific CRF values.
- **iOS Low Power Mode's effect on autoplay is developer consensus**, with no Apple primary
  source found.
- **The Apple iPhone page's 12–15 block count is the researcher's own observation of the live
  page**, not a cited teardown.
- **Two citations rest on secondary summaries rather than the primary text**: the Looking Glass
  CHI 2012 figures (the PDF would not render) and The Pudding's IVF piece mechanics (press
  coverage only).
- **The "~90%" attract-loop figure is retracted.** No primary source. Do not repeat it.

## 8.4 Two counts in the research that are wrong, corrected here

Small, but they are the kind of thing that gets quoted:

- `evals/tier-a/routing-table.ts` has **64 rows, of which 10 expect `work`** — not 72 and 11.
  Counted in the file. It matters because `MIN_ACCURACY = 0.9` at 64 rows allows six misses,
  and the hedge cap allows six hedges, and this spec spends five of them.
- The research's load-bearing grep list misses two files that **fail loudly** on a stop-count
  change: `scripts/check-corpus.ts:51` (`SECTIONS_FOR_STOP` is a
  `Record<Exclude<StopId,'hero'>, …>`, so `npm run typecheck` fails until the three new stops
  are added) and `evals/tier-a/stops.test.ts`'s `ANSWERABLE_STOP_IDS` length assertion. It also
  misses `content/static-copy.ts`'s `stopPrompts` and the two all-or-nothing gates in
  `cards.test.ts` and `voice.test.ts` (§2.5).
---

# 9. HOW THE MEASUREMENTS IN THIS SPEC WERE TAKEN

So they can be re-run, and so a disagreement can be settled by re-running rather than by
argument. **Nothing below writes to the repository.** Every script lives in the session
scratchpad and is executed with the repo's own `tsx` from the repo root, so that bare imports
resolve:

    cd D:/Projects/MJK_port_web/mjk-folio
    node_modules/.bin/tsx -e "$(cat <scratchpad>/<script>.ts)"

The scripts are left in the scratchpad beside this file:

| script | what it produced |
|---|---|
| `vote-sim.ts` | the first pass: which of the 64 routing rows have a remapped memory in their hit list at all, and what each row's share becomes |
| `variants.ts` | the three-way comparison — baseline, full split, deep-only split — with per-row misses and hedges |
| `final.ts` | §2.5's headline: full split with three re-expectations, 64/64 accuracy, 5 hedges, exact shares to four places |
| `newrows.ts` | §3.3's twelve new routing rows, and the one rejected candidate |
| `cards.ts` | **the measurement that decided the split.** All 43 cardable memories under both variants |
| `prompts.ts` | §4.6 — every existing prompt re-checked, and every candidate for the four changed stops |
| `claimcheck.ts` | §4 — the `MAGNITUDE` / `RETIRED_CLAIMS` scan over every authored string in this spec |
| `hits.ts` | the per-question hit dumps quoted in §2.5 |

## 9.1 The method for the vote simulation

1. Call the live `retrieve(question)` (or `retrieve(question, { viewing })` where the real code
   path sets it) and take `hits`, which carry the real BM25 scores.
2. Re-map each hit's `stopId` through the twelve-entry table in §3.2.
3. Re-run `vote()`'s arithmetic verbatim — `m = best + 0.35 * sum(rest)` per stop,
   `share = winner / total`, `hero` excluded.
4. Compare against the expected stop and against `MIN_SHARE = 0.5`.

**Where the simulation is faithful**: the remap changes only which stop a hit belongs to, and
`vote()` reads nothing else. The scores are the real scores from the real index.

**Where it is not**: rows whose `retrieve()` result differs from the raw vote were skipped, because
those went through the `engaged` override and the remap cannot touch them. That is why the
buyer questions are only partly covered (§8.2).

## 9.2 The method for the claims check

`claimcheck.ts` copies `evals/tier-a/claims.test.ts`'s `QUANT`, `UNIT`, `MAGNITUDE`,
`normalise()` and the six `RETIRED_CLAIMS` patterns verbatim, reads the live
`content/memories.yaml`, and runs every authored string in §4 through both. It does **not**
execute the test file. Result: two magnitudes fire, both licensed; no retired claim fires.

## 9.3 What to re-run, and when

| after | run |
|---|---|
| any `stopId` change in `content/memories.yaml` | `npm test` — all of it, not `routing.test.ts` alone. `cards.test.ts` and `voice.test.ts` are the ones that will surprise you |
| any authored-copy change | `npm test` plus `npm run corpus:check` |
| any change to `STOP_SUPPORT`, `MIN_SHARE`, `MIN_TOP_SCORE` or `ALIASES` | `npm run route:eval` and **read the misses, not the percentage**. Then re-run `cards.ts` and `prompts.ts` from this scratchpad, because those two gates have no tolerance |
| any stop added or removed | everything above, plus the full re-measurement pass (§2.1) |

---

## Closing note

Three things in this spec are worth more than the rest of it:

1. **`cards.test.ts` decides the split**, and it decides it against the intuitive answer.
   Keeping the one-line project summaries on the index reads better and fails.
2. **The binding CI constraint is the hedge ratio, not `MIN_ACCURACY`.** Five of six slots are
   spent by this change.
3. **The re-measurement pass has no test, no symptom and no deadline**, which is exactly why it
   is the thing most likely to be skipped — and skipping it leaves the repo quoting numbers
   about a scene that no longer exists.
