# Plan and specification

Written 2026-09-03 against the deployment at https://mjk.nila.li, and levelled with the
build on **2026-09-06**. Branch `fix/unbreak-build-and-facts`, which auto-deploys on push.

**The site is twelve stops now, not nine.** Every figure below taken at nine stops is
marked, because `mulberry32(0x5eed ^ M)` re-rolls the whole secondary field when the stop
count changes, so a nine-stop screenshot number is a measurement of a scene that no longer
exists. Layout numbers taken at nine stops survive only where the section itself did not
move.

`DESIGN.md` is the authority on design questions and this file does not overrule it. This
is the schedule and the specification: what was measured, what shipped, what is specified
but not yet built, and what is deliberately not being built.

Every number below was measured on a running build. Where a claim could not be
reproduced, it says so rather than repeating the original figure.

---

## 1. What the site is, and what it is for

A long-scroll editorial over a full-screen three.js network that the camera travels as
you scroll. **Twelve** authored sections. A persistent input at the foot of the page: a
question is routed deterministically to a section, the page flies there, a layout
envelope arrives, and a model streams prose into that section which is checked against a
written corpus before the visitor sees it. The model has authority over neither layout
nor subject.

Its purpose is commercial. It exists to win MJK consulting and AI systems work.

Three visitor modes run at once, and the tension between the first two is resolved by one
rule.

| Mode | What it is |
|---|---|
| Experience | The scene, the travel, the light |
| Read | Twelve authored sections of prose |
| Operate | The input, and the answer that docks into a section |

> The scene and the words occupy the same space, and neither may mask the other.

---

## 2. What this round measured

Three research passes and one adversarial panel ran against the live site. The findings
that changed what we build:

**The phone was not rendering its photographs.** `.media-zone` carries `align-self:
center` so that on a desktop the media sits against the middle of the text beside it.
Below 900px the container becomes `flex-direction: column`, where the cross axis is the
horizontal one, so the same declaration meant "shrink to content". Measured at 390px: the
RD 350 carousel was 132px wide with an 82px image, against 351px after the fix. The site's
only photography, in the one section that is not words, was rendering at a third of the
column on every phone. This was most of what "mobile looks very text heavy" was
describing, and it was a one-line cause.

**The dock veil was measured in the wrong units.** It was solid for its bottom 58% and
feathered above, which covers a one-line prompt row on a desktop and none of a four-line
one on a phone. The panel measured every contact affordance on §08 as illegible, and
screenshots show the timeline's "Omnicom Group" and the next section's title printing
through the prompt chips. Now specified in pixels from the dock's own top edge.

**Programmatic scroll had no controls.** `scrollIntoView({behavior:'smooth'})` crossed
5,690px in 1,488ms with no say over duration or curve. The replacement tween crosses the
same distance in 745ms. A second finding, that the flight ran at a 95th-percentile frame
gap of 86ms, could **not** be reproduced on a warm localhost production build, where both
the native scroll and the tween hold a clean 60fps. The halo trim shipped anyway: the
reasoning behind it is sound and its cost at rest is zero. The 86ms figure should not be
repeated as fact until it is reproduced.

**Static SVG is free; perpetual animation is not.** Measured at 375×812 with a figure
injected into all nine stops, CPU throttled 4×: baseline p95 24.6ms, static SVG 24.9ms
(inside noise), looping `stroke-dashoffset` 25.5ms with the worst frame going 66ms to
92ms and framerate down 11%. The budget rule is that blur radius squared times area is
what costs, and geometry is free.

**Half the page's prose is inside collapsed timeline entries.** Measured on the rendered
page: 4,104 characters sit in the twelve closed rows of §04 and another 983 in their
summaries, against 7,903 characters of page text in total. `impeccable detect` crossed its
threshold on that ratio during this round and now reports it as a third anti-pattern
against a baseline of two — verified by building the pre-session commit and running the
same detector against it. The mechanism is the accordion itself and is unchanged; nothing
this round put text into it. Whether a career's detail should be one tap away from a
crawler is a decision about the timeline, and it is MJK's.

**Five of nine sections run past the dock on a phone**, measured at 390×844 with a 214px
dock. **Both halves of that instrument have since moved** — there are twelve stops, and the
dock measures **147px at 390x664 and 143px at every desktop width, identical across all
twelve stops** (re-taken 2026-09-06). The table stands as the measurement that identified
the sparse/dense imbalance; it is **not** a current spill figure. What replaced it is a
count of elements sitting under the dock at each stop's own top — the position a routed
flight lands on — at 390x664: **asanjo 9, apac 6, now 4, work 4, contact 4 (including the
email address), jewelai 3, rd350 3, mrunn 1**; at 1280x720, **hero 1 and jewelai 1**.

Spill past the dock's top edge, with the section scrolled to the top of the viewport,
**at nine stops, 390×844, 214px dock**:

| Section | Panel height | Spill |
|---|---|---|
| hero, origin, engineering, pivot | 844 | fits, 92–183px spare |
| rd350 | 981 | 113 |
| work | 1062 | 194 |
| now | 1079 | 211 |
| contact | 1216 | 348 |
| apac | 1371 | 503 |

The four text-only sections are *sparse* and the five composed ones are *dense*. The
imbalance is the problem, not the total word count.

---

## 3. Shipped this round

| Change | Evidence |
|---|---|
| Media column stretches on phones | Carousel 132px → 351px at 390 wide; desktop unchanged at 581px |
| Dock veil measured in pixels | Screenshots at §04 and §05 show no text over the prompt row |
| `lib/flight.ts` replaces `scrollIntoView` | 5,690px in 745ms against 1,488ms; cancels on wheel, touch, key |
| Halo trimmed during flight | `html[data-flying]` borrows the phone's values; zero cost at rest |
| Model housekeeping stripped from answers | One answer in eight opened with "User Safety: safe" |
| Buying questions route to contact | Six probe questions, all previously refused |
| Prompts stay after an answer | Also removes a nine-section relayout |
| Caret blinks instead of breathing | 1.06s `steps(1)` against a 2s ramp it never finished |
| Press states on every control | Touch had no press feedback at all |
| Word-boundary streaming | Deltas arrived as clumps such as `" client success and ad"` |
| Carousel stops off-screen | Was a timer and a repaint behind eight other stops |
| §02 has its artefact | The 2010 Visual Basic engine simulator, the oldest thing on the site |
| §05 opens on a before/after | Two photographs registered by homography, dragged by the visitor |
| Stacked column gap 48px → 26px | 22px back for each of the five sections that overrun the dock |
| Model stops naming its sources | "From my memory I do", "in the available context", "documented in the records" |
| Answers land in view on a phone | §07 flew into place with only its static cards on screen |
| The dek matches the answer | "What that looked like in numbers" over a paragraph with no numbers |
| "CTA" off the conversion screen | A marketing word for the card, printed above the card |
| Contact links above the cards | Every outbound path on the site was off the bottom of a phone screen |
| Scene arrives once | Two hard cuts with a 1,506ms frozen task between them |
| Far network dropped on phones | 3.4% of its nodes ever visible, for a third of the scene's wire payload (n=9; the coverage figures were not re-taken at twelve stops) |

---

## 4. Specified, not yet built

### 4.1 The §02 unit chart — built, judged, withdrawn

A unit chart of the Airbus project's two cabin fits (100 marks against 28, at one pitch,
cased rather than haloed) was built and put on the page beside the engine simulator, and
the two were looked at together at 1440 and 390. The chart works and survives the scene.
It was withdrawn anyway, for two reasons that were only visible once rendered: it draws a
sentence that is already in the paragraph, and the second column it needs cut the text to
five words a line and took §02 from 896px to 1,262px on a phone. A portfolio whose
measured weakness is proof spends its one figure on evidence.

It is recoverable from the history of this branch if that call turns out to be wrong.

### 4.2 Callouts on the RD 350 photographs

The corpus names four parts made in-house: seat, tank, handlebar, headlight bracket. This
is the only true annotated diagram the corpus licenses, and the only place a callout has a
real object to point at. Four fixed labels on a fixed photograph is CSS absolute
positioning and no dependency. Build after 4.1.

### 4.3 One dot grid at §07

*150 of 172 decisions were architectural* — a real numerator over a real denominator,
third-party measured. 172 marks, 150 filled. Same rendering rules as 4.1.

### 4.4 Mobile density

With the photographs fixed, what remains is the sparse/dense imbalance in §2. Candidate
moves, in order of confidence:

1. §02 now carries a figure, so §01 and §03 are the only remaining text-only screens and
   the case for merging them is weaker than it was. Revisit after MJK has seen the figure.
2. **Not** a collapsed timeline. §04 is 1,349px on a phone and it is the longest section,
   but the research is explicit that the rail is already the best thing on the page and
   should not be added to or hidden behind a tap.
3. `contact` is still 1,194px against a 630px readable band. The links now come first, so
   the section works on a phone even though it does not fit on one screen.

### 4.5 The §08 light — ~~specified~~ **BUILT, and this entry was stale**

The contact stop's camera parked a bloom behind both columns, so a side-weighted reading
light had nothing to weight toward and the whole frame read pale. It was the one screen
that looked like a different website. A waypoint move, not a shader change.

**It shipped in `9ccb970`**, and `lib/mind/waypoints.ts:57-73` carries the reasoning: the
last vantage is pulled nine units back along its own segment — one segment's worth — so the
terminal soma is seen from the distance the other eight are, with `lookAt` still on it.
Sitting in "not yet built" while the code shipped is the same class of error as §6.2's
claim that LinkedIn was absent, and it was found the same way — by an agent reading the
code rather than the document.

**One honest caveat on its number.** The 127.6 → 92.2 whole-frame luminance recorded for
that fix is convention-dependent: a later instrument, measuring the same stop, reads 22.3
on desktop and 27.8 on a phone and does not reproduce the 92.2 scale. That does not make
the fix wrong — the pullback is structural and is now asserted by a test that the last stop
is `contact` — but **do not quote 92.2 against a different instrument.**

**Re-checked at twelve stops, 2026-09-06.** Three project stops were inserted before
`contact`, so the terminal rule moved from `V[8]` to `V[11]` and had to be confirmed to have
followed. Whole-frame mean luminance at each stop's own top, desktop, same instrument
throughout: **`contact` 24.5 against `rd350` 38.8**, and `contact` is the fourth-darkest of
the twelve frames, where it was the third-darkest of nine. The pullback followed. It is not
a pale frame and it is not the brightest; the brightest are `rd350`, `asanjo` and `jewelai`,
which are the three stops carrying photographs.

### 4.6 One judgement for MJK's eye

Removing the far network changed exactly one frame visibly: `contact` at 375, whole-frame
luminance 127.6 to 92.2 — **on the instrument §4.5 twelve lines above has already told you
not to quote.** Repeating it flat, in the same file, below its own caveat, is how a
retracted number survives: it is quoted with no caveat in **nine places** across this repo.
Read the pair as a *direction*, not a scale. The measurement says what goes is a flat
brightening haze over
an already-pale frame rather than structure, and that the stop holds more depth without
it. That is the one call worth overruling on sight.

**Both numbers in that paragraph are n=9 and neither has been re-taken.** `mulberry32(0x5eed
^ M)` seeds the whole secondary field, so the twelve-stop spine re-rolled every filament,
midground cluster and dust mote the comparison was made against. The judgement may well
still hold — it is about a haze rather than about a specific pixel — but it is a
measurement of a scene that no longer exists and must not be quoted as a current one.

### 4.7 `JewelGates` into §06 — measured, conditional, not built

`components/stops/JewelGates.tsx` is a confirmed dead file (`knip`). Two independent panels
recommended swapping it into §06 in place of that stop's two cards. **It does not fit, and
it breaks a gate**, and both were found by measuring rather than by looking:

- **Pixels.** §06's slack is **11px at 1280x720, 160px at 1440x900, 286px at 1920x1080**.
  Removing the two cards frees 220px, giving **231px against the ~365px the lane needs** —
  **134px short at 1280x720**. `.panel { overflow: hidden }` above 900px *destroys* the
  excess rather than scrolling it, and the 134px destroyed is the bottom of the lane: the
  judge row, the exit row, and the caption "it is allowed to stop". That is the payload.
- **The gate.** §06's two cards are `jewelai-platform` and `jewelai-reads-the-piece`.
  Removing them takes rule-24 reach **29 → 27 against `RULE_24_FLOOR = 29`**
  (`scripts/check-corpus.ts:660`), which is an **error**, not a warning.

Three ways out, in order of preference: gate it from 1440 up; cut the lane to five rows —
in / same-piece / angles / judge / out — which costs ~150px and keeps all three exits; or
retune `--pair-h` and re-measure. Whichever is taken, **the floor change is deliberate and
its reason goes in the commit**: it trades machine-readable coverage for human-readable
evidence, and saying so is the difference between a decision and a quietly lowered number.
And §06's body already carries four of the lane's eight rows, so the body is re-cut with
it or the figure illustrates the paragraph beside it — the charge that killed the unit
chart in §4.1.

`DIRECTION.md` decision 16 is the decision this sits under.

---

## 5. Decided — do not reopen

- **No motion library.** GSAP is ruled out on licence: its npm licence field is a URL, the
  repository carries no LICENSE file, and the live text is a Webflow agreement that is
  revocable at Webflow's discretion and unilaterally amendable. A CI licence scanner
  reports UNKNOWN here, not a violation, so it will not catch this for you. anime.js and
  `motion/mini` are cleanly MIT if anything ever must move, but nothing does.
- **No charting library.** There is no maintained MIT React chart library under 15kB, and
  128 rectangles do not need one. Hand-authored SVG, 0 JS.
- **No timeline, carousel or headless UI library.** Each was evaluated; each would regress
  work already done.
- **`pretext` is not for this site.** It is a text *measurement* library, and this site
  never measures text: the collapsing bodies use `grid-template-rows: 1fr → 0fr`
  precisely so nothing has to be measured. It also points the wrong way on performance —
  the cost was raster, not layout.
- **`flowtoken` is not worth its dependencies.** Its licence is stated three ways, it is
  16 months stale, and it pulls `react-syntax-highlighter` (2.19MB unpacked) for a page
  whose answer is a plain paragraph. Measured on a phone at 4× throttle: today p95
  14.5ms, its per-word fade 30.9ms, its blur variant 51.4ms with a 247ms frame. The
  20-line version of the idea, one span per chunk fading opacity only, measures 19.1ms and
  is the version to copy if we ever want it.
- **`hyperframes` is not applicable.** It renders HTML to MP4 with Puppeteer and FFmpeg.
- **No structured output from the model.** It would hand it layout authority.
- **Fallbacks do not announce themselves.** Only a deliberate refusal does.
- **The guard's note stays off the page.** Telling a visitor their answer was checked and
  a line removed narrates the machinery to someone who came to see what MJK has built.
- **No duration-proportional timeline axis** (three months would render 7px), and **no
  beads on the spine** (the palette forbids matching the scene, so it could only be
  mimicry).
- **Body measure stays shorter than the 65–75ch standard**, because the text sits over a
  moving field.

---

## 6. Needs MJK, and blocks nothing until answered

1. **The contact address.** The site's only human contact is a hotmail address and a
   pseudonymous GitHub handle, for a Singapore AI consultancy. It is also in the JSON-LD.
2. ~~**LinkedIn.** Absent from the site.~~ **This was false when it was written, and the
   error is instructive.** `content/site.ts` has carried the LinkedIn URL since `d0b105b`
   (2 Sep), which is *a day before this file's own last edit* — and it renders three times
   on the live site. Two agents found it independently, one of them by `curl`ing the
   deployment. So a document whose header says every number in it was measured on a running
   build carried an unverified, false claim **about that build**. Describing before judging
   makes a judgement auditable; it does not make it true. Re-check the claim, not only the
   instrument.
3. **Links to the work.** ~~TallyBridge~~ **linked, `5bd17ec`.** JewelAI and MruNN-ERP
   still have no link, screenshot, repo or demo. Asanjo has a screen recording instead of a
   link, deliberately: the live storefront is not his design and must not be presented as
   his work.
4. **The Paxel report.** It borrows Y Combinator's name for authority, and occupies half
   of Selected Work; 208,803 lines and 993 commits are volume, not outcomes.
5. **Four facts about the engine simulator**, if you want the caption to say more than it
   does. It is a four-stroke compression-ignition engine specifically; it computes air
   standard efficiency, mean effective pressure, brake power, brake thermal and volumetric
   efficiency and specific fuel consumption; it was 2010; and there are parameter sweeps
   against compression and cut-off ratio. The caption says only what `memories.yaml`
   licenses, so these go in the corpus first or not at all.
5. **Fonts.** Fraunces with Inter is flagged as a saturated pairing.
6. **The hero name label**, which is a genuine eyebrow.

Three loose ends that need no decision, only time: the stock headlight is clipped at the
top of the before/after frame; §02 is 896px on an 812px phone; and `sharp` is not in
`package.json`, which is why the image-preparation scripts are not committed.

---

## 7. How work is verified

Nothing ships on assertion. Every change carries `typecheck`, `npm test`, `corpus:check`,
`route:eval`, `guard:eval`, `lint` and `build`; `npx impeccable detect` against the
deployed site, which must not rise above its current **3** — it was 2 until the collapsed
timeline pushed half the page's prose behind a tap, and that third pattern is recorded in
§2 with the character counts that produced it; screenshots at 1440×900 and 375×812 that
are actually looked at, described before they are judged; and, for anything touching the
scene or the text, a frame-time distribution rather than an average.

**And `npm run serve:check` before you believe any of it.** A server that renders a perfect
page and loads no JavaScript passes every visual check you can make against it. See
`README.md`, "When a server lies to you".

**One rule that governs editing this file and every other.** Do not edit source files
through shell one-liners: `node -e` and `perl -0pi -e` have corrupted this repository more
than once by turning `\n` into a literal newline inside a string. Use the editing tools, a
quoted heredoc, or a script that reads and writes UTF-8 explicitly.

The rest of the method — what a guard that deletes true content costs, what "it costs
nothing to render" cost and the blur-radius budget rule that came out of it, and the seven
other lessons this project has paid for — is stated once, with its measurements, in
`TASKS.md` under **"The rules this session paid for"**. It is not repeated here.
