# Task list

Rewritten 2026-09-03 as a single accurate state, replacing the append-only log it had
become. Everything MJK has raised this session is here with its status and the evidence.
`PLAN.md` holds the specification and the settled decisions; `DESIGN.md` is the authority
on design questions.

Status: `done` · `doing` · `spec'd` (researched, awaiting a decision or a build) ·
`blocked` (needs MJK) · `open`

---

## Done, on the live site

| # | What he reported | What it turned out to be |
|---|---|---|
| 1 | RD 350 before/after distorted; some images not loading | A **1.36 aspect squeeze** introduced in image preparation by a homography fitted to six wheel points. No honest registration was possible — the cameras were in different places, wheelbase over summed wheel radii being 2.95 against 2.24. Replaced by an undistorted cut. |
| 4 | Cursor repulsion running on phones | It was. The listener and its per-particle solve are off on touch now. |
| 5a | Chat box disappears while typing on a phone | The inset was computed from viewport arithmetic and applied only on events; three of five iOS event sequences left 332px of dock below the visible band. It measures its own position now, five of five. |
| 5b | Prompt row eats the phone screen | Four wrapped suggestions made the dock 32% of a 390x664 viewport. One at a time below 768px; dock 214 → 147px. |
| 6 | Verdict on `pretext`, `hyperframes`, `flowtoken` | All three rejected — see "The library decisions, re-examined" below, which is the honest version. |
| 7 | Does generative UI help | Answered per item. Not here. |
| 8 | Scroll jumps straight into speed | Every flight eases in and out; peak travel 226 → 65 px/frame on a one-stop hop, 1,028 → 274 across the page. |
| 9 | §02 too fast, then the figure disappears | The disappearance was my bug: reveal rules keyed on an attribute the rewrite stopped setting, so the aircraft drew with an invisible stroke. Fixed; 4.0s now, with a Replay control. |
| 10 | Carousel play button does nothing | The hover-pause was attached to the whole carousel, including the button that starts it. Pressing play now takes the counter 01 → 03 across 11.5s. |
| 15a | §08 duplicated | `contact-brief` was a strict subset of `contact-how-it-starts`. Deleted. |
| 15b | — | LinkedIn was already a verified fact and already in the JSON-LD, never drawn as a link. Now the fourth contact link. |
| 3a | Show the AI work | §07 leads with the supplier photograph and the catalogue frame made from it, ratios preserved to three decimals, no crop. |
| 2 | §02 should be an engine becoming the aircraft | Built: a two-stroke twin, 150 particles, then the MJK-101 traced from his own CAD render. |
| 27a | The site refused paying customers | Six of ten realistic buying enquiries came back "Not my lane. Ask what I've built." Topicality was decided by one BM25 threshold whose band had **inverted** — weakest real question 9.5, loudest off-topic 14.0 — so no threshold could work. Shape decides the other half now, and twenty buying enquiries are a standing eval. |
| 27b | The phone answer landed off the top of the screen | Four flows of four, at -51, -126, -230 and -999px, the last with **0%** of the answer on screen. The page looks again once the answer has stopped growing. Now +64, +225, +63, +64. |
| 27c | The refusal said two opposite things | "Not my lane" followed by fifteen lines about JewelAI's video pipeline. It says one thing and stops. |
| 27d | The RD 350's "before" photograph was never fetched | `clip-path: inset(0 100% 0 0)` blocks Chrome's lazy loading outright — measured at `naturalWidth: 0` indefinitely, against 780 for a `visibility: hidden` sibling. The stylesheet's comment claimed the opposite. |
| 31 | The §02 figure reverted mid-answer | It read the latest envelope, and two late paths narrow `cites` to the two memories a fallback's prose came from. Latched off the first envelope per question. Verified against the exact case with an invalid provider key: six cites then two without `mjk-101`, figure held. |
| 32 | A provider failure showed a dek and no body | The model's `error` part reached the client and `useChat` applied nothing after it — including the envelope carrying MJK's own prose. Dropped from the merged stream; the handler already owns that recovery, and `x-mjk-answer` still names what happened. |
| 19 | The aircraft was still a top-down plan | Retraced from the **isometric** render with interior structural lines and a title block, so the projection no longer changes mid-morph. Needs a visual pass. |

---

## Research landed — all four agents complete

Four research agents, dispatched 2026-09-05. All four were killed twice by process exits
and both times resumed from their own checkpoint files with no lost work — the checkpoint
protocol earned its place. **All four have now delivered; their verdicts are in "Research
verdicts, 2026-09-05" below.**

| # | Task | What it owes |
|---|---|---|
| 42 | A site inside a site | How live sites are shown on portfolios, measured; whether an iframe, a capture or a video, and what builds it |
| 43 | Animated workflow diagrams | Whether animation adds anything a static chart does not, and what draws it for what size |
| 40, 45, 46 | The architecture: how many stops, and what each carries | What the camera can absorb, where a project video sits, and the corpus gaps that block any of it |
| 44 | The opening portrait | Whether an intro gate costs more than it returns, what resolution a face needs, and the subtle version of it |

**The agents listed here before have all landed**, and their work is in the history:
11, 12, 13 (the copy) in `9daf08a`; 14 and 17 (§07's display) folded into 24 and 28;
16 (answers cut short) in `3ab6763` and `382c8a8`; 20 (the engine) in `f78b9ea`.

---

## The library decisions, re-examined

MJK asked whether these were rejected for being large, and whether the reasoning was
mapped to real-world use. Fair challenge, and size was not the deciding factor in any of
the three.

**`pretext` — rejected because there is nothing here for it to do.** It is 14 kB gzipped;
size was never the issue. It replaces `getBoundingClientRect` with cached arithmetic for
measuring *text extents*, and this site does not measure text extents — the collapsing
bodies animate `grid-template-rows: 1fr → 0fr` precisely so that nothing has to be
measured. It also points the wrong way on performance: the site's measured problem was
raster cost from `text-shadow`, not layout. And `prepare()` throws under Node, which kills
the one server-side use there might have been.

**`flowtoken` — the package is rejected; the idea is still open.** The package fails on
two counts that are not size. It statically imports two syntax highlighters, `highlight.js`
and `refractor`, for a page whose answer is a plain paragraph — that is not a trade-off,
it is paying for code that can never run. And, tested against this site's actual guard
sequence, it breaks: the guard can shorten or replace an answer after it has streamed, and
flowtoken's diffing resets whenever the text shrinks or is not a superstring, so a salvaged
answer re-animates the whole finished paragraph.

The *idea* — a per-word fade as text arrives — is a separate question and it has not been
decided. What is measured: its own per-word fade costs p95 30.9 ms on a phone at 4x
throttle against 14.5 ms today, and its blur variant 51.4 ms with a 247 ms worst frame,
which is worse than the mobile crisis this site already fixed. A 20-line version — one
span per arriving chunk, opacity only, 220 ms — measures 19.1 ms. So the aesthetic is
affordable without the dependency. **Decided against it** once the current streaming was
measured — see "Per-word fade" below. The short version: there is no lurch at the source
to smooth, and the benefit could not be measured honestly in this environment.

**`hyperframes` — not applicable, but it produced the one real find.** It renders HTML to
MP4 with Puppeteer and FFmpeg; there is no version of this site that wants that. Its font
subsetting technique does apply, and is worth ~35 kB off the critical path (below).

---

## Spec'd — researched, waiting on a decision

**Lead capture.** The recommendation is *no new form*. The chat already elicits intent and
`lib/ask/handler.ts` discards every question the moment the stream ends; the opportunity is
to keep them server-side in the Redis already provisioned — no new secret, no new
third-party processor, no client-side JavaScript. Notion is the better of the two he named
if he wants a hosted UI; Google Sheets is the one to avoid, on privacy posture and its
bearer-URL security model. **This changes what `app/privacy/page.tsx` must say, so it is
MJK's call.**

**The JewelAI figure.** Three references go in together so the model can read the piece's
structure from several angles at once; an image and a video come out. Specified as a
bundled-reference figure rather than a three-arrow fan, because the truth is "one thing
seen three ways" and his own deck draws it that way. Corpus lines written and validated.
The video needs re-encoding first: 960x960 at 5,376 kB today, 640x640 CRF 30 measured at
221 kB, SSIM 0.953.

**Section-aware suggestions.** The dock shows the same four on all nine sections, but the
site already knows which section is on screen and already uses that to resolve "more on
these?". The suggestion should be the question *this* section provokes. This is the
mechanism that makes the page and the chat one thing rather than two.

**Font subsetting.** JetBrains Mono is 40,480 preloaded bytes of a 125,472-byte critical
font payload, and all fourteen selectors using it render committed content — never model
output or visitor input — so it can carry a `text=` subset of 4–8 kB. Not taken: the risk
is a glyph outside the declared set falling back silently.

**Per-word fade on streamed answers — decided: no.** MJK asked me to look at the current
streaming and settle it. Measured:

- At the wire, the stream is already smooth: 117 chunks over 3.34s, gap p50 16ms, p95
  30ms, median 90 bytes, no compression buffering. `smoothStream` is doing its job.
- In the DOM, React commits finely too: 556 commits for a 2,379-character answer, about
  one per four characters, gap p50 0ms.

So there is no lurch at the source to smooth out. Against that, a per-word fade means one
span per word, and every span inherits the eight-layer halo that is this site's measured
raster cost — 30.9ms p95 against 14.5ms on a phone at 4x throttle. It would also be
decoration for sighted users only, since the prose is `aria-hidden` while streaming and a
visually-hidden live region carries the finished text to a screen reader.

One thing I could NOT measure, and will not pretend otherwise: whether it would *feel*
better. Headless Chromium has no GPU, so the three.js scene software-renders and saturates
the main thread — ~22,000ms of long tasks inside a 22,000ms window, and A/B-ing the halo
changed that by 40ms, which is noise. Any paint-cadence claim from that environment is
worthless. Asserting an improvement I cannot measure is exactly the "it costs nothing to
render" mistake this project has already paid for once.

That measurement also corrects an earlier claim of mine: I first reported text arriving in
206-character slabs 669ms apart. That was a 50ms poll under software rendering, not the
site's behaviour.

---

## 21. The section must match the question — `done`, one half deferred

**Reported:** asking "what can you tell me about his bits education" lands on §02, whose
title says "I drew an airliner called the MJK-101" and whose figure shows the aircraft.
Neither is about BITS. MJK: "Either headers should also be dynamically generated to match
the question for the relevant section or it needs to be more generic. Also in this section
if the question is about bits then show the engine isometric and if brunel then the
airplane right? gen ui can help with this? Lets make it properly relevant right?"

He is right, and the second half is the more interesting one. §02's figure ALREADY holds
both states — it is a two-stroke engine that becomes the MJK-101 — and it simply always
rests on the aircraft. Letting retrieval choose which state it rests on is generative UI
of exactly the kind this site allows: the choice comes from the memory ids the answer was
licensed by, so it is deterministic and the model has no say in it, which is the rule the
whole architecture is built on.

**Done: the figure follows the answer.** Verified end to end — the BITS question rests on
the engine with 90 engine paths and no aircraft; the Brunel question rests on the aircraft
with none. The caption follows too. A routing miss surfaced on the way: "tell me about the
aircraft you designed at Brunel" was landing on §01, because the arc summary there names
Brunel and aircraft in one sentence and outscored the aircraft's own memory.

**Done, the cheap way: the heading is general now.** "I read mechanical at BITS, then
aerospace at Brunel" spans both halves, where "I drew an airliner called the MJK-101" was
wrong for every question about the first degree — and roughly half of them are.

**Deferred: headings that follow the answer.** MJK's first option, and the stronger one.
The answer already carries a dek that was built to match what it says, so the machinery
exists; what does not is a way for a server-rendered title to know an answer has landed,
and `DESIGN.md` treats a stop's title as its identity and the anchor a flight lands on, so
replacing it is not free. Worth doing if a general title turns out not to be enough.

---

## 22. JewelAI on the page — `doing`

Nothing from JewelAI is on the site at all, and it is the strongest technical claim in the
corpus: three photographs go in together, a vision call is asked whether the geometry can
be deduced from them, a second reconciles the angles into one description, and every
generated image carries the whole set — the model is never told in words what the piece
looks like. Three references in, an image and a video out.

## 23. Workflow charts — `doing`, and the earlier answer needs revisiting

MJK asked this once before and I owe him a straight answer: "Think if makes sense to show
some of these softwares as workflow charts to make it easier to understand what I built?"

The earlier research said no, and its reason was specific: the corpus licensed none of the
interesting stations, so a pipeline diagram would have been invented boxes. **That reason
has since expired.** Reading the JewelAI codebase added six memories that name the stations
— the geometry check, the same-piece gate, the angle-diversity filter, the reconciliation
pass, the blind second description, the anatomy audit, the scored judge and its 7-of-10
bar, the failure fed back for exactly one retry. The apparel pipeline has five named agents
and a critic with a pass mark. A chart is now licensable where it was not, and the question
should be re-answered on the new material rather than on the old verdict.

## 24. Generative UI, extended — spec landed, two answers

"if people ask to see more examples can more images be shown from the database with genui?
similarly can workflows be shown with genui?"

§02 already proves the mechanism: the figure rests on the engine or the aircraft depending
on which memory licensed the answer, deterministically, with no model authority. The
question was how far that generalises.

**The line the spec draws, and it is the right one:** a question may change *which*
authored thing is showing; it may never change *how much* is showing. And anything a
question can reveal must be reachable without asking — which is what keeps it working
with JavaScript off, for a crawler, and for a visitor who never types anything.

**More images on request — no.** Not because it is hard, but because it buys nothing. A
reveal is only worth its complexity when the material is too large to show always, and
three pairs in a fixed-height stepper is the *same height* as one. The request-driven
version therefore delivers identical content at identical cost, minus discoverability. It
would also collide with `FOLLOWUP` in `lib/retrieve.ts`, which already means "the subject
is on screen" and is asserted in `evals/tier-a/viewport.test.ts`.

**A workflow figure on request — yes.** §07's media column becomes one figure with
several states rather than a stack: the evidence pair by default, the pipeline when the
answer was licensed by a pipeline memory. The signal is `cites[0]` — *ordered*, not
`includes`, because §07 holds eighteen memories of which six are JewelAI's and three the
photoshoot's, so an `includes` test over six hits would fire on almost everything.

**§07's media column is now a state machine, not a stack, and that is what resolves the
collision between three tasks.** 22, 24 and 26 were all claiming the same 581px. Measured
from `globals.css`: at 1440x900 the column has ~581px and the pair plus two cards already
takes ~627px of it, and `.panel { overflow: hidden }` destroys the excess rather than
scrolling it. Anything *added* to that column silently deletes something else. Anything
that is a *state* of it costs nothing.

**Not building:** a lightbox or gallery overlay; a `/how does .* work/` question-shape
regex, because the corpus already encodes the distinction and a regex would drift from it;
a new envelope field, because `cites` already carries the signal in order; an interactive
diagram, since `PLAN.md` §4.4 already counts the one accordion against the site.

## 25. More detail in the vectors, and the particle field — `done`

"for the engine and plane vectors can you trace and render it with more detail? also denser
and smaller particles to simulate wave particle motion between transitions? where is loop
btw? also look for libraries to help you with this."

The engine is 90 drawables and the aircraft is a 43-point silhouette plus 24 interior
lines, both deliberately sparse. The particle field is 150 dots on a straight tween. Denser
and smaller, with wave-like motion rather than point-to-point, is a different and better
brief.

On the loop: there is a **Replay** control, at the right of the caption line, once the
sequence has finished. It is deliberately quiet — 10px, dim — and if MJK could not find it
that is the answer to whether it is discoverable enough.

**Done.** The wireframe look had a cause in the generator, not in the render: it traced
with a Hough transform, which can only answer with chords, against a drawing made of arcs.
A multi-scale Hessian ridge filter finds all four fuselage frames plus the radome ring, the
nacelle ribs and the wheels, where a difference-of-Gaussians found two partial frames. The
engine's real defect was staler still — the generator's output had 112 drawables against
the module's 90, so ten revisions of corrected exhaust routing had never been regenerated
and the site was drawing the wrong pipes.

The particle field is 2,000 canvas particles against 150 SVG circles, and *cheaper*: 17.4ms
per frame during the transition against 23.2ms, at 390x844 under 4x CPU throttle. SVG dies
at 800 particles, so "denser" was unreachable in the DOM at all. The motion is one coherent
travelling wave rather than per-particle noise, because noise at 2,000 particles reads as
static. `MORPH`'s 1,433 gzipped bytes are gone — endpoints are sampled at runtime off the
paths already in the module, so the count is free and the cloud dissolves *as* the drawing
rather than tracing its boundary.

**Replay is a glyph now**, at `--color-type-muted` (8.8:1 against 5.4:1). A word set in
caption type reads as caption, which is why he could not find it. Still one run and a
control, not a loop.

**No library adopted, measured rather than asserted.** Same module with the dependency
swapped: zero-dep 1,017 bytes gzipped, `simplex-noise` +17%, `motion-dom` +67%, three's own
addon +120%, `animejs` +622%, `motion` +2,252%. Runtime spread across six noise
implementations is 0.28ms per frame against a 16.7ms budget, so nobody buys one for speed —
and the design that won needs no noise at all, which makes the cheapest of them 926 bytes
spent on nothing. Three licence findings worth keeping: `@remotion/noise` declares MIT,
ships no LICENSE, and hard-depends on a licence free only under four employees, which is
the exact GSAP failure mode; `noisejs` has no licence grant in its published tarball; and
`motion/mini` provably cannot do this job — it is WAAPI-only, so its real cost is 25 kB.

Open, and my own visual judgement rather than a measurement: **the aircraft's forward lower
fuselage is the weakest part of the drawing.** The nacelle, its pylon and the nose gear
cluster together at 300px and read closer to noise than to structure. The agent flagged two
of the three causes itself — the gear bogie is a scalloped lump because six wheels at 28
source pixels land at 7.3 units, and the nacelle ribs read as hatching. It is better than
the faceted polygon it replaces, which is why it shipped, but it is not finished.

## 26. More apparel pairs — `doing`

"while I agree not all 15, can you still do a few more? one seems way too less."

## 27. A judge panel on the whole page — `doing`

"Please use swarm to visualize, critically evaluate, research, vision and judge panel to
improve."

Three lenses on the same screenshots, kept separate so they cannot average each other out:
the prospective client with budget and thirty seconds, the designer, and the engineer and
sceptic. Real screenshots at 1440x900 and 390x664, described in words before they are
judged — two performance claims in this project were retracted because they were measured
under headless software rendering, so the panel reports no timing numbers from headless.
It ranks by what costs MJK work, and it names what is good and must not be touched.

## 28. The images are small, and the layout stops growing — `done`

"the images which really show off the work seem quite small. Why does the layout not
dynamically match screen sizes?"

I told him it stopped growing at 1460px. That was half the mechanism and the wrong half:
**it shrinks.** `max-width` caps the container, but the padding and gap are in `vw` and go
on growing after the cap binds, so they eat it from both sides. The column peaks at 589.5px
on a 1460px viewport and falls away — 556.7 at 1920, 526.3 at 2560. A 2560 monitor has 3.1x
the pixel area of a 1440 laptop and drew the photographs **9.5% narrower**; a 430px phone
drew §07's supplier frame 51% larger than a 2560 desktop did.

Fixed above 1500px only, with a fixed 72px gutter and the prose track frozen at 640px so
every extra pixel goes to the media column. The supplier photograph goes 262 → 407px at
1920 and 246 → 495px at 2560, and 1280, 1366, 1440 and both phones are untouched by
construction, because 1440x900 is the best screen on this site.

Still open from that measurement, and worth doing:

- **`object-fit: cover` throws away more than the width bug did.** Three of five RD 350
  frames are portrait inside a 4:3 hero, so **46.6% to 52.5% of each file is visible** and
  the browser was choosing which half for five different compositions at once. Half done:
  each frame now states its own crop, which was picking wrong twice — the window cut both
  exhaust tips off the frame captioned "rear · cowl", whose alt text names them, and cut
  the instrument out of "rider view". The alt strings describe the crop now rather than the
  file. What that does NOT do is recover the missing half, and nothing can at 4:3 from a
  560x900 source. Recovering it needs a taller hero, which does not fit the height budget
  below 1500px, or re-cut files — and both change what §05 is, so both are his call.
- **§05 cannot grow until the files do.** The widest source is 780x585 and the optimizer
  never upscales — asked for `w=1920` it returns the file's own size. The section MJK most
  wants larger is the one that cannot get larger. That is the wider RD 350 photograph
  already in Blocked.
- **A landmine in the `cqw` code.** `--pair-h` is declared on `.pair`, which is its own
  container — and an element is never its own query container, so `cq*` there would fall
  back to the viewport. It works only because the property is consumed on a descendant.
  Move that `height` onto `.pair` itself and the frame silently becomes 1054px.

## 29. The scene is too much seen from inside it — `done`, one band open

"the entire flashing and nueron system seems to be a bit overwhelming for some users
especially when they actually enter the scroll pathway... ideally when fully zoomed out
it's not so much of an issue, but on the path I think there is a lot happening so might
overwhelm the senses?"

The shape of the answer is in the question: not less scene, but less at close range and
during motion. The camera flies along a path through the field, and near the path the
particles are close, large, fast and bright, where the same field seen whole reads as a
structure. Two constraints pull against each other and both are measured: reduced motion
already takes pixel change from 7.88% to 0.01% on desktop and must not be weakened, and a
judge panel found the scene *nearly absent* on the phone's first screen at 1.16%. So
anything global makes one of the two worse.

**Done.** The loud thing is one object and it is literally one: the camera flies at
`spineNode + (0, 1.4, 0)` and spine somas are 2.5x a secondary node, so every segment is a
flight straight at the brightest thing in the field. The cause is structural — every
material has a far falloff and no near falloff, and three.js provides none. A proximity
term deepened by camera speed now fades the white-hot core near the camera and leaves
everything past 9 world units alone, which is the half he said was fine.

Measured on two builds differing only in the flag, scene isolated by hiding the DOM:
bright-pixel coverage at 1440x900 falls 71% at the median and 50% at the worst frame; on a
phone the median falls 58% and mean luminance 24%.

**Open: on a phone the worst band, u = 0.78 to 0.86, did not move** — 16.26% against 16.25%
of the frame above luminance 160. Whatever is bright there is not the billboard core this
touches. It is the last stretch of the path, around §08.

**Spec'd, and MJK's call: a visible intensity control.** The research is specific and it is
not a matter of taste — WCAG 2.2.2 Pause, Stop, Hide is **Level A**, applies to decorative
content through Conformance Requirement 5.2.5 Non-Interference, has no decorative
exception, and its sufficient technique is a control in the page. `prefers-reduced-motion`
satisfies 2.3.3, which is AAA. So the site has the AAA one and is missing the Level A one.
The mechanism already exists and is already measured: a button wired to
`setReducedMotion(true)`. What is his call is where it lives — the canvas and the dock are
the only two fixed elements, and the dock is already 147px of a 664px phone screen, so the
proposal is one item in the existing prompt-chip row at zero added height.

## 30. A judge panel's ranked defects — `doing`, four fixed

The panel is task 27. Its list, with status:

| # | Defect | Status |
|---|---|---|
| 1 | Six of ten buying enquiries refused by name; the eval printed 100% | **fixed** — `b22b5c0` |
| 2 | On a phone the answer lands off the top of the screen, 4 of 4 flows | **fixed** — `b333132` |
| 3 | A long answer's tail destroyed by the dock on desktop | **fixed** — `0fea4e9`; 1440x900 now 100% on all four flows |
| 4 | The refusal contradicts itself, then talks for 1,100 characters | **fixed** — `d440f43` |
| 5 | Nothing in §07 is clickable; two card descriptions clamped mid-word | the clamp is **measured and handed to task 28** — see below. The links stay blocked on MJK |
| 6 | The prompt chips have no affordance: transparent, borderless | open |
| 7 | Contact links typographically identical to the card headings beside them | open |
| 8 | §08 prints its own headline twice | open |
| 9 | §02's caption named the RD 350 beside a BITS answer | open — the vectors agent owns that file |
| 10 | The section heading is scrolled off at the moment of landing | partly — 64px of section is kept above an over-long answer, and three of four desktop flows keep the heading. Where a section has ~500px above its answer, as §02 does on a phone, the whole answer wins over the heading; the answer carries the visitor's own question in its ASKED line |
| 11 | Six of nine sections overrun the dock at 390x664 (§04 by 808px) | open |
| 12 | The scene is nearly absent on the phone's first screen | folded into 29 |
| 13 | Markdown lists render as inline hyphens | open |

Two of its own findings it retracted, and both retractions are the useful kind: a focus
measurement taken 160ms into a smooth scroll, and a contrast reading taken with the wrong
instrument (brightest pixel in a box). It also found a real defect while measuring
something else — see the RD 350's unfetched photograph in the Done table.

### The card clamp, measured — a defect traded for a defect

`-webkit-line-clamp: 2` on `.mini-card .mb` (globals.css:1280) truncates three card
descriptions **mid-word**, each wanting exactly one more line (`clientHeight` 43 against
`scrollHeight` 65). The text is already trimmed once by `firstSentence()`, so this is two
truncations stacked and the second one lands inside a word.

Measured on the built page, media-column height and slack against the readable band:

| viewport | clamp 2 · §06 / §07 | clamp 3 · §06 / §07 | cards clipped |
|---|---|---|---|
| 1440x900 (band 757) | 506 / 618 | 527 / 661 | 3 → **0** |
| 1536x864 (band 721) | 506 / 607 | 527 / 650 | 3 → 0 |
| 1280x720 (band 577) | 506 / 562, −15 slack | 527 / **605, +28 over** | 3 → 0 |
| 390x664 | 488 / 694 | 553 / 737 | 6 → 3 |

So three is right everywhere except 1280x720, where §07 already had 15px of slack and
would overflow by 28px into a rule that destroys rather than scrolls. Not shipped: this is
a height-budget decision at one viewport, and task 28 is measuring exactly that across
eight. The likely right answer makes the clamp unnecessary rather than picking a better
number for it.

### Two "the images do not load" reports, both wrong, both mine to record

An agent reported two catalogue frames still at `naturalWidth: 0` four seconds after §07
scrolled into view, and I then screenshotted §07 with all four frames empty and concluded
the stepper was broken. Both were **the standalone image optimizer resizing on first
request**. At 2.5s every frame was empty; at 9s all eight had decoded, `naturalWidth` 270
and 226, and the `w=3840` in the `src` attribute is next/image's fallback candidate — the
request actually made is `w=640`. Wait 8–9s after a cold navigation before judging an
image on this build, or you measure the optimizer rather than the page.

## 31. The motion control — `done`

WCAG 2.2.2 Pause, Stop, Hide is **Level A**, applies to decorative content through
Conformance Requirement 5.2.5 Non-Interference, has no decorative exception, and its
sufficient technique is a control *in the page*. `prefers-reduced-motion`, which this site
already honours and measures, satisfies 2.3.3 — which is AAA. So the site holds the harder
criterion and misses the mandatory one. MJK has approved building it.

## 32. Re-cut §05's sources — `doing`, approved

Three of the five RD 350 frames are portrait inside a 4:3 hero, so `object-fit: cover`
discards 47.5%–53.4% of each file. Per-frame `object-position` (task 28) made the surviving
half the *right* half; it could not make it bigger. MJK has approved re-cutting the files.

## 33. Cards advertise and then withhold — `done`

"some sections have information cutting off prematurely and user can't expand to see more
either? for example section 6 has AI agents, Engineering etc... on the left which has
sentences getting cut off - poor user experience right? We need to show what user can
explore."

He is right, and the interesting part is that the fix may not be an expander. Every card's
DOM id **is** its memory's id, and retrieval cites memory ids — so a card is already
addressable. The hypothesis being tested is that **a card is a question that has not been
asked yet**, which would make the ellipsis an invitation rather than a defect, and would
answer task 34 at the same time. Out for research and a spec.

## 34. Scroll behaviour, remapped to chat behaviour — `done`

"across the entire website have you considered how the user is ecouraged to chat about
information? How do we guide them towards chat based behaviour instead of just scroll based
typical website behavior? Always consider how this website is different and thus how we
have to remap and guide user behaviour."

The deepest question asked about this site so far. Today the whole of the teaching is a
fixed dock with four rotating suggestions; everything else trains the visitor to scroll,
because that is what every other site has trained them to do. Out for research into how
conversational rather than navigational sites teach the behaviour, with the first ten
seconds treated as the unit.

**Both moves shipped.** A card is a question that has not been asked yet (33), and the dock
now offers the four questions *this* section provokes rather than the same four everywhere.
Together they cover a section: the cards address the memories that are drawn, the chips
address the ones that are not — seventeen of nineteen on §07.

A regression came with the first and is fixed with the second: making eight cards pressable
pushed the ask field from tab stop 35 to 43, so there is a skip link now, first in the body.

Two things from the spec were **not** built, with its reasons. A first-run overlay: NN/g's
controlled test at n=70 found task success unchanged and perceived ease *worse* with the
tutorial, 4.92 against 5.49, p=.047. And an in-place expander on the cards: §04's accordion
already puts more than half its text behind a tap, and the answer delivers the same facts
better. The headline research finding also inverted a premise I had been working from — in
the only large field trial, the attract loop was the control condition and **lost by 90%**
over 502 sessions; what won was making the display visibly react to something people were
already doing, which is a better argument for section-aware chips than the height budget I
had built it on.

## 35. Design consistency, affordance and mobile — `done` in part; see 38 and 39

"please consider basic design principles along with skills are correctly applied across the
website consistently... And are the buttons for user engagement easy enough for them to
spot and use? Are you consistently auditing and maintaining mobile behaviour as well?"

A vision audit across all nine sections at four viewports, including the wide-screen mode
added this week that has never had a design pass. Carries forward the judge panel's open
items 6 and 7 — the prompt chips computing to `rgba(0,0,0,0)` with `border: 0px none` in
body-text colour beside a bordered Send button, and the contact links being typographically
identical to the card headings next to them.

## 36. How the answers are written — `done`

"Some responses from the AI are not well written... there needs to be some guide on the
language, structure of response, header, grammar etc."

Three separate defects, and the first one is diagnosed:

1. **The dek names one thing when the answer is about seven.** `dekFor` scores a licensed
   memory's title by the fraction of its 4+ letter words that appear in the answer, above a
   0.5 bar. **A one-word title scores 1.0 the moment it is mentioned at all** — so
   "TallyBridge" headed an answer that listed seven projects and mentioned it once.
2. **The prose is monotonous.** Seven sentences, six opening "I built". `system-prompt.md`
   has no writing guide, and the one MJK has already given — *no AI slop, no rhythmic
   duality-style sentences, no poetic framing for no reason* — pulls against "vary your
   openings", so the guide has to resolve that rather than paper over it.
3. **It is too short and unstructured for the room it now has.** The desktop answer area
   was widened for exactly this. `finishReason` was `stop` on all 19 measured calls and
   never `length`, so it is not a token cap: it is the prompt and the guard, and salvage
   was removing 21% of everything the model wrote.

## 37. JewelAI: what a visitor actually sees — `done`

"are the jewel AI assets and video not in place? do you need additional sections for it?
what is the plan?"

The assets are in place and the two figures are built, but they are **states** of §07's
media column rather than additions to it, so a visitor who scrolls the whole site and never
asks the right question sees nothing of JewelAI at all. That is a real gap for the strongest
technical claim in the corpus — seven of §07's eighteen memories are JewelAI's, more
material than any other project has. Out for a plan, including whether it warrants a tenth
section and what that would cost the camera path.

## 38. Mobile: four sections show only prose above the fold — `open`, the biggest one left

The audit's Tier 1 finding, and the one thing on this list that costs MJK work. At 390x664
the readable band is 517px, and in the four sections that have something to show it is spent
entirely on prose:

| § | panel | above the fold | what is lost |
|---|---|---|---|
| 02 engineering | 1067 | kicker, title, 8-line body | the whole aircraft figure and Replay |
| 04 apac | 1386 | title, body, one era label | **every timeline row** — the best component on the site |
| 05 rd350 | 1077 | kicker, title, 9-line body | **every photograph** — the only photography on the site |
| 07 work | 1266 | one frame, cut by the dock | the result, the arrow, the caption, the pager |

Widening the phone media was the fix for a different problem and it worked; this is the one
underneath it. A prospect who opens §05 on a phone, reads the title and thumbs on never sees
that he rebuilt a motorcycle. **Not attempted yet** — it is a composition decision per
section, not a CSS fix, and it deserves its own pass.

## 39. The rest of the design audit — `open`, recorded so it is not re-found

Tier 2, visible and costing trust:

- **The wide-screen mode has never had a design pass.** At 2560 content is ~9% of the frame:
  `.section-title`'s clamp tops out at 4.4rem around 1467px, so above that only the emptiness
  grows. The dock is `max-w-5xl` centred and agrees with neither the editorial column nor the
  media one — a disagreement that grows from 176px at 1440 to 307px at 2560. **The page has
  two independent horizontal systems.**
- **Hairlines disappear over the scene.** Measured per-pixel along each rule: the carousel
  frame's border is under 1.2:1 for **24% of its length**, median 1.43. The project already
  has a casing convention — `#08080c` under-strokes — applied to every SVG stroke and to no
  CSS border.
- **Two rule lengths in the same column** in §08: the links are capped at 30rem and the cards
  are not, so the right edges differ by 101px at 1440 and 522px at 2560.
- **Three controls are typographically identical to the captions beside them** — `▶ PLAY`,
  `SHOW ORIGINAL`, `↻ REPLAY`. All pass contrast; none reads as a control.
- **Tap targets under 44px** at 390x664: `.pair-nav button` 26.5x29.5 is the worst,
  `.fig-ga-replay` 27, `.answer-toggle` 33, `.carousel-toggle` 36.5, `.dock-send` 37.5.
- **"Hide the section"** reads as an offer to remove §04. The reverse of "show original" is
  "hide original".

Tier 3, cheap and untidy: seven tracking values on one 10–11px mono treatment; `#08080c` used
eleven times with no token; the 11px floor broken in three places, one of them `.fig-ga-replay`;
six figure-to-caption gaps and three caption sizes; §06's card kickers mixing subject labels
with years; ~360px of empty clickable space in a timeline row between 900 and 1600px.

**What the audit says to protect**, measured rather than asserted: the halo (body text holds
10.79:1 at p95 on the pixels it actually sits on, at the worst of six animated frames, on
every stop — nothing on the site fails a text-contrast rule); the mobile halo trim; the dock
veil; all 25 focus rings; the timeline on a phone, "the single best-executed component on the
site at any viewport"; the §02 figure sequence; the two-rule 2px radius system; and the
per-frame carousel crops.

---

# New, raised 2026-09-05

## 40. §07 is one column for four projects — `open`, and this is the real defect

"why did you remove the clothing examples and swapped with jewel AI? It shouldn't be one
for the other because then we're missing out showing off our work to clients right?"

He is right, and the swap was a symptom rather than a decision. §07 `work` carries
**nineteen corpus memories across four projects** — JewelAI Studio (seven), the apparel
photoshoot pipeline (three), MruNN-ERP (two), TallyBridge (one), plus the Paxel
assessment, the awards, the outreach engine, Artha and the build overview. Its media
column draws **one figure and two cards**. Seventeen of the nineteen are never drawn.

`WorkFigure.tsx` became a state machine because the arithmetic left no choice: 653px of
column at 1440x900, ~647px already spent by the pair plus two cards, and
`.panel { overflow: hidden }` destroys the excess rather than scrolling it. So JewelAI
could only be made visible by taking the floor away from the apparel work. The file
records that trade as "a content call, not a layout one, so it is left as MJK's" — and he
has now made it: **neither displaces the other.**

What changed is the constraint itself: "if this means more steps along the way of the
scroll that's fine... Don't constrain what we're showing because you can't fit it into the
existing few steps." So the question is no longer which figure wins one column. It is how
many stops the work deserves — task 46.

**Independent of that outcome:** the default must stop hiding the apparel work.

## 41. The JewelAI figure should read three photographs → image → video — `open`

"even with the ring example it should be 3 rings to image and then image to video right?
that's the flow and also shows that we can do just image if required."

He is right, and it is also the more truthful drawing. `JewelEvidence.tsx` draws **two**
stations today — the three references, one arrow, and a single output tile whose still is
the video's poster. The reason on file is sound as far as it goes: the generated still IS
frame 0 of the clip, mean absolute luma difference 3.37 of 255, so two tiles side by side
would have printed the same picture twice.

But that argues against printing it twice, not against drawing three stations. The corpus
already states the sequence: `jewelai-video` licenses "the clip starts from the still — an
image it had already made and already checked". Three marks and two arrows says what the
pipeline does, and says the second thing he wants said — **the image is a deliverable on
its own**, and a client who needs only stills can stop at the middle station.

## 42. Two websites he built — `researching`

`https://asanjokutch.org/` and `https://www.ad-symphony.com/`. "Website within website -
research how people have done this creatively as well."

**Measured first, because it decides the shape of every answer:**

| site | platform | `x-frame-options` | `frame-ancestors` | framable? |
|---|---|---|---|---|
| asanjokutch.org | Shopify | `DENY` | `'none'` | **no, and nothing on our side changes it** |
| www.ad-symphony.com | Vercel | absent | absent | yes, as of today |

So one uniform treatment is not available. Two further flags. The URL he sent carries
`preview_theme_id=186809876844`, which is a Shopify **unpublished theme preview** —
publishing that link may expose work a client has not launched, and preview links are not
durable. And **the corpus licenses nothing about either site**: no memory names them,
their stack, their dates, his role or any outcome. Nothing can be written about them until
he supplies facts. See Blocked.

## 43. Animated workflow diagrams — `researching`

"We were also supposed to have animated flowchart diagrams for the workflows i've built."

The static chart shipped: `JewelGates.tsx`, 24 inline paths, 1.4 kB, server-rendered, zero
JavaScript, drawn as a vertical lane with three exits because branching is what prose is
bad at. Task 23 is therefore closed and this is the next question rather than a repeat of
it.

What any answer has to survive: a perpetual animation measured on this page cost 11% of
framerate and took the worst frame 66ms to 92ms; WCAG 2.2.2 is Level A here; and the
cheapest node-and-edge library measured ~190x the size of what `JewelGates` draws.

## 44. An opening portrait that disperses into the network — `researching`

"'My Name is Mathew, welcome to my mind - lets chat'... a highly detailed wireframe or
ascii text or something modeled on just my head... full screen before the neural networks
loads so kinda like a loading screen... it will zoom into my head which will disperse into
particles which will fade and then the nueral network with the first step shows. Too
dramatic? Too much? or can you improve it to be qualitatively subtle while still being a
great way to guide users? Or scrap it all together?"

Two halves, and they may not deserve the same verdict. **The sentence is the most valuable
thing in the proposal** — "welcome to my mind, let's chat" is the clearest instruction this
site has ever been offered, and task 34 is precisely the problem that visitors do not know
to chat. **The mechanism is the expensive half**: `lib/mind/controller.ts` imports the
scene from an idle callback so that nine sections of prose are interactive first, and a
gate in front of it inverts that priority deliberately.

Also handed to the research, because it is the risk that sinks this kind of thing: the head
is roughly **130x200 pixels** in the frame he sent, and this repo has already shipped the
failure where detail traced below its source resolution reads as noise — the RD 350's
landing-gear bogie, six wheels at 28 source pixels. A face is the least forgiving subject
there is.

## 45. The MruNN ERP demo video — `blocked on the asset`, slot to be designed

"I also intend to record a video of Mrunn erp in action later but that's just and FYI and
you don't have to do anythign about it now."

Nothing to build yet. Recorded so the slot is designed with the architecture rather than
bolted on afterwards. The bar is the clip already on the site: 225 kB at 640x640, h264
CRF 30, `preload="none"` behind a real control.

## 46. How many stops the site should have — `researching`

"if this means more steps along the way of the scroll that's fine, but really think out the
content on the site and consider this is a portfolio demonstration... You can even extend
the neural network animation if you feel it's needed."

This unblocks 40, 42 and 45 at once, and it is the largest structural question the site has
been asked. `buildWaypoints(n)` in `lib/mind/waypoints.ts` already takes the stop count as
a parameter and generates the spine from a seeded RNG, so the scene does not hard-code
nine. What has to be established before anything moves: that appending stops leaves the
existing nine vantages bit-identical while inserting moves everything after the insertion
point; what more stops do to total scroll length and to camera speed per stop; and which
constants elsewhere in `lib/mind/` assume nine.

---

## 45b. MruNN has no clients yet — `answered`, and it changes the architecture

MJK, 2026-09-05: "Mrunn has no clients yet, so we have to work with what we have."

That closes gap G4 with a fact rather than leaving it open, and the fact has consequences
worth stating plainly rather than working around.

**MruNN is a build, not a case study.** The corpus licenses architecture only — approval
gated, GST/HSN compliant, Telegram and web, Mastra multi-agent — and there is no user, no
client, no time saved and no result, because there is nothing yet to measure. So §10 as
proposed would have been a stop that promises a case study and delivers a specification.

**Therefore it should not be one of the three routes.** Revised from the research
recommendation:

- `/work/jewelai` and `/work/apparel` keep their routes. Both have assets on disk, both have
  outcomes in the corpus, and neither needs a fact MJK does not already have.
- **MruNN becomes a stop on the spine with the video as its proof, and no route behind it.**
  A screen recording of an approval gate actually stopping something IS the evidence; it does
  not need a page of prose behind it claiming more. When there is a client, it earns a route.

This is the better answer for a second reason. A build with no users is a normal and
defensible thing for a consultancy to show — it is a capability demonstration — but only if
the page does not dress it as a delivered engagement. Saying "this is what I built, here it
is running" is stronger than an outcome section with nothing in it.

**And to be explicit, because it is the kind of thing that gets misread later: the site says
nothing at all about MruNN's client status.** MJK, 2026-09-05: "We don't have to mention the
fact that mrunn has no clients anywhere on the website right now of course." Correct, and it
is not a compromise. The corpus licenses no client claim, so none can be made; the fix is
silence, not a disclaimer. Showing the thing running and describing what it does is the whole
of it. The rule the site already follows applies unchanged — **never claim an engagement that
did not happen, and never volunteer an absence nobody asked about.** A disclaimer would be
the only way to turn a normal capability demonstration into a weakness.

Note that this differs from gap G6, where the research recommended saying "not public" about
a missing link. That is a fact a visitor is actively looking for once a project is named, and
silence there reads as evasion. Client status is not a question the page raises.

**What it needs from the corpus:** nothing new. What it needs from MJK is the recording
(task 45), and the decision about seeded demo data versus real data with the names changed.

## 44b. The portrait does not replace the hero's words — `clarification`

MJK: "just having the tone quantiser with no text is kind of confusing for new visitors
right?"

He is right that it would be, and the proposal was never that. Worth writing down because
the ambiguity was mine.

The portrait lives in the **WebGL layer**, behind the DOM, at the hero waypoint. Everything
in `content/stops.ts` for `hero` stays exactly where it is — the name, "I build AI systems",
the Krunch Labs lede and the body. The face is what the *scene* is doing at stop 0, in the
same place the particle field is doing something today. Nothing is removed and no text is
replaced.

So the two recommendations stack rather than compete: **the sentence changes** (promote the
imperative, invert scroll-first-ask-second), and **the scene's first state becomes a face**
that dissolves as the visitor scrolls. A visitor who never notices the face still reads a
hero that tells them what to do. That is the test the design has to pass, and it is worth
verifying with a vision pass rather than asserting.

## 47. The scene lags on a phone while scrolling — `open`, and it is a defect

MJK: "the animation on phone lags as we scroll."

This is a report against the live site and it outranks every feature on this list, because it
is the first thing a visitor on a phone experiences and it happens during the one gesture the
whole site is built around.

What is already known and must not be re-derived:

- The scene honours `prefers-reduced-motion` and the new motion control; measured pixel change
  1.16% to 0.00% on a phone.
- `far-network.json` (67 kB, 4,664 nodes) is **not requested at all** on the mobile tier.
- The mobile tier already cuts `subMaxNodes` 720 to 200, `subBranchDepth` 3 to 2 and
  `nebulaPoints` 9000 to 2700.
- Cursor repulsion and its per-particle solve are already off on touch.
- The halo is trimmed during flight via `html[data-flying]`, and the halo was previously
  measured as the site's real raster cost — a 100ms p95 on mobile.

So the cheap wins are spent. This needs profiling rather than another guess, and the profiling
has to happen somewhere with a GPU: **this repo has already retracted two performance claims
taken under headless software rendering**, and a paint-cadence number from that environment is
worthless. Whatever is measured must say where it was measured.

## 48. The mobile scene reads empty against the desktop — `open`, and it pulls against 47

MJK: "when you removed the other layes on mobile which are there on desktop it looks kind of
empty now and not as impressive as on desktop."

He is right, and it was already half-recorded: a judge panel found the scene "nearly absent on
the phone's first screen" at 1.16% pixel change, and that finding was folded into task 29 and
then partly lost when the near-falloff work closed it.

**47 and 48 are one budget, pulling in opposite directions, and that is the actual problem.**
Anything that makes the phone richer costs frames, and the phone is already dropping them. So
neither can be answered alone, and a fix for one that ignores the other is not a fix.

The interesting version of the question is not "what can be cut" — that has been done twice —
but **what is being paid for that does not show**. Density that reads on a 1440px desktop may
be noise at 390px, and a cheaper arrangement may look richer. That is a rendering-technique
question (instancing, draw-call count, overdraw, fill rate, texture bandwidth, DPR, adaptive
quality) rather than a content question, and it is where the research should go.

---

# Research verdicts, 2026-09-05

Four agents. All four were killed twice by process exits and both times resumed from their
own checkpoint files with no lost work. The full reports are in the session scratchpad as
`A-embedding.md`, `B-animated-flowcharts.md`, `C-architecture.md` and `D-intro.md`.

## A retraction, and it is mine

**The "attract loop lost by 90% over 502 sessions" figure is unsourced. Do not repeat it.**
It was quoted twice — in the task 34 write-up and again to MJK — as the argument for
section-aware chips and against a passive intro. A targeted search of the public-display
HCI literature found no primary source stating that magnitude.

What survives, and it carries the same conclusions:

- **The direction is well supported.** The honeypot effect is named and defined in Wouters,
  Downs et al., "Uncovering the Honeypot Effect", DIS 2016.
- **The closest measured analogue** is 8.6s average viewing passive against 20.9s
  interactive — about 2.4x, and on dwell time rather than interaction rate. Its authorship
  and venue could not be cleanly confirmed, so it is credible rather than settled.
- The 502 sessions belong to a different study: Müller et al., "Looking Glass", CHI 2012
  Best Paper, whose finding is that a mirrored representation of the passer-by's **own
  body** signalled interactivity better than an avatar, with noticing at about 1.2s.

The direction survives; the number does not. This repo has retracted its own measurements
for being taken in the wrong environment, and this one was never taken here at all.

## 46 and 40 — the architecture. `spec'd`

**Twelve stops on the spine, and it stops growing there — because §07 becomes an index, and
an index absorbs new work without costing a stop. Depth hangs off three of those stops as
server-rendered routes.** The extension point is a tile, not a chapter, which is what stops
this question having to be re-litigated every time MJK builds something.

**The real diagnosis of task 40, and it is not the column arithmetic.** TASKS 24's rule is
that anything a question can reveal must ALSO be reachable without asking. Seventeen of the
nineteen `work` memories are reachable **only** by asking. The site is in violation of its
own rule, and the chat is carrying content the page never shows. The 653px column is the
symptom.

That also settles whether branches duplicate the chat. A branch built as a scroll remap or
as a JS insertion is reachable only through a JS interaction — the same class of
reachability the chat already has, so those two **duplicate** it. A server-rendered route is
reachable by a crawler, by a JS-off visitor and by a pasted link, so it **completes** it.
Ranking: **routes > on-demand insertion > tree scroll > nested scroll.**

Measured, by re-implementing `buildWaypoints` and running it:

- `S[0..8]` are **bit-identical** at n=9 and n=14. Inserting moves no geometry either; it
  re-photographs later stops from vantages further down an unchanged spine.
- **Per-stop scroll distance and camera speed are invariant with n.** One section of scroll
  is one segment of about 10.5 units at any n. The flight gets longer, not faster.
- `V[8]` is the exception. The 9-unit pullback that took §08's whole-frame luminance from
  127.6 to 92.2 is attached to **the last node, not to `contact`**. Append before contact and
  it follows correctly. **Append after contact and §08 silently reverts to the pale frame.**
- **`mulberry32(0x5eed ^ M)` seeds the entire secondary field, the sub-branches, the
  midground and the dust — a different stream for every stop count.** The nine somas stay
  put; everything around them re-rolls. Every screenshot-derived number in `PLAN.md` and
  `TASKS.md` is invalidated by any change to M. This is the largest line item in the
  migration, and it is measurement work rather than code.
- **`far-network.json` is a fixed volume**, bbox z from +56.24 to -199.04. Camera z reaches
  -94.8 at n=9, -125.7 at n=12, -146.2 at n=14 and about -199 at n≈19. Comfortable to 14,
  hard ceiling around 16, after which the desktop background empties. Mobile never draws it.
- **`lib/flight.ts`'s 820ms clamp is already saturated.** The longest flight peaks at 274
  px/frame against a stated tearing threshold of about 141 — **1.94x over at n=9**, 2.67x at
  n=12. One-line fix: raise the clamp to `820*(n-1)/8`. Not re-measured in a browser; it is
  arithmetic on the file's own recorded figures.
- **`scene.ts:162` hard-codes `buildWaypoints(9)`, and nothing throws if stops are added.**
  `handle.pulse(i)` silently ignores an out-of-range index, so a routed answer landing on
  stop 9 or beyond would fire no light and log nothing, and `ScrollProgress` would map 12
  sections onto 8 camera segments. Make it structural, driven from `content/stops.ts`.
- **The existing dendrites cannot carry a camera.** The branch geometry that looked free is
  not, which is part of why routes win rather than a flight down a filament.

**The cost specific to a naive split: the routing vote.** `retrieve()` accumulates BM25 mass
per stop, and all nineteen work memories currently vote for the same one. Split `work` four
ways and that mass splits four ways; ten cases in `routing-table.ts` expect `work`, and CI
gates at `MIN_ACCURACY = 0.9`.

**On the drop-off premise.** Half holds and half does not. Forcing *reading* costs visitors —
attention decays monotonically with scroll distance in every source. But that a project stop
is a toll at all is **unverified**: no source measures the cost of *passing* a figure, only
of reading prose. And the opposite risk is the one the evidence supports — optional depth
means most visitors never see the work, and the fractions multiply badly.

> **The premise is right about the mechanism and wrong about the remedy. Do not hide the
> EXISTENCE of a project behind an optional turn. Hide only its DEPTH.**

Nielsen's progressive-disclosure guidance caps disclosure at two levels. Spine to branch is
two; a branch that itself branches is one too many.

**No published dataset measures drop-off by chapter count** on a scroll-driven page. Every
number in circulation comes from text articles where scrolling is incidental. The
recommended twelve comes from this repo's four measurable walls, not from a percentile.

## 38 — the mechanism behind it, found while measuring something else

`app/globals.css:3256-3265` sets `order: 1` on `.content-zone` at the mobile breakpoint —
**prose first, media second, on every stop, on every phone.** That single rule is what puts
the aircraft, the timeline rows and the RD 350 photographs below the fold. The desktop
already alternates via `.media-zone.left` / `.right`, so the machinery exists and is simply
not used on mobile.

Task 38 may therefore be cheaper than it is recorded as being: the lever is one declaration,
not a rebuild. It is still a per-section judgement, and **the flip has not been tested** —
screenshot it before believing it. The three new stops should be media-first on mobile from
the start, with an authored body of **2 to 4 lines, not 8**.

## 42 — the two websites. `spec'd`

**Rank 1, and the cheapest thing that gets most of the value: a hero still, the real URL as
a link, and a true caption.** Works for both sites, works at 390px, adds zero foreign hosts,
zero tab stops and zero dependencies. Measured at AVIF q50, 640x400: ad-symphony 11,668 B,
asanjokutch 18,049 B — **under 30 kB for both**, 66 kB if retina.

**Rank 2, and it gets better with a branch:** a tall full-page capture scrolled inside a
window — one `transform: translateY()` in an `overflow: hidden` box, compositor-only. At
640px wide: 69,262 B and 46,648 B. In a 581px column beside prose it is a stamp; on a branch
screen it is the point of the screen. **Hard constraint: WebP and AVIF refuse anything taller
than 16,383px** — four of six full-page captures exceeded it.

**Rank 5, a live iframe: no.** Impossible for asanjokutch, confirmed three ways, and possible
but wrong for ad-symphony.

Two build details found by looking at the captures rather than reasoning about them:
**ad-symphony's cookie banner is in the picture unless it is dismissed first**, and **the
Shopify admin Draft bar is burned into every frame of the `preview_theme_id` URL**.

Browser chrome, if wanted: hand-rolled at **751 B gzipped**, against 1,923 B for the cheapest
npm package, 7,080 B for `devices.css` and 9,919 B for `react-device-frameset`. All three
fail this repo's bar. The only part of the chrome that carries information is the URL line,
and that is a `<span>`.

## 43 — animated workflow diagrams. `spec'd`

**No library and no JavaScript.** `JewelGates` today is 735 B gzipped of markup and zero JS.
Animated it is **+129 B of markup and +674 B of CSS, still zero JS** — because `WorkFigure`
already mounts it at the moment it becomes relevant, and a CSS animation on a newly-mounted
element runs on mount. An IntersectionObserver would re-solve a problem the state machine
already solved. The JS that would otherwise have been needed measures 1,004 B gzipped and
buys nothing.

**Animate the return edge and the token. Do not animate the eight rows.** About 3 kpx of
raster against 1.02 Mpx for the full staged reveal, every animated property on Chromium's
accelerated list, and what the full version buys is a flourish that says nothing the static
lane does not already say.

`stroke-dashoffset` draw-on is **rejected**: it is not accelerated. No frame timing was
taken — headless Chromium here has no GPU, and the repo's own rule forbids quoting paint
cadence from it.

Two diagrams, not three, sharing one visual grammar.

## 44 — the opening portrait. `spec'd`, and the brief names the one family that cannot work

**A wireframe of a face fails at any resolution.** Not because the photograph is small, but
because faces are carried by **tone, not edges**, and four decades of face-perception work
say so: Davies, Ellis and Shepherd 1978 (line drawings without shading are extremely hard to
recognise even though every edge is preserved); Bruce et al. 1992 (the same drawings become
recognisable once the light and dark pattern is added back); Bruce et al. 1991 (3D surface
shape without texture is a poor identity cue); and photographic negation, which destroys
recognition while leaving every edge's size, position and extent unchanged.

So edge tracing — Canny, Hough, `imagetracerjs`, `potrace`, anything called a wireframe —
**fails**, as do SDF, depth-map displacement, and a face-landmark mesh, which is the same
mesh for everyone. What works is a **tone quantiser**: ASCII, halftone, dither, or a
luminance-sampled point cloud. Those work at surprisingly low resolution and need
**directional light far more than they need pixels**.

`MJK101Figure` works precisely because an aircraft and an engine **are** their edges. A face
is not. The RD 350 bogie failed on resolution alone; a traced face fails on both axes at once.

On resolution regardless: the frame he sent gives an inter-pupil distance of about **54 px**
against an ISO floor of 90 and best practice of 120, and its eye at 26 px reproduces the same
3.7:1 downsampling ratio that produced "closer to noise than to structure" on the bogie. The
phone original probably clears the floor at an IED of roughly 110 to 192 px, and should be
measured before anything is redesigned — the copy looks like a messaging re-encode.

**Rank 1, and it is not close: ship the sentence. It costs one string.** The instruction
already exists in `content/stops.ts`, and it is in the worst possible place three ways at
once — the *last* clause of the *last* paragraph, offering **scroll first and ask second**.
The site's own hero copy is training the behaviour task 34 exists to retrain. Promote the
imperative and invert the order. It carries no factual claim, so it passes `claims.test.ts`
by construction, and it costs zero bytes, zero frames and zero risk.

**Rank 2, the recommended shape: the portrait is the hero, it lives in the WebGL scene, and
the scroll dissolves it. No gate.** It costs 0.0px of DOM height, which is the only way to
survive 390x664; `<canvas>` is not an LCP candidate, so it can neither delay nor fake that
metric; it needs no new motion contract because it **is** the scene and `lib/motion.ts`
already covers it; no skip control is needed because there is nothing to skip; and it arrives
*after* the idle callback, once the prose is interactive — the exact inversion of the brief,
and the right way round. It is also the attract-loop winner rather than the loser: a display
that reacts to what the visitor is already doing. And it answers the open `DESIGN.md`
question about the name label being a caption on someone else's sentence.

Honest cost: it lives in `lib/mind/scene.ts`, which owns the camera, the waypoints and the
materials. It is not a weekend change. **The cheap variant** is desktop at 1500px and above
only, in the DOM, in the emptiness task 39 already records — which fixes a recorded Tier 2
defect on the way past.

**Rank 4 is the gate as described, and rank 5 — scrapping it entirely — beats it.**

---

# 47 and 48 — measured. `spec'd`

Measured in **real headed Chrome on a discrete GPU**, phone-emulated at 390x844 with touch,
scrolled with a real touch gesture rather than a scripted scroll, with `pointer: coarse`
verified true and `far-network.json` confirmed fetched **zero times** — the site's own mobile
tier. Nothing headless. Draw-call and framebuffer counts come from wrapping the live
`WebGL2RenderingContext` and are device-independent; the GPU timings come from
`EXT_disjoint_timer_query_webgl2`.

**Two caveats the report makes itself, and both are load-bearing.** The DevTools "GPU" track
is GPU-*process CPU time*, not GPU execution — only the timer query measures the latter. And
that extension is **blocklisted on Android**, so none of this can be reproduced on MJK's own
handset by any JavaScript. **Nothing here was measured on a phone.**

## Two of my own hypotheses were wrong, and one of them wasted the agent's time

- **`backdrop-filter` does not exist on this site.** It was removed; only the comments at
  `globals.css:3261` and `StopSection.tsx:283` still describe it. I named it as the prime
  suspect for scroll-correlated jank and sent the agent hunting a frame-killer that was
  already dead. **Delete those comments** — they are a trap for the next reader.
- **The halo trim is not the problem, because it worked completely.** I suggested
  `data-flying` might cover only programmatic flights, leaving manual scrolling to pay full
  price. Measured over a 6.5s touch scroll at 4x throttle: `RasterTask` **0.7ms across 2
  events**, `Layout` **1.0ms across 2**. The 7.3s of raster the halo used to cost is gone.
  `ScrollProgress` is clean.

## 47 — where the time actually goes

**It is main-thread work, and it is the scene's own render loop**: 1,835ms over 957 frames,
**46% of main-thread time**. Not raster, not layout, not the DOM.

**On the GPU it is six draw calls — but the shape is wrong for a phone:**

- **The EffectComposer's output pass costs 0.0444ms against 0.0344ms for the entire rest of
  the scene — 56% of GL time**, to run six lines of reading-light GLSL.
- Framebuffer traffic is **17.8 MB/frame, about 1.06 GB/s**, before any overdraw is counted.
- The five scene draws are **additive-blended into an RGBA16F target**. Arm's own Best
  Practices say verbatim: *"Do not use blending on floating-point framebuffers."*
- **`preserveDrawingBuffer: true` costs 22% of GPU time** across two independent run-pairs,
  and the repo contains no `toDataURL`, `toBlob` or `readPixels`. It buys nothing.

## 48 — how empty, exactly

- Mobile draws **74 somas and 8,340 filament triangles** against desktop's 5,056 and 825,322.
  That is **4.8% of the near-field filaments**, before the far network is even considered.
- **The hero frame is 96.5% pure black.**
- **`subMaxNodes` 720→200 — the headline mobile cut — buys nothing at all.** The scene only
  ever grows 49 sub-nodes, so neither cap is reached on either tier. It has been described as
  a saving in three documents and it is not one.

## Why they are one budget, and why it inverts the obvious fix

> **The budget is blended pixels, and fill is area.** A spine soma at 3 units covers 517,000
> device pixels; 2,500 sub-nodes at 30 units cover the same.

So the instinct — "fewer, larger, better-placed elements" — is the **expensive** answer here.
**"More, smaller, further out" is the cheap one.** That is the finding that lets 47 and 48 be
answered together instead of traded against each other, and it was not guessable.

## The ordered spec

All items are independent of the stop count except S8 — none of them consume `rng`, and the
spine and camera path come from `buildWaypoints`. So this work does **not** have to wait for
the twelve-stop migration, and does not add a second re-measurement pass.

| # | change | what it buys | risk |
|---|---|---|---|
| **S1** | `preserveDrawingBuffer: false` | **22% of GPU time** | none |
| **S7** | mobile `fog` 0.030→0.022 | A/B'd live: **hero coverage +26.5% above lum 20, +38.7% above 60, at zero GPU cost** | contrast-gated |
| **S4** | swap `PlaneGeometry(1,1)` for a 12-gon on the node and pulse billboards; drop the three `discard`s; `frustumCulled = false` on the three per-frame InstancedMeshes | ~19% fill at **bit-identical output** — Imagination measures a disk in a quad wasting 22% of fragments against 3% for a dodecagon | low |
| **S9** | `tubeRad` 5→8 | the pentagonal faceting is **visible** on the near axon; vertex-only cost | none |
| **S5** | `depth: false`, `depthTest: false` | nothing writes depth, so the test always passes | low |
| **S3** | wire `onFps` — already computed at `scene.ts:2120` and **thrown away** — to adaptive DPR | 1.5→1.25 is **−31% fill** | medium |
| **S6** | `sizeClampD` 0→2.5 | removes a pale wash for <2% coverage at four of five stops | MJK's eye |
| **S2** | delete the composer on mobile | **56% of GL time, 6x less framebuffer traffic**, and it stops doing the thing Arm prohibits | **highest** |
| **S10** | `precision: 'mediump'` with `highp` on distances | Arm measures ~10–25% | see below |
| **S8** | `subBranchDepth` 2→3, `t2Seeds` 10→20, shell pushed to 12–26 units | the density restore | **M-coupled** |

**Three traps inside that list, each of which would have been shipped as an improvement:**

1. **Do not remove the probe `getContext` at `scene.ts:252`.** three.js r169 *hardcodes*
   `alpha: true` in `WebGLRenderer`, so that probe is the only reason this canvas is opaque —
   measured, `getContextAttributes().alpha === false`. It reads exactly like a leftover.
2. **S3 before S2 desyncs the render targets**: `resize()` never calls
   `composer.setPixelRatio()`. Order matters. And copy `<model-viewer>`'s algorithm rather
   than inventing one.
3. **S10 cannot be validated on a desktop GPU.** `d*d` reaches 360,000 against fp16's ceiling
   of 65,504, and Arm's guidance says validating `mediump` on a desktop GPU is "worthless".

**S8 is the only item coupled to `M`** — ship it with the stop count going 9→12, not before.

## Two more, unprompted and worth having

- **`.mind-canvas` is `height: 100vh` and must stay that way.** `100vh` is the *large*
  viewport, so the URL bar cannot fire the `ResizeObserver`. `100dvh` — which any modern audit
  would propose as the fix — would reallocate two RGBA16F targets mid-gesture on iOS Safari,
  which fires `resize` while the finger is still down.
- **`globals.css:185-190` still asserts the retracted 86ms figure.** Fix the comment.

## The collisions, stated rather than smoothed over

- **Every density restore is a text-contrast risk, and the halo is protected** (body text holds
  10.79:1 at p95 on the pixels it actually sits on). The contrast measurement is the **gate**
  on the richness work, not a check afterwards.
- **S2 must RELOCATE the reading light, never delete it.** Measured: the light removes 81–96%
  of pixels above luminance 160. If a per-material version cannot hold it, **S2 dies** — the
  alternatives are a scrim, which `DESIGN.md` forbids twice and MJK rejected on sight twice,
  or three unreadable stops.
- **S3 must not run under reduced motion**, or adaptive DPR produces the one pixel-change event
  that promise forbids.

## What to do when this is shipped and the phone still stutters

**Long Animation Frames** (`long-animation-frame`, Chrome 123+) reports `blockingDuration`,
`forcedStyleAndLayoutDuration` and per-script attribution **in the field, on his actual
handset**, in about fifteen lines. If report (1) survives S1–S7, that is how to find out why
instead of guessing a third time.

---

# 48 — the vision pass, and the control that settles it

Local production build, Playwright Chromium under SwiftShader. **No timing claim appears
anywhere in this work** — composition and legibility only, which is the correct use of that
environment. Screenshots are in the session scratchpad under `research/vshots`, `pairs`,
`hero` and `ablate`.

## The measurement nobody had taken: the same phone frame with the desktop tier

A fourth viewport — **390x664 forced onto the desktop tier** (`detectTier` keys on pointer and
core count, so a fine pointer gets desktop). Same frame, same DOM, same 147px dock, same
sections. Lit coverage of the mobile tier as a share of that control:

| stop | mobile tier as % of the same frame on the desktop tier |
|---|---|
| work | **18%** |
| contact | **17%** |
| hero | **19%** |
| origin / apac / pivot | 22% / 23% / 26% |
| now / engineering | 29% / 29% |
| rd350 | 34% |

And at 390x664 **the desktop tier is brighter than the 1440 desktop at seven of nine stops** —
a narrow portrait cone through the same network fills more of its frame, not less.

> **The phone frame is not the problem. The tier is.** Every previous explanation of this —
> the small viewport, the halo, the veil — is wrong, and this single control disposes of all
> of them.

Second fact, and it is the one that matches what MJK saw: **on the phone the median pixel is
exactly the background colour at all nine stops.** On desktop that is true at one stop.

## Where the phone is worse than empty, not merely thinner

- **§07 `work` is the worst frame on the site.** Two ring photographs cut by the veil with
  every label off screen — `PHONE SNAPS · ONE PIECE`, `GENERATED`, the arrow legend, `▶ PLAY
  THE CLIP`, the caption and both cards. It reads as a half-loaded gallery rather than a
  portfolio. 5.3% lit; the frame's light is two-thirds photograph.
- **§07 and §08's scene is one flat grey disc and one grey tube on black.** That is what a 3D
  asset looks like **before the lighting is turned on** — not a stylistic reduction. With
  `bloom: false` a soma has no hot core; in a dense field its neighbours supply the contrast,
  and in an empty one it simply looks broken.
- **§06** shows a card sentence dissolving mid-word into the veil, which is the signature of a
  failed render.
- **The hero reads as a different site**: one soft disc, one trunk, eight dots, no orange, no
  dust.

Concentrated rather than uniform, and predictably so — the three collapsed stops are the three
whose camera does not park near a large tube. Origin, pivot and engineering hold up because a
fat near mesh survives every cut and fog cannot reach it.

## The DOM is innocent, measured rather than assumed

| suspect | verdict |
|---|---|
| the halo | darkens 11.9–14.8% of the phone frame against 14.5% on desktop; the phone already runs `--halo-lite`, 8 layers at 22px against 10 at 76px |
| the dock veil | keeps **77.2%** of scene luminance inside the dock band and about 100% above it; roughly 5% whole-frame cost |
| section opacity | **no longer exists** — it is `translateY(8px)` only |
| the 390px frame itself | the control above: guilty of nothing |

The dock's 147px costs *content* height, which is task 38. It does not cost scene.

## Ranked restoration, from a per-knob ablation

Each desktop value was put back one at a time by rewriting the built chunk's `mobile` literal
in flight, with no repository file touched. `hero` and `contact` are stable across runs;
`apac` swung 14.7 to 30.0 on identical config and is excluded from the ranking rather than
quoted.

1. **`secondaryPerNode` 2.0 → 5.5** — the only knob that is large at both stable stops
   (contact gradient 0.523 → 1.547, **+196%**). It is the difference between a ball on a stick
   and a neuron.
2. **A waypoint nudge at hero, work and contact to bring a trunk into frame** — not a config
   value, costs nothing, and it is the observed difference between the phone's best and worst
   stops.
3. **`nebulaPoints` 2700 → 9000** — turns black from *nothing* into *air*. Hero gradient +61%,
   and it is points rather than geometry.
4. **`bloom` on — but only after 1.** Alone it measures **zero** (0.683 against 0.691). With
   structure restored, contact goes 6.26% to 46.27% lit. It is the specific cure for the
   "unfinished 3D" reading, and it is worthless before its cause is fixed.
5. **`t2Seeds` / `t2MaxNodes` up** — the best single knob at the hero, +91% gradient. Restores
   the sense that the world continues past the edge of the frame.
6. **`fog` 0.030 → ~0.024** — zero geometry; restores the dim distant marks that carry depth.
7. **Do not re-add `farNetwork`.** Last by a distance, and the images agree with the
   measurement already recorded in `config.ts`.

**This converges with the performance work, and the convergence is the headline.** The
performance pass found that the budget is blended pixels and that fill is area, so *more,
smaller, further out* is the cheap direction and *fewer, larger* is the expensive one. The
vision pass, independently and by a different method, ranks **more small distant nodes** as
the single largest visual restoration. The cheapest fix and the best-looking fix are the same
fix.

Note that these are **mobile-tier values**, so changing them invalidates mobile screenshots
only. Desktop measurements survive.

## 2560 — the number is right and the conclusion in task 39 is not

The content box is **8.35%** of the frame at origin and pivot, which is exactly the figure
task 39 records, 12.2% at the hero and 23–34% at the composed stops. **But the frame does not
read empty** — the other 91% is the scene, and it is the best the site looks anywhere.

What actually reads wrong there is different, and worth re-recording:

- **The two horizontal systems**, about 400px apart at each edge — the input rule is visibly
  shorter than, and inset from, the caption rule directly above it.
- **`.section-title` computes 69.12px at 1440 and 70.4px at 2560** — a 1.9% increase for a 78%
  wider viewport.

That is a typographic scaling and alignment defect rather than an emptiness one, and nothing
is lost at any stop. **Lowest priority**, against how task 39 currently frames it.

# 44 — the portrait, tested against real frames

Measured room at the hero: **1440x900 leaves 631x900 free to the right** of the 736x607 ink
box. **390x664 leaves 28px to the right, minus 6px below and 27px above** — the copy already
overlaps the veil by 6px.

- **In the right gutter, it works.** A tone-quantised head at 520x693 reads unambiguously as a
  person and takes nothing from the type. **The dissolve is free**: the portrait's shoulder
  dots and the scene's nebula dust are the same mark, so the bottom already merges into the
  field with nothing designed. The 0.55-opacity version is better — at full strength it reads
  as a pasted halftone because it has no fog, which is a direct argument for building it *in*
  the scene as 44b specifies rather than compositing it in the DOM.
- **Behind the words it reads as damage — specifically as a redaction.** The title occupies
  y≈180–460, which is exactly eye height for a centred portrait, and the halo's soft-edged
  dark pool wipes a bar through the brow and the eyes. The text is unaffected; the face is
  destroyed in the one region that carries identity. **Structural, not tunable.**
- **On a phone: no, at all three placements tested.** It fails twice over — the face is
  illegible, *and* the lit cheek becomes the brightest thing on the hero, underneath six lines
  of body copy.

**Legibility threshold, from the coarse test: between ~27 and ~47 marks across the head
width** — 27 marginal, 47 clear. By free gutter that puts the breakpoint at **~1280px and
comfortable from 1366**, which is **more permissive than the >=1500px fallback recorded in 44**
and corrects it. At 2560 it would also fill the 1,401px of unused right frame that task 39
complains about — so the portrait and the wide-screen defect are one job.

# Corrections to the record

- **PLAN §4.5 does not reproduce.** §08 is the third-*darkest* desktop frame, mean 18.37
  against rd350's 38.45 — not pale. And the light is not symmetric: left column scene mean
  14.96, right column 26.02 with p90 60.59. The real condition today is that **the brightest
  region of §08 is exactly where the four outbound links sit**, and the darkest is behind the
  prose. That may be right rather than wrong; it is certainly not what the plan says.
- **Task 38 is a fold problem, not a content problem.** Scrolled 380–430px, the phone shows the
  full timeline, the complete MJK-101 figure with its specs and Replay, the whole JewelAI
  figure with every label, and the RD 350 before/after with its carousel — all four good, two
  excellent. §07 reads broken **at the fold**, which is exactly where a routed answer and a
  shared link put a visitor. Still real, but it is a first-screen defect per stop rather than
  a composition failure.

# New, found while looking for something else

**`detectTier` keys on pointer type and core count, so a touch-screen laptop at 1440px gets
the mobile tier** — and would show all of the emptiness above at desktop size, on a machine
well able to render the desktop scene. Untested, and worth someone's time.

# Protected, confirmed by looking rather than by assertion

The halo — every word readable everywhere, including over a full-strength lit cheek. The
mobile halo trim, which is **innocent of the emptiness and must not be touched while fixing
it**. The dock veil. The phone timeline. The §02 figure sequence. The §05 before/after and the
carousel crops. **And one addition: the scene's near trunks — they are the only part of the
mobile scene still working.**

**Not verified, and listed rather than glossed:** anything about performance (software
renderer, and the report makes no timing claim); a real device; dpr 3; the 25 focus rings;
contrast ratios; the dissolve in motion; MJK's actual photograph resolution; and one ablation
variant that produced blank frames and was discarded.

---

# New, raised 2026-09-05 (second round)

MJK has approved the phone work — "I'm fine with your plan to optimize phone experience" —
and it proceeds in parallel with the research below, because every item in it is independent
of the stop count and of the narrative architecture. Everything else here is out for research,
a judging panel, and a research→reason→judge→research loop before anything is built.

## 49. Is the story we are telling the one people want? — `researching`

"I want you to analyze if the whole story we're putting up for users is currently even
something people want to see? The advantage is that if people chat they can go straight to see
what they want. However if they scroll then they are presented with my airforce story, moving
to marketing and what not."

The question underneath is whether §01 to §05 — the flying dream, two engineering degrees, the
pivot, a decade of paid media, a motorcycle rebuild — earn their scroll for a visitor who came
to find out whether he can build them something. **This has never been asked.** The sections
were ported from the prototype, the copy was rewritten to carry facts, and the ORDER was never
interrogated. `PLAN.md` states the site's purpose is commercial in one line and then the
architecture spends five stops before reaching any work.

Not a rhetorical question, and the answer is not obviously "cut it". The story is what makes
the site memorable and it is the only thing on it a competitor cannot copy. But it is
currently unavoidable, and that is a decision nobody made deliberately.

## 50. A branch after step 1: the whole story, or just the work — `researching`

"if we wanted to branch it after the first step to allow users to choose between the whole
story (longer flow) or just my work (shorter flow) but both the same scroll mechanism after
the choice. If they choose the shorter flow there should be a path directly from step 1 to
step whatever where my work starts... Not sure if bioligcally nuerons have multiple
connections between two points which could make this look odd."

Distinct from task 46's branching, which hung project DEPTH off a node. This branches the
SPINE ITSELF, once, early, and rejoins.

Three things the research owes:

1. **The evidence on asking a visitor to classify themselves.** "Choose your path" is a
   pattern with a real literature and it is not uniformly positive — a choice presented before
   the visitor knows what is on offer is a choice made badly.
2. **The biological question, answered properly rather than waved at.** MJK is right to ask.
   Parallel and reciprocal connections between two neurons do exist, but whether a *shortcut
   edge* reads as anatomy or as a wiring diagram in THIS scene is a rendering question and it
   should be looked at, not reasoned about.
3. **What it costs in this codebase.** `ScrollProgress` maps the k-th section to `u =
   k/(count-1)` and `sampleSeg` maps `u` to a node. A skip is not a camera problem — it is a
   question about what the document contains, which is what makes it harder than it looks.

## 51. Key information on scroll; the rest by asking — `researching`, and it is the thesis

"making all information available on scroll... I think is not right - ideally it's all key
information on scroll so we don't lose people because of boredom before they even reach the
end... The key difference of this website is the fact that more information can be shown when
the user asks - which allows us to differentiate from most standard website where this option
doesnt exist and hence they have to show everything they can. We can choose to not show some
information but at everystep cue or encourage the habit for the user to chat and query about
things more."

This is the strongest articulation of the site's thesis anyone has written down, and it should
be treated as a design principle rather than a feature request:

> **This is literally like mimicing a conversation with me right? hence 'my mind' aspect which
> is this website being like my virtual mind? ... the idea is to make them feel like they're
> speaking with me, not with a machine. It's not just a website from that angle.**

Two consequences the research must weigh honestly rather than agree with:

- **The risk it inverts.** If a visitor does not ask, they see only what is on the scroll. The
  earlier research found on-page chat engagement in a "5–15%" band — **since RETRACTED as
  unattributed editorial; the checkable anchors are 0.84% and 0.5%, and the honest estimate is
  2–8% of sessions**. If that transfers, then
  "we can choose not to show some information" means 85–95% of visitors never see it. The
  thesis is right about the mechanism and the number decides whether it is right in practice.
  **This is the single most important number in the whole redesign** and it should be
  established as well as it can be.
- **It collides with the site's own rule** — TASKS 24: anything a question can reveal must
  ALSO be reachable without asking. Deliberately withholding from the scroll is in tension
  with that. The rule exists for crawlers and JS-off visitors. Resolve it explicitly; do not
  quietly drop it.

**And one specific proposal inside it, which needs its own answer:** *"if not can say
something like 'i'm not sure about this but i'll check and get back to you'"*. Today an
unanswerable question gets a refusal. A promise to follow up is warmer and more human — and it
is a **promise**, which means it needs a way to keep it, which means capture, which is the
lead-capture decision still sitting in Blocked. Do not build the sentence without the
mechanism behind it.

## 52. Two audiences, and they want opposite things — `researching`

"this website serves as both my protforlio of work I can do as a service and also as a means
for recruiters to consider my experience in case they want to hire me as an employee for a
full time job. Both are very different sets of questions. For example a recruiter would want
to see my overall expereince, what roles I held, what are my capabilities and so on. On the
other hand someone looking for my services may be more interested in my web design and
development work... Similarly someone may be interested in imagery or someone else in the
agentic operational capabilities."

**This has never been stated before and it reframes the whole site.** Every previous piece of
research, including the twenty-question buyer eval, optimised for one audience — the client
with a budget. A recruiter reading this site wants the timeline, the roles, the years and the
titles, which is precisely the material §04 already holds and which the buyer research treated
as backstory.

So there are at least four intents, not one: hire him permanently; commission a website;
commission imagery; commission an agentic system. The research owes a view on whether one
scroll can serve all four, whether the chat is what resolves them, and whether the site should
detect intent rather than ask for it.

## 53. What must be on the scroll for the work — `researching`, with his list

"work is definitely the most likely thing that most users would want to see hence, the images
of apparel (supplier to generated image and multiple pairs of these preferably so that we show
scale and consistency), jewel AI (3 source images, static generated image then video from that
generated image should be shown), MruNN video (can ship now as cards), paxel details, website
work (even if it's just short videos?) and more. I'm fine with having more nodes/steps for all
this however we really need to consider how best to showcase all of this without losing it
because we're afraid it will be too long and users drop off."

This confirms task 41's three-station JewelAI figure from his own mouth, confirms §10 shipping
as cards now, and adds website work as something that must be visible on the scroll rather
than only in a route.

## 54. A new corpus fact: the apparel work is for the asanjokutch client — `blocked`, partly unblocked

"the apparel imagery is for the same asanjo website, so we can take some of the story behind
the apparel from there but framed for our website's purpose of course."

**This connects two projects that the corpus holds as unrelated**, and it is materially useful:
it turns two thin claims into one substantial engagement — a storefront and the catalogue
imagery that fills it. It is the closest thing on the site to an end-to-end client story.

It also **sharpens the naming question rather than settling it.** Every other client on the
site is anonymous, the apparel memories deliberately do not name one, and `asanjokutch.org` is
a public storefront whose name is its URL. Linking the two names the client by construction.
That is MJK's call and it is now a live one — see Blocked.

What is still needed before anything is written: his role on the site, the dates, the stack,
whether the client may be named, and which theme is his (the link he sent is an unpublished
preview). The apparel side already has three corpus memories and four image pairs on disk.

---

# Clarifications, 2026-09-05 (third round)

## 44c. The intro is a timed animation, not a scroll-driven hero — `clarified`, and it changes the answer

"I didn't imagine the portriat... to be scroll driven, but more of a 3 - 5s animation showing
the text, the face, the particle combination and dispersion with affects (similar to engine to
plane) and zoom into head before then showing the neural animation and step 1. At this point
scroll is enabled and user interaction kicks in. Thats why I said it can load behind this
animation - effetively this a load screen right?"

**This closes the reconciliation I was pushing.** The proposal was that the portrait be the
hero's scene state, dissolving under the visitor's own scroll — which costs nothing and blocks
nothing. That is **not** what he is describing and it does not deliver what he wants: a held
beat, a zoom into the head, a dispersal, and only then the site. He wants a **gate**, and he
has now said so unambiguously twice. It is his site and his call, so the question stops being
*whether* and becomes *what the best possible version is*.

**The engineering consequence, and it is the one thing that must not be got wrong: a fixed
duration is not a load screen, it is a timer.** The two only coincide by luck.

- The scene chunk was measured arriving at **5.8s on Fast 3G at 375 wide**. A 3–5s animation
  ends and the visitor waits anyway.
- On a fast connection the chunk may be ready in well under a second. A 3–5s animation then
  adds **2–4 seconds of pure, invented wait** to the one metric that matters most.

So the honest version **couples the animation to the actual load state** — a floor so it never
flashes, a ceiling so it never becomes the wait, and a real completion signal from
`onMindReady` rather than a `setTimeout`. `lib/mind/controller.ts` already exposes exactly that
signal; `MotionToggle` uses it. Design it as *"play until the scene is ready, but never less
than X and never more than Y"*, not as *"play for 4 seconds"*.

**What must be specified, and none of it is optional:**

- **Scroll is disabled during it**, by his description. That is blocking, and it puts WCAG
  2.2.1 Timing Adjustable squarely in scope along with 2.2.2. A skip control is mandatory, not
  a nicety, and it must be reachable by keyboard on the first tab.
- **`prefers-reduced-motion` and the site's own motion control must shorten or remove it.** The
  scene's reduced-motion promise is measured — pixel change 7.88% to 0.01% on desktop — and an
  intro that ignores it breaks a promise the site currently keeps.
- **LCP becomes the gate's own content**, because it covers the viewport. That is the metric
  cost and it should be stated in numbers before it ships.
- **Once per visitor, or every visit?** A gate a returning visitor cannot escape is the version
  everyone regrets.
- **The one worry that does NOT apply:** the nine sections are server-rendered underneath an
  overlay, so a crawler and a JS-off visitor are unaffected. Worth stating so nobody spends
  time on it.

The face itself is unchanged by this: **tone, never edges** — a wireframe of a face fails at
any resolution, and the dispersal reuses `dust.ts`, which is 1,017 gzipped bytes with no
dependencies and already does a measured particle dissolve.

## 51b. "I'll get back to you" — a voice question, not a capture one — `unblocked`

"'Let me get back to you' doesn't have to be a blocked. We can change the message shown -
understand that my intent is to give users the impression that they're chatting with a virtual
version of me and if that version doesn't have the answer it shouldn't make up stuff and it
shouldn't act like a machine to the user."

That resolves it, and it separates two things I had wrongly fused. The **requirement** is: do
not fabricate, and do not sound like a machine. The **promise to follow up** was my reading of
his example sentence, not his requirement. So **blocked item 13 is withdrawn** and lead capture
goes back to being optional.

What is actually needed is a rewrite of the refusal and fallback voice in `lib/fallback.ts` and
`content/system-prompt.md`. The first half — not fabricating — is already enforced structurally
by the grounding guard and is the site's strongest property. The second half is copy.

**The constraint that survives: do not promise what cannot be kept.** "I'll check and get back
to you" implies a reply, and with no capture there is no reply. A sentence that admits the gap
without inventing an obligation is the target — that is a writing problem, and a solvable one.

## 54b. The client is Asanjo, and may be named — `unblocked`

"The client for apparel and website is Asanjo, we can name them no issues."

**Blocked item 12 is resolved**, and it is the most valuable unblock so far. The apparel
pipeline and `asanjokutch.org` become one engagement: a storefront, and the catalogue imagery
that fills it. That is the only end-to-end client story the site has, and it can now be told
with the client's name on it.

It also changes what §09 and `/work/apparel` are. They stop being "an apparel client" and
become a named piece of work a visitor can go and look at — the difference between a claim and
a checkable fact, which is the gap `PLAN.md` §6 has complained about since the beginning.

**Still needed before anything is written** — these are facts, not decisions, and the corpus
licenses none of them yet: his role on the website (built it, designed it, themed it, ran the
media, or all of it); the dates; the stack; any outcome he will stand behind; and **which theme
is his**, since the link he sent previews an unpublished one.

---

# 50 — the branch after step 1. `spec'd`: do not build the branch, build the jump

Three findings decide it, and the first two are specific to this codebase rather than to
branching in general.

## 1. The spine is too straight for a shortcut to be legible

Run against `buildWaypoints`' own arithmetic, seed 20260723. The chord from `S[1]` to `S[6]`
is **52.4 units against a spine path of 53.0 — 1.1% shorter — and never leaves a 3.07-unit
tube around the axon.** Identical at n=9 and n=12.

The camera sits 1.4 units off the spine, secondary nodes are seeded at r = 2.2–6.7, and
`config.ts:148` keeps the midground 9+ units clear. So a shortcut edge would run *inside* the
existing tuft shell, about 3 units from the lens, through additive billboards and fog. **It
would not read as a branch; it would read as a duplicated mesh.** Making it legible means
bowing it away from the spine, which is a subway map.

> MJK's instinct that it might look odd was right, and it is right for a **geometric** reason
> rather than a biological one.

**The biology, since he asked, and it is not the objection.** Multi-synaptic contacts, axon
collaterals, parallel fibre bundles and reciprocal connections are all ordinary, so a bundle
that leaves and rejoins is fine anatomy. The problem is topological: a chord is a **cycle**,
and this scene contains none — every filament in `growGW` is parent-to-child in an acyclic
tree off a linear spine. Being the only closed loop in the graph is what would make it read as
notation rather than tissue.

## 2. In this codebase a "skip" does not skip

`sampleSeg` normalises over `V.length - 1`, where `V` is a constant nine-waypoint array;
`ScrollProgress.progress()` normalises `u` over the sections actually in the DOM. **Two
independent denominators.** So removing sections **compresses the flight rather than
shortening it** — the short path flies all eight segments at double speed. To skip vantages
you must change `M`, and `mulberry32(0x5eed ^ M)` re-rolls the entire field, so **the two
paths would show visibly different neuron fields.**

**And every branch form breaks the chat.** `retrieve()` routes to any of the nine stopIds, and
`ChatProvider` looks up `answer-${stopId}` by id. On a short path four or five of those stops
are not in the document — an answer with nowhere to dock.

The collapse-to-zero-height variant is the worst, and it is computable: duplicate `offsetTop`
values make `u` jump 0.125 → 0.625 on a single scroll pixel, which at the scene's 125ms ease
is **32 stops per second against `CALM.speedFull` of 0.55 — 58x the saturation point**,
slamming the proximity floor. With `display: none` instead, `marks` stops being monotonic and
**`u` pins near 1, so the camera sits at `contact` for the whole short path.**

## 3. The evidence on self-classification is negative, and there is a real abandonment case

- **GOV.UK built audience-based navigation, user-tested it, and dropped it** (Cath Richardson,
  18 July 2014). Users did not fit the categories, and **needs shift by task, not by job
  title.** A school governor: *"I would think it is all there — I start panicking that there is
  nothing there for governors."* Their replacement was chosen partly because it stays "fully
  linkable and accessible without JavaScript", which is this site's own constraint.
- **NN/g (Sherwin, 2015)**: self-identification "takes people out of their task mindset", and
  visitors suspect the other segment is getting the better material.
- Checked locally against the four peer homepages saved in this repo: **all four use audience
  LANGUAGE in copy; none contains "choose your", "I am a", "who are you" or "which best
  describes".** Audience words as copy, universal. Audience as a gate, zero of four.

**One argument not to make, on the evidence.** Do not cite choice paralysis: Scheibehenne 2010,
63 conditions, N = 5,036, found a mean choice-overload effect of approximately zero. At two
options that is definitively not the mechanism. The case rests on self-classification,
opportunity cost and irreversibility.

## What to build instead

1. **One anchor in the hero, and it works today.** `StopSection` already sets `id={stop.id}`,
   so **`/#work` is a live, server-rendered, crawlable, JS-off deep link right now and nothing
   on the site tells anyone it exists.** A plain `<a href="#work">` gives a history entry so
   Back works, is already animated by the stylesheet, and is already reduced-motion-safe.
   Enhance with `flyToElement` and `pushState`.
2. **A section index at the twelve-stop migration.** Task 46 reached this independently; the
   branch turns out to be the same finding wearing a costume.
3. **If a recruiter needs a different document, give them a different document.** A `/cv` route
   with genuinely different content is not a spine fork and has none of the routing problems.
4. **Free, and anatomically honest:** when a jump is taken, do not draw a second edge — run the
   pulse **fast down the existing axon**. That is myelination, it uses the existing pulse pool,
   it adds no geometry and no cycle, and it says "same path, travelled quickly", which is
   exactly what happened.

**What would change this:** instrument the anchor. Under about 2% uptake and neither a jump nor
a branch is warranted. Heavy uptake argues for the index, not for the fork.

## Three contradictions this raises for the panel, recorded rather than resolved

- **Against task 51's thesis.** If "show less, invite asking" ships *and* a short path ships,
  the reductions multiply — most visitors never ask, and a short-path visitor additionally
  never passes five sections. **Only one reduction may be taken.**
- **Against tasks 49 and 52.** Segmentation is right about the content and wrong the moment it
  reaches the entry. **Segment the content, never the entry.**
- **Against task 44.** The gate and an entry choice both want the first screen, and that budget
  is not divisible — NN/g measures 57% of viewing time above the fold and 74% within two
  screenfuls. **At most one new element on §00, and it must not be a question.** Since the
  branch is not being built, the gate may have it.
- **And a caution about citing task 46 in support of this**: its ranking of "routes > insertion
  > tree scroll > nested scroll" is for *depth hanging off a node*. A route for depth adds a
  document; a route for the spine forks the scene and splits the routing table. The two are
  not the same question and the ranking does not transfer.

---

# The method for judging all of this — `done`, and it is honest about its own name

MJK asked for a judging panel and for "loop engineering principles" to shape the loop of
research → reason → judge → research.

## "Loop engineering" is a 2026 practitioner coinage, not a discipline

Every substantive source is a vendor or engineer blog from mid-2026 — IBM Think, LangChain,
Addy Osmani, CodeRabbit. **There is no peer-reviewed corpus under the name and no canonical
principle list that two sources share.** Anyone offering "the seven principles of loop
engineering" is synthesising rather than citing. The homonyms — chromatin loop engineering,
process control-loop tuning, Kirchhoff's loop law — must not be raided for authority.

What it genuinely supplies: the loop shape, IBM's demand for stopping criteria evaluated at
*every* iteration, and LangChain's **verification loop**, a grader checking output against a
rubric and sending it back. That last maps onto a judging panel and is the piece worth
borrowing. What it does not supply is anything about the failure modes that actually threaten
this work.

## The five results that do apply, and the first one governs everything

1. **External feedback is not optional.** Huang et al., *LLMs Cannot Self-Correct Reasoning
   Yet*, ICLR 2024: intrinsic self-correction without an external signal does not improve
   reasoning and **often degrades it**. A swarm that researches, judges itself and researches
   again converges on *confidence*, not truth. **Every round must import one fact from outside
   the swarm** — a repo measurement, a primary source actually read, or MJK.
2. **Judges are biased in measured ways, and the biases point here.** *Self-preference bias*:
   judges favour familiar, low-perplexity output — so **a panel briefed in my words will rate
   my framing higher for that reason alone.** *Position bias* is worst when the quality gap is
   small, which is exactly the story-first/work-first case. *Sycophancy* (Sharma et al.): a
   response matching the user's view is more likely to be preferred — **MJK has asked for the
   intro screen twice, and a panel that knows this will find reasons for it.**
3. **Similar panels collapse toward agreement.** Degeneration-of-Thought; *The Cost of
   Consensus* measures conformity to the modal peer answer up to 85.5%. **Independence before
   exchange, never the reverse.**
4. **Criteria drift is unavoidable, so log it.** Shankar et al., UIST 2024: you need criteria to
   grade outputs, and grading outputs is how you discover criteria. **The defect is unlogged
   drift, not drift.**
5. **Assigned devil's advocacy is weak.** Nemeth, Brown & Rogers 2001: authentic dissent beats
   a role-player, and a group that knows the objection was assigned discounts it and can end
   *more* confident.

**One conflict inside this repo's own documents, and its resolution.** `DESIGN.md` says
"Verify in bounded passes, not a loop." MJK is asking for a loop. That rule governs *verifying
a built artefact*; this loop governs *deciding a direction* before anything is built. Different
objects — but the doctrine carries, and it is why the round cap is three.

## The panel: six lenses, never averaged

Task 27's structure survives. Three changes, and the new lens in the middle is the important
one:

| lens | why it cannot fold into another |
|---|---|
| **Service buyer**, budget and thirty seconds | the original; the only lens scoring commercial conversion |
| **Recruiter** — new, from task 52 | wants the opposite evidence type: chronology, roles, titles. Scores **time-to-disqualify**, not time-to-persuade |
| **The non-asker** — new, and **forbidden to use the chat** | every other lens can be rescued by the dock; this one cannot. The standing proxy for the majority who never type, and **the only lens that can falsify task 51's thesis** |
| **Designer** | the only lens judging the artefact rather than the transaction, and the only one positioned to defend "the story is what a competitor cannot copy" |
| **Engineer / sceptic** | the sole feasibility veto. Task 50 was killed on geometry rather than taste; that is this lens working |
| **Corpus custodian / fact auditor** — new | earned by three retractions. No aesthetic or commercial stake. Checks every number in the swarm's **and the panel's** output for a primary source |

**Deliberately not built: a simulated MJK.** He is real and reachable, and a model-of-MJK lens
would launder the panel's preferences as his — and, given the sycophancy result, would
systematically agree with whatever he asked for most recently. Where the panel needs him it
produces a **question**, not a guess.

**The devices that do the work:**

- **Every proposal is restated as numbered claims by a non-author before scoring**, which
  generalises this repo's own rule — screenshots described before they are judged — from images
  to arguments. The panel judges claims, not the prose that sold them.
- **"Change nothing" is a first-class option in every packet, with its case written by someone
  who believes it.** The cheapest and strongest anchoring defence available.
- **Option order is rotated per lens**, because position bias is worst at small quality gaps.
- **Evidence tokens on every score** — M measurement (which must state its **instrument** and
  its **moment**), C corpus fact with a memory id, S source with a URL and whether the primary
  was reached, O observation quoting the description file, J bare judgement. **A 4 or a 0 may
  not rest on J alone.** Opinions are allowed; they cannot swing the result.
- **The output is a matrix, and publishing a column total is forbidden.** A gap of two or more
  between lenses is a **named collision**, recorded with one sentence per side in that lens's
  own voice, plus **the fact that would settle it**.

**Why the two past retractions become structural rather than lucky:** both were
*instrument/moment* errors — a focus reading taken 160ms into a smooth scroll, and a contrast
reading taken with the wrong instrument. Requiring every measurement to state its instrument
and its moment makes both visible **at write time** instead of in hindsight, for one line per
measurement.

## The stopping rule

**"Foolproof" is reframed, honestly: no direction is foolproof, and promising one is how this
project ends up retracting things.** What is achievable and worth more is **falsifiable and
reversible** — every decision states what would prove it wrong and what it costs to undo.

**Hard cap of three rounds**, and convergence is measured in **decision flips, not word count**.
Each round publishes FLIPPED, ADDED and COLLISIONS-OPEN at the top. **A round producing no
flip, no new decision and no settled collision is a NULL ROUND and is deleted rather than
appended** — text is not progress. Three distinct ways to stop, and only one is convergence:

1. **Convergence** — the flip test returns zero.
2. **Escalation** — every remaining collision turns on a fact only MJK holds. Ship the question
   list.
3. **Measurement** — the disagreement turns on a number nobody has. The clear case is task 51's
   chat-engagement rate *for this site*, which cannot be researched into existence. The correct
   exit is **a decision that holds at both ends of the plausible range (see the retraction —
   2–8% of sessions, floor under 1%), plus the instrument to
   measure it once live.**

## The nine assumptions the whole swarm shares — the devil's advocate's target list

Recorded because they are the ones nobody will otherwise test. The uncomfortable ones first:

1. **That this site, in this form, is the right instrument.** Everyone argues about the scroll's
   order; nobody has tested whether three strong case-study pages plus LinkedIn convert better
   at a tenth the cost. **The site is the premise and has never been the hypothesis.**
2. **That the chat is a differentiator rather than a tax.** In 2026, a box at the bottom of a
   page that answers questions is a support widget, and visitors have a decade of training to
   ignore it. Nobody has tested whether the dock reads as "his mind" or as "a chatbot", and the
   entire thesis rests on that difference.
3. **That MJK's story is an asset.** To a buyer, a flying dream plus two degrees plus a decade
   of paid media plus a motorcycle rebuild is evidence of **diffuseness** — the commonest
   objection to hiring a solo generalist. Memorable and disqualifying at once. **No agent was
   briefed to make this case.**
4. **That more work on the scroll is better.** MruNN has no clients yet. Showing scale you do
   not have is the fastest way to be caught, and one padded item discounts everything beside it.
5. **That the audiences are two and that they conflict.** There may be one — *is this person
   good, and will he finish* — and the split may produce two thinner paths serving neither.
6. **That the panel and the loop improve the answer.** Huang et al. is direct evidence that
   iteration without external feedback degrades, and six agents grading each other is not
   external feedback. **One hour with three real people — one recruiter, two buyers — would
   settle more than three rounds of this loop, and could be arranged this week.**
7. **That the failure modes I named are the operative risk.** The operative risk may be
   **elapsed time**. The site is live; every round is a week with no real visitor data, and
   the loop cannot see its own latency cost.
8. **That the corpus is the ceiling of truth.** "The corpus does not license it" has functioned
   as a rule and possibly also as an excuse not to ask MJK. **Task 54 is the proof: two projects
   held as unrelated for months turned out to be one engagement, revealed by a question.**
9. **That describing before judging makes judgement objective.** It makes it *auditable*. The
   describer still chooses what to describe, and anything unmentioned is invisible to every
   lens downstream.

**Dispatch notes for the advocate, from the same research:** run it on a **different model**
from the panel, since homogeneous panels hit 85.5% conformity; give it the repo and primary
sources but **not** my briefs or the sibling reports until it has formed its own view, which is
the only defence against self-preference bias; and its report enters as an **input to round 2,
not an appendix to round 1** — an objection answered after the conclusion is a rebuttal, and
read before it is a fact.

---

# 49 and 52 — the story is not the problem. The distance is. `spec'd`

## The measurement nobody had taken

`PLAN.md` §2 measured every panel height at 390x844 months ago. **Nobody added them up.**

| stop | top at | screenful |
|---|---|---|
| apac | 3,376 | 5.0 |
| now | 5,728 | 7.8 |
| **work** | **6,807** | **9.1** |
| **contact** | **7,869** | **10.3** |

**The first evidence that MJK ships software is 6,807px down the page.** NN/g's 2018
eyetracking — Fessenden, 120 participants, 130,000 fixations — puts **74% of viewing time in
the first two screenfuls** and 42% in the top fifth of the page. The résumé PDF and the
LinkedIn link sit at 7,869px.

And `app/page.tsx` renders the stops and nothing else. The document's only anchor is
`skip-to-ask`. **There is no navigation: a visitor cannot jump to the work. They can only
scroll, or ask.**

> **Under `SPEC-architecture.md` at n=12, `work` does not move one pixel earlier, and `contact`
> — carrying the recruiter's only two artefacts — moves to roughly 10,869px. The twelve-stop
> architecture fixes reachability and makes distance worse. Nobody flagged that, including me.**

## Presence or position? Position, and the cost structure proves it

`buildWaypoints(n)` and `mulberry32(0x5eed ^ M)` key off the stop **count**, never the order.
So:

- **Reordering at fixed n: no seed re-roll, no geometry moves, nothing re-measured.**
- Merging or cutting: M changes, the field re-rolls, and every screenshot-derived number in
  `PLAN.md` and `TASKS.md` dies.

**Reorder; do not cut. And decide it inside the 9→12 migration**, where the re-measurement pass
is already budgeted. Taken later it costs a second pass.

**The real diagnosis:** the hero already tells the whole arc in one sentence — *"Before that:
aerospace engineering at Brunel, then a decade running paid media…"*. So §01–§05 are the
**expansion of a summary already given**, and the expansion is mandatory while the payload is
optional-by-distance. **That is progressive disclosure, inverted.**

NN/g's About-Us research (Loranger 2015) is *pro*-story and specific about its form: a
scannable summary of concrete facts at the top, because "forcing people to work hard… to
receive an introduction is bad manners." Four practitioner sites read directly — thoughtbot,
Sara Soueidan, Paul Stamatiou, Jason Lengstorf — all do one sentence of identity, then a
visible menu of work.

**Two corrections found on the way.** `PLAN.md` §6 item 2 ("LinkedIn. Absent from the site")
is **stale** — both it and the résumé ship. And **the spine is already not chronological**:
rd350 (Jun–Dec 2014) sits after apac (2013–2024). "Reordering breaks the chronology" is not an
available objection.

**No evidence found, stated plainly:** no study compares story-first with work-first on a
portfolio, and none measures drop-off by chapter count on a scroll-driven page. The decay
*direction* is well evidenced; the magnitude for this page shape is not.

## The four intents, and two of them have no content at all

| intent | wants | where the site puts it |
|---|---|---|
| hire permanently | name → current title → current company → dates → previous → education | current role at 5,728px; CV and LinkedIn at 7,869px |
| commission a website | proof, a live URL, a price signal | **nowhere** |
| commission imagery | before/after at scale | ~7,900–8,900px |
| commission agents | architecture, guardrails, failure behaviour | the thinnest stop, plus material scattered over three others |

**Order fixes distance. It cannot fix absence.**

And the gap nobody had named: a grep over `content/memories.yaml` finds **no memory licensing
any statement about availability for permanent employment.** The site cannot honestly answer
the recruiter's only real question — in any ordering, with or without a chat.

(The widely-quoted six-second résumé figure is TheLadders 2018, n=30 and vendor-funded. It is
weak, and it is a *rejection* time rather than a reading time. Do not lean on it.)

## Detect, do not ask — and only one signal is honest

Referrer is out: there is no `document.referrer` in the codebase and `app/privacy/page.tsx`
promises "No account. No cookies. No analytics." Dwell time is out for the same reason.
**The typed question is the only honest signal, and the site already has it.**

`ENGAGEMENT` in `lib/retrieve.ts` is already a deterministic, CI-gated intent classifier, and
its discipline is right — it overrides the vote *only* where the corpus had nothing to go on,
which is the correct design for a classifier whose realistic ceiling is about 74%.

**Its concrete defect: it collapses the buyer and the recruiter into one class landing on
`contact`, whose copy answers a buyer.** The pattern list literally contains **"notice
period"** — an employment term inside a commercial classifier. Recommendation: a second
`RECRUITMENT` class of eight to ten patterns landing on `apac`, which holds `career-overview`
and sixteen timeline memories; same weak-vote-only override, same standing eval.

And the limit, per NN/g (Schade 2016): detection may change **which stop the camera flies to
and which prompts the dock offers — never which stops exist.**

## The recommendation: three moves

**Move 1 — `now` to index 1.** Note the arithmetic honestly: reordering *within* the story
prefix does not move `work` at all. Necessary, not sufficient.

**Move 2 — the work block above the story block, with Asanjo leading:**

    hero, now, work(index), asanjo, jewelai, mrunn, origin, engineering, pivot, apac, rd350, contact

**First proof moves from screenful 9.1 to 2.3.** The result is **reverse-chronological — the
résumé convention**, and what the recruiter's own fixation order matches. `contact` stays last,
n stays 12, nothing is cut.

Stated cost, not hidden: `apac` moves from screenful 5.0 to 10.1, which **Move 3 pays for**.
Without Move 3 this report would not recommend Move 2.

**Move 3 — a server-rendered `<nav>` of the twelve stops, plus résumé and LinkedIn, at the
top.** Topic-based, never audience-based. Buyers get the spine; the recruiter gets **one
honest labelled door that is not co-equal with it**.

## Asanjo is the biggest single change in the report

It is the only artefact with all four of: **a named client, a live third-party-checkable URL,
an end-to-end engagement** (he built the shop *and* the catalogue that fills it), **and a
ledger already in the corpus** — 107 runs, 125 accepted images, $27. Everything else on this
site is a claim the visitor must accept. This one they can open in another tab.

**Who values it, ranked and deliberately unequal:** website buyer (zero → one; the largest
marginal gain anywhere in this redesign) >> imagery buyer (proof of *use*, not just generation)
> agentic buyer (credibility, not capability) > recruiter (least).

**It inverts the project order in `SPEC-architecture.md`**, which is corpus-depth order —
7/3/2 memories — an author-side criterion. The visitor-side criterion is **checkability**.
Framed as one engagement, that stop serves two intents with the same pixels.

**Permission to name is not a licensed fact.** `claims.test.ts` still binds: the corpus needs
the name, his role, the dates, the stack and the URL before a word is written.

## Against the branch agent: agreement, one refinement, one load-bearing disagreement

- **Agreed** on not forking the entry, from independent evidence.
- **On choice paralysis:** agreed, and never relied on it. But the objection here is a
  different mechanism and should not be confused with Scheibehenne — **the choice is made
  before the information needed to make it exists.** At stop 1 the visitor does not know what
  "the work" contains. That is an *uninformed* choice, not a hard one.
- **Refinement: "never segment the entry" is slightly too absolute.** thoughtbot segments the
  entry and it works, because it is asymmetric and never asks anyone to declare an identity.
  **A labelled door is not a gate.**
- **Disagreement, and it is load-bearing: if "segment the content" is implemented through the
  chat and `retrieve.ts` alone, it fails for the reason this repo already wrote down** — a
  mechanism reachable only through a JS interaction duplicates the chat rather than completing
  it. Detection reaches only those who type: not the crawler, not the JS-off visitor, not the
  recruiter who scans and forwards a link.

  > **Detection is the second half of an answer whose first half is a navigation. Shipping only
  > the second half is the same defect task 40 already found.**

- A limit on the peer-homepage check, without undermining it: Linear, LangSmith, Trigger.dev
  and Windmill are developer-tool SaaS with no employment intent at all. Good evidence about
  gates; none about the employment axis.

## On the timed gate: it survives, and gets more expensive

Nielsen's response-time limits put 1.0s at unbroken flow and 10s at the limit of attention, so
**3–5s will be noticed as a wait**, and on a cold arrival nothing has yet earned it. It makes
Moves 1 and 3 **more** important, because the first informational screen becomes the second
screen. Three conditions: it must overlay a fully server-rendered DOM, and **it must not run on
a hash deep-link or on a return visit** — those are exactly the paths an intent-carrying
visitor arrives on.

## The cheapest item in the report, and it needs MJK rather than research

**Two corpus memories.** One naming the Asanjo engagement. One licensing a plain statement of
what he is open to.

---

# 51 — the cueing evidence, and it is the hardest thing on this list to read

A literature sweep on whether the site's "cue the habit of asking" strategy has any support.
This is the **external fact imported from outside the swarm** that the method requires each
round to carry, and it does not flatter the thesis. Recorded in full because the temptation to
soften it is exactly what the loop is built to resist.

## Q1 — do suggested prompts increase how much people ask?

**No primary source found that isolates a causal effect.** What exists:

- **Bing production data at scale** (Zamani et al., MIMICS, CIKM 2020; 414,362 unique queries):
  clarification panes get positive click-through on **17.2%** of query-clarification pairs in
  one collection and **52.9%** in another. Real, large, primary — but it measures *engagement
  once shown*, not an increase in total asking.
- **Directly against it:** NN/g's enriched site-search suggestions were used **7 times out of
  60 encounters — 11.7% — and users "did not notice or use" them "even after conducting
  multiple searches over time on a site."** Secondary and a consultancy study, so labelled as
  such, but it is the closest analogue to this site's chips and it is a negative result.

Honest reading: suggestion uptake is real, highly variable, roughly 10–50% depending on design
and fit, and **can be near zero when the suggestions do not match the visitor's task frame**.

## Q2 — will people type into a box at all?

**The industry's numbers are folklore.** The circulating "30%", "a third", "24–44% of visitors
use site search" figures trace to vendor blogs citing each other with no underlying dataset.
Nielsen's "more than half of users are search-dominant" has **no disclosed methodology, n or
date** on the page it lives on.

**The one figure traceable to a real, checkable dataset: 0.5%.** That is site-search usage on
Google's own public GA4 demo data for the Google Merchandise Store — searchers converted about
5x better, but only one visitor in two hundred searched at all.

That number is from an ecommerce store, where search competes with a product catalogue, so it
does not transfer directly. But it is the only one in this space that can be checked, and it
points the opposite way from the folklore.

## Q3 — can a habit be cued in one visit?

**No.** And this is the most load-bearing finding against the strategy as written.

- Lally et al. 2010 (*EJSP*, n=96): median **66 days** to automaticity, range 18–254.
- Wood, Mazar & Neal 2021 explicitly warn that habits form through **reward-contingent
  repetition in a stable context**, and that mere exposure to a cue is insufficient.

Every study in this literature operates on **weeks to months of repeated visits with real
reward**. None operates at the timescale of a first-time visitor to a portfolio.

> **"Cue the habit at every step" is not supported for a first visit. It is aspirational for a
> returning visitor, and this site has few of those.** Transplanting habit language to justify
> first-visit cue density is not something the sources permit.

**NO PRIMARY SOURCE FOUND** for single-session cueing effects on later voluntary feature use.

## Q4 — has chat ever become the primary navigation of a content site?

**No published case, with measured adoption. Anywhere.** Museum and gallery conversational
guides have been deployed and evaluated, but they report satisfaction and engagement quality —
**none reports the chatbot displacing traditional navigation**, and none gives a comparable
adoption share.

The best available ceiling numbers, both real and primary:

- **Reuters Institute, Digital News Report 2026** (multi-country survey): weekly AI-chatbot use
  for news is about **10% globally**, up from 7%, and **4% in the UK** — the lowest market
  surveyed. Of those who do use a chatbot for news, only about **4% click through to the
  original source**.
- **Bain, Sept 2025** (n=1,500 US consumers, self-report): **56% mostly or always default to a
  search engine against 16% for chatbots**, and even Millennials and Gen Z prefer search at 42%.

And the classic counter-evidence for any "they will see the cue" argument:
**Benway & Lane 1998** (n=72): only **24% of participants reported seeing non-ad banners at
all**, and 20% recalled seeing any advertisement — with **no significant effect of animation**.
Visible, repeated on-page cues are measurably not noticed by task-focused visitors.

## What this does and does not settle

**It does not kill the thesis.** Three things genuinely distinguish this site from every case
above: the chat is the *primary* interface rather than a widget in a corner; the cards are
already the content rather than an overlay on it; and the answer docks *into the page* rather
than into a chat window. None of the studies measured anything shaped like that, and the sweep
says so.

**What it does settle is the burden of proof.** The site cannot assume asking will happen. So:

- **Anything the scroll withholds must be genuinely optional, never the proof.** If 10% is the
  realistic ceiling — and every number found here sits at or below it — then withholding the
  work means most visitors never see it, which is precisely what MJK objected to two weeks ago.
- **The decision must hold at both ends of the band.** This is the method's "measurement stop":
  the honest exit is a design that works whether the true rate is 3% or 30%, plus the
  instrument to find out once it is live.
- **The chips and cards should be judged as navigation, not as habit formation.** They are
  worth having because they make the *next* action obvious, not because repetition will train
  anyone in one visit.
- **This is the strongest argument yet for the audience research's Move 3** — a server-rendered
  navigation. If the ask rate is a tenth of what the folklore claims, the scroll and the links
  carry the site, and the chat is the thing that makes it *better* rather than the thing that
  makes it *work*.

---

# 51 — the thesis, answered. `spec'd`

## RETRACTION: the "5–15%" band is unattributed editorial

The figure this project has leaned on all session traces to a single page —
`which-50.com/live-chat-engagement-rate-benchmarks/` — which **cites no dataset, no vendor, no
sample size and no year** for any number on it. It is not a benchmark; it is editorial.

**It belongs on the retraction list beside the "attract loop lost by 90%" figure**, and it had
spread further: three sibling reports and two places in this file were still quoting it, all
downstream of me handing it to them. Both retracted numbers reached the agents through my
briefs, which is the mechanism the method agent warned about — a swarm converging on the
coordinator's confidence rather than on evidence.

**Three checkable anchors exist, and two of them are under 1%:**

| anchor | value | quality |
|---|---|---|
| Smartsupp 2024 live chat — 175,438 accounts, 4.78bn visits | **0.84%** | **recomputable**: 40,085,914 / 4.78e9 |
| site search, Google's public GA4 demo store | **0.5%** | real dataset, e-commerce context |
| Tidio, ~300k sites | ~15% | vendor; denominator is widget *impressions*, and proactive greetings are not excluded. **This is where the band was copied from.** |

**No source anywhere publishes the share of visitors who engage an on-page AI chat, and none
publishes adoption for a site where chat is the primary navigation.** That gap is real rather
than an oversight.

**The estimate, labelled for what it is: 2–8% of sessions ask at least once, best guess ~5%,
LOW confidence, honest floor under 1%** — a construction from anchors in the wrong context.

**And the decision does not need it.** At every value in the plausible range, "we can choose
not to show some information" means **92–99% of visitors never see it.** The recommendation has
to hold at 3% and at 30%, and it does.

## The resolution: MJK's own two messages, and the class distinction he supplied

Task 51 ("we can choose to not show some information") and task 53 (the apparel pairs,
JewelAI's three stations, the MruNN video and the website work **must be on the scroll**) pull
against each other, in the same round, from the same person.

> **51 is right about the story. 53 is right about the work.** Withhold biography depth and
> work depth. **Never withhold a project, an artefact, a role, a year or a title.**

That also fixes a slogan I had been repeating. `SPEC-architecture.md` says "the scroll carries
EXISTENCE" — which is weaker than what the spec itself then builds. It should read **existence
AND evidence**. A name without an artefact is an unevidenced claim, which is MJK's own
"missing out showing off our work" complaint arriving through a different door.

## The strongest objection to the thesis, and it is structural

**The thesis is self-undermining.** Every mechanism that produces an ask **is a thing drawn on
the scroll**: `AskCard` turns a rendered memory into a pre-phrased question, and `stopPrompts`
addresses the ones not drawn. **Withholding removes the cue.** The thesis proposes to increase
asking by deleting the causes of asking.

## Rule 24 is already being violated, and it should become a build gate

**54 memories. 8 `AskCard`s**, each rendering only `firstSentence(m.body)`. **Roughly 36 memory
bodies appear in no HTML at all.**

Two consequences that are worse than "hard to index":

- Answers stream from `/api/ask`, which `robots.ts` **disallows**. Withheld content is
  therefore **structurally unindexable** — not slow to index, impossible.
- It has **no URL**, so it cannot be forwarded to a hiring committee. That is fatal for the
  recruiter audience specifically, who scan and forward rather than converse.

**Keep the rule; do not weaken it.** Make it satisfiable at memory grain — *existence and
evidence in the server HTML; only composition and connective prose chat-only* — and **make it a
build gate in `scripts/check-corpus.ts`**: every memory id must appear in the rendered HTML of
`/`.

## The voice: ship the change, never the promise

**The architectural finding, and it is the sharpest thing in the report.** `lib/grounding/guard.ts`
catches `unlicensed-quantity`, `unknown-entity` and `mispaired-quantity`, and `claims.test.ts`
does not scan `lib/fallback.ts` or `content/system-prompt.md` at all.

> **A promise is the one class of falsehood this architecture is blind to. Every guard checks
> the past; a commitment is a claim about the future.**

So "I'll check and get back to you" must not ship. Ship instead: **"I do not know that one, and
I am not going to guess,"** followed by what he does have — and where only he can answer,
*"That one is better put to me directly."* That is an **affordance, not a promise**. Add a
forbidden-phrase test for commitment language.

## "A virtual version of me" holds, with two additions

**EU AI Act Article 50(1) has applied since 2 August 2026 — that is now.** Its only escape
hatch is that the AI interaction be *obvious*, which a persona designed to feel human is
designed to defeat.

The costs run both ways and both are measured. Disclosure costs are real but context-bound
(Luo et al. 2019: 79.7% purchase drop, n=5,392, in outbound sales calls). Concealment costs
land on **hireability and personal reputation** (*Scientific Reports* 2023, four studies) —
which are precisely the two assets this site exists to build.

**The line: the voice is his; the chrome is the machine's.** `AnswerBlock`'s "Checked against
the corpus" verdict already *is* the disclosure. Keep it visible, and **never clean it up to
improve the illusion.**

## "Habit" is the wrong word — recruit the one that exists

Lally's 66-day median cannot be reached by a portfolio with no repeat-visit population. So stop
trying to build a habit and **recruit an existing one**: make the ask surface conventional
rather than clever.

The best-evidenced mechanism is the one already shipped — **a card *is* the question, one press
away.** Clarification-pane click-through runs **17.2–52.9%** against **0.5–0.84%** for
spontaneous typing. No motion (Benway & Lane found animation had no significant effect on
noticing) and no tutorial (already settled).

**And ship the instrument**: sessions, sessions-with-an-ask, and asks split by origin — card
versus chip versus typed. **Nobody has published that split for any site**, so measuring it
here is worth more than any further reading.

## Contradictions, resolved and open

- **Accepted in full, from the audiences agent:** segmenting through the chat and `retrieve.ts`
  alone fails, because detection reaches only those who type. It corrects an overclaim in this
  report's own text. The joint position both reports sign: **the scroll is authored to need no
  segmentation; the chat personalises for the minority who opt in; detection is the second half
  of an answer whose first half is a navigation.**
- **Conceded, from the branch agent:** "only one reduction may be taken" — and worse than
  multiplicative, because the reductions are correlated in the wrong direction.
- **Open, and for the panel:** this report adds that *if* only one may be taken, take the
  branch, because a branch is an **opt-out** while the thesis is an **opt-in**. The branch
  agent killed the branch on geometry and on the two-denominator problem, not on reduction
  budget. So the two do not actually conflict — but the reasoning should be reconciled rather
  than left as two verdicts that happen to point the same way.

---

# 44 — the intro gate, re-evaluated against MJK's two arguments. `spec'd`

> **The loading argument does not survive measurement. The orientation argument survives in
> half. A third argument nobody made — the phone — is stronger than either, and it is what
> changed the position.**

Every timing below is the repository's own, cited to the file that recorded it. **No browser
was run for this pass**, and the report says so.

## (a) Loading — wrong about the size, right about the principle

Measured artefacts: the scene chunk is **140,024 B gzipped** and `far-network.json` is
**67,110 B**. At Chrome's Fast 3G profile (1.6 Mbit/s) that is **about 1.04s of transfer**.
Working back from `scene.ts`'s own recorded timings — JSON done at 4.7–4.9s, `createMind` at
5.1–5.6s — `start()` fires at **~4.0s**.

**So the 5.8s figure is ~4.0s of the page's own critical path plus ~1.1–1.6s of scene load, and
a gate joins the first number rather than removing it.**

Two further problems:

- **It is self-defeating.** `requestIdleCallback` cannot fire during a full-screen particle
  animation, so **the gate delays the load it exists to cover.**
- On a phone `CFG.mobile.farNetwork === false`, so 67 kB of what it claims to cover is never
  fetched at all.

**Where his argument is productive, and it is a real gain: the gate legitimises eager loading,
which today the site does not do.**

## (b) Orientation — the earlier research was wrong to dismiss it

**A tutorial overlay and a title card are different mechanisms** — procedural instruction
versus an advance organizer — **and they measure oppositely.** NN/g's n=70 made perceived ease
worse (4.92 against 5.49, p=.047) with success unchanged; Bransford & Johnson's title-before
condition roughly **doubled recall**. And NN/g's own stated scope is "straightforward
applications", which this site is not. **That statistic was being over-applied, by me.**

Applying the mechanism honestly splits his argument in two:

- ***who this is about*** is already unambiguous in the first paint, so an advance organizer has
  nothing to resolve. This half fails.
- ***what you can do*** is the procedural half — and that is exactly where NN/g bites.

## (c) The phone — the finding that changed the balance, and nobody had made it

The vision pass concluded a portrait fails at every phone placement. **Both of its causes are
properties of the hero, not of the phone**: 0.0px of spare height, and eight lines of body copy
with halos lying across the face. **A fixed full-screen overlay has neither.**

Worked from the vision pass's own table, which is consistent at 11.15px of portrait width per
mark: a gutter portrait must contain shoulders; a title card need not. So a **full-screen phone
gate carries the head at 38–48 marks — matching a 1440x900 desktop, and beating every desktop
below 1366px** — at `dust.ts`'s already-measured 17.4ms/frame **at exactly 390x844 under 4x
throttle**.

> **It is the only shape in which a phone visitor ever sees the portrait at all. And the phone
> hero is 96.5% pure black.**

## Two corrections to this session's own work

- **The earlier estimate of 6,000–8,000 particles at 43ms is wrong by about 3x.** The
  legibility threshold was measured at 27–47 marks, and `sqrt(N/1.35)` puts 2,000 particles at
  38. **The performance objection to the rendering does not stand.**
- **Task 44's ranking was decided on an incomplete ledger** — no phone argument, no
  labour-illusion evidence. That does not make it wrong; it makes it **MJK's to re-decide**.

## The contract

**A fixed duration is a timer, not a load screen.** The shape: a fixed head of 900ms, then an
**elastic HOLD between 500 and 1,700ms**, then a fixed tail of 1,300ms zoom and disperse plus
700ms handover. **X = 3,400ms, Y = 4,600ms**, blocking for 2,700–3,900ms.

**Y is under 5,000ms because that is what keeps the gate out of WCAG 2.2.2 on two counts.**
2.2.1 Timing Adjustable *does* bite, and the only reachable satisfaction is "turn it off before
encountering it" — so **reduced-motion suppression and the once-per-visitor flag are the
substantive compliance, not the skip button.**

**The three cases, and the one that matters:**

- **Case A (ready before X): the gate invents 1.5–2.2s of wait.**
- **Case C: on today's code, Fast 3G IS case C — the gate lifts at 4.6s onto an empty canvas.**
- The band where it is honestly a load screen is ready-between-2.6-and-3.9s.
  **`modulepreload` plus an eager `start()` plus `import()` on the HOLD moves Fast 3G into that
  band, around 4.0–4.4s. Build that first, or do not build the gate at all.**

**The trap that would ship broken.** `onMindReady` **is not "the scene is visible"**:
`setMind()` fires while the canvas is still at `opacity: 0`, and the reveal then waits up to
`T3_GRACE_MS = 1200` (desktop) plus `REVEAL_MS = 700`. **Ending the gate on `onMindReady` lands
the visitor on a black canvas for up to 1,900ms.** It needs a new `onRevealStart` — five lines,
and invisible from `controller.ts`.

**LCP delta is about 0ms** — a canvas is not an LCP candidate, and a server-rendered gate's
sentence paints with the hero `<h1>` — **provided it is in the server HTML and never animates
from `opacity: 0`** (Shopify measured a six-second regression from exactly that). **A warning
for whoever reads the dashboard afterwards: if the gate's sentence outranks the hero title,
Core Web Vitals will report an improvement while the site gets slower.**

**The gate runs on a minority of visits** — reduced motion, `calm`, a return visit, a hash deep
link, JavaScript off. **So it cannot be the delivery mechanism for the sentence. The hero must
carry it, which makes the hero copy change a prerequisite rather than an alternative.**

Two placement notes: `content/static-copy.ts` is the wrong home, because its own docstring
records that a second copy of hero text was "the drift that put two fabrications on the live
site" — **add an `invitation` field to the hero stop in `content/stops.ts`** and render it in
both places. And **do not lock the body**: `touch-action: none` on the overlay with `inert`
beneath, any scroll, wheel or key ends the gate, plus a `<noscript>` style and a CSS
`intro-expire` animation **so the gate cannot outlive Y under any JavaScript failure.**

## The words

**"my mind" is the best phrase written for this site — keep it.** NN/g's guideline 92 objects
to exactly one word, "welcome".

**The substantive problem is new: "let's have a chat" writes a cheque the guard may bounce.**
Task 27a records six of ten buying enquiries being refused. **Fix the machine, not the
sentence** — do not ship the invitation until the first turn cannot be a refusal.

Recommended: **"I'm Mathew. This is my mind — ask it something."**

## Blockers to settle before any pixels

- **`DESIGN.md` forbids what the vision pass prototyped, as written.** Cyan exists "only inside
  the WebGL layer", and the gate is DOM. Either draw the portrait neutral white, or rule the
  intro part of the WebGL layer and **amend `DESIGN.md` so the exception is recorded** rather
  than silently taken.
- **Split `dust.ts` — add a luminance sampler. Do not fork it.**
- **Measure the photograph's pupils before anything else.**

## Disagreement with the cueing sweep, and it is a fair one

Benway & Lane's 24% is strong evidence that on-page cues are missed, but **banner blindness is a
position and format effect**, and the hero `<h1>` is neither. It supports **the sentence at
display size** more cleanly than it supports the gate — whose unmissability is bought in the
one format NN/g says trains reflexive dismissal.

---

## Blocked — needs MJK

1. **A wider photograph of the finished RD 350.** Its rear wheel is cut off at the frame
   edge, and that is the photograph rather than the crop — `1.png` is the only left-side
   profile and the photographer stood too close.
2. **The contact address.** A hotmail address and a pseudonymous GitHub handle are still
   the human contact for a Singapore AI consultancy.
3. **Links to the work.** JewelAI, MruNN-ERP and TallyBridge have no link, screenshot,
   repo or demo. TallyBridge is MIT open source and trivially linkable.
4. **The Paxel report.** It borrows Y Combinator's name for authority, and its numbers are
   volume rather than outcomes.
5. **Whether to store visitors' questions** — see lead capture.
6. **Fonts.** Fraunces with Inter is flagged as a saturated pairing.
7. **The hero's name label**, which is a genuine eyebrow. Task 44 may answer this by
   accident: a portrait at the top would give his name its own presence rather than
   leaving it a caption on someone else's sentence.

Raised 2026-09-05, and each of these blocks a build rather than a decision:

8. **Facts about the two websites**, because the corpus licenses nothing about either and
   nothing can be written that the corpus does not license. For `asanjokutch.org` and
   `www.ad-symphony.com` each: what he actually did (built it, designed it, ran the media
   for it), when, on what stack, whether the client may be named or must stay anonymous
   like every other client on this site, and any outcome he can stand behind. Without
   these, a screenshot on the page would carry a caption that says nothing.
9. **Whether the Shopify preview link may be published.** He sent
   `asanjokutch.org/?preview_theme_id=186809876844`, which previews an **unpublished
   theme**. If that theme is not live, showing it publicly may expose a client's unlaunched
   work. The live storefront is a different design and it is the one that is safe to show.
10. **A proper photograph of his head**, if task 44 goes ahead in any form. The frame he
    sent is a full-body seated shot in which the head is roughly 130x200 pixels. Detail
    traced below its source resolution reads as noise, and a face is the least forgiving
    subject there is.
11. **The MruNN ERP screen recording** (task 45), when he records it. Useful to know in
    advance whether it can show real data or needs a seeded demo tenant — the site names no
    client, and an ERP screen is full of client names.

Raised 2026-09-05, second round:

12. ~~May the apparel client be named?~~ **ANSWERED 2026-09-05: "The client for apparel
    and website is Asanjo, we can name them no issues."** The apparel pipeline and
    `asanjokutch.org` are one engagement and may be shown as one, with the name on it. See
    task 54b.
13. ~~Does the lead-capture decision change?~~ **WITHDRAWN 2026-09-05.** MJK: "'Let me get
    back to you' doesn't have to be a blocked. We can change the message shown." The
    requirement is that the site must not fabricate and must not sound like a machine; the
    promise to follow up was my reading of his example, not his requirement. Lead capture
    returns to blocked item 5, where it was, and stays optional.
14. **The remaining Asanjo facts**, now that the name is cleared. Per site — the storefront and
    the apparel imagery — his role (built it, designed it, themed it, ran the media, or all of
    it), the dates, the stack, any outcome he will stand behind, and **which theme is his**,
    since the link he sent previews an unpublished one. The corpus licenses none of these yet,
    so they are what stands between a named case study and a picture with nothing under it.

---

## Open, not started

- **Mobile density.** Five of nine sections still run past the dock when scrolled to their
  own top. The photographs and the dock are fixed; what remains is that the text-only
  sections are sparse and the composed ones are dense.
- **The guard cannot read a datasheet.** Telegraphic specification prose trips
  `unlicensed-quantity`, because the noun after a number is taken as its unit. Rewriting as
  prose fixes it, but the limit is real and will bite the next dense memory.
- **§07's height on a phone**, 1030px against a 147px dock. Recorded three different ways
  across the notes — 1132, 1030, and 1062 at a different viewport. Re-measure before
  quoting it again.
- **The §02 figure can flip after the visitor has read the caption.** It reads the latest
  envelope, and two late paths — a provider failure and a guard verdict with nothing
  salvageable — rewrite `cites` down to the two memories the fallback prose actually came
  from. If `mjk-101` was hit three of six it survives the first envelope and not the
  second, so the aircraft reverts to the engine mid-answer. The narrowing is correct on
  its own terms: after a replacement the text really is licensed by those two. The figure
  is what is wrong to read it. Freeze the figure's state from the first envelope of each
  question. Held until the vectors agent lands, because it owns that file.
- **`overflow-anchor: none` covers the answer, not the media column.** It names
  `.answer-swap`, `.answer-layer`, `.answer` and `.answer-prose`. A figure that changes
  size when an answer lands is uncovered by it, and a growing media column is the same
  mechanism that was measured moving the camera 431–554px. Any new §07 figure state must
  be zero-delta by construction; the property is a belt, not the defence.

---

## Answered, closed

- **The ZIYA mill mark** in the dupatta selvedge: ship it as-is.
- **The apparel images have no model in them** — the garments are rehung on a rack in an
  invented room. The caption says "catalogue images", never "on-model", so it stands.
- **The multi-reference video claim was wrong** and is corrected. The technique is in the
  image path; the video path deliberately avoids it because the reference image's own scene
  bleeds into the clip.
- **The clothing pipeline is not JewelAI** — a separate Python pipeline, already named
  `project-photoshoot-pipeline` in the corpus.
