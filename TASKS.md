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
