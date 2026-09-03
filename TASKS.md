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
- **§07's height on a phone**, 1030px against a 147px dock.

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
