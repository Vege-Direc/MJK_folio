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
| 19 | The aircraft was still a top-down plan | Retraced from the **isometric** render with interior structural lines and a title block, so the projection no longer changes mid-morph. Needs a visual pass. |

---

## Doing — agents running

| # | Task | What it owes |
|---|---|---|
| 11, 12, 13 | The copy, across the whole site | Exact replacement strings for `content/stops.ts`. §05's kicker and title, which assume the reader knows what the motorcycle is parallel to. §03's empty half-screen. Project descriptions that stop short. And the rule under all of it: every section should leave a specific askable question without teasing. **His hardest constraint: no rhythmic, duality-style sentences, no poetic framing for no reason.** |
| 14, 17 | §07's display, and whether the site is innovative | Larger images, gallery, lightbox or none — argued from real examples with real bundle numbers, plus an honest answer on where the next real gain is. |
| 16 | Answers cut short; desktop vs phone; reading without moving the camera | Which of five causes dominates, measured per question; whether the answer surface differs by viewport; and whether a long answer can be read without the page scroll flying the camera away. |
| 20 | The engine matched to his own RD 350 | His pipes drop off the barrels and run back low and level, slim and chrome — not the fat swept chambers drawn from generic RD reference. Plus the ribbed crankcase cover and the cone filters. |

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

## 25. More detail in the vectors, and the particle field — `doing`

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

## 28. The images are small, and the layout stops growing — `doing`

"the images which really show off the work seem quite small. Why does the layout not
dynamically match screen sizes?"

Part of the mechanism is already found: `.section-inner` has `max-width: 1460px`, so above
that width the layout stops growing and the extra pixels become empty margin. A 2560px
display shows the same photographs at the same size as a 1460px one. The rest of the
question is harder, because a section is one viewport tall with `overflow: hidden` that
*destroys* what does not fit, and a wider image at a fixed aspect is a taller image. Out
for measurement across eight viewports with the height arithmetic for each proposal.

## 29. The scene is too much seen from inside it — `doing`

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
anything global makes one of the two worse. Out for research into how comparable sites
handle a camera inside a particle field, and for a graded curve rather than a switch.

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
7. **The hero's name label**, which is a genuine eyebrow.

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
