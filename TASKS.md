# Open task list

Raised by MJK 2026-09-03. Every item here is reported back on individually when the work
is done. Nothing is closed without evidence. `PLAN.md` holds the specification and the
decisions; this file is the checklist for this round.

Status key: `todo` · `doing` · `done` · `blocked` · `wontfix (with reason)`

---

## 1. RD 350 image quality — `todo`

**Reported:** the before image is squeezed to fit the gallery and distorted. Some images
are not loading properly.

**Required:**
- Never distort. Crop the after to the before, or the before to the after, but the aspect
  ratio of neither may be altered.
- The registration must match **the whole bike**, not the axles. The two photographs were
  taken from different angles, so a fit driven by axle positions can be wrong everywhere
  else, and that is a likely cause of the distortion.
- Outcome quality is paramount. This is a photograph of his own work.

## 2. §02's figure — `todo`

**Reported:** the engine-simulator screenshot does not fit the site's aesthetic.

**Required:** replace it with an isometric vector animation of a two-stroke internal
combustion engine, which dissipates into particles and reforms as a blueprint-style
render of the aircraft he designed at Brunel, drawn from
`C:\Users\mathe\OneDrive\Documents\Old Projects\Airbus Presentation.pdf` (the short form
of `Airbus Design Project.docx`).

**Open question to answer with a measurement, not an opinion:** can this run without
hurting performance? The site's budget rule is that blur radius squared times area is
what costs and geometry is free; a perpetual animation measured -11% fps at 4x throttle.

## 3. Show the AI work as before and after — `todo`

**Required:** in Selected Work or wherever fits better.
- Clothing: `D:\Projects\Siddhi\Pop Up Supplier Images` (source) →
  `D:\Projects\Siddhi\Generated\Popup` (generated).
- JewelAI: `D:\Projects\Ring Sample Photos\Rikesh\Ring side 1.jpeg`, `Ring side 2.jpeg`,
  `Ring front.jpeg` are fed in **together** so the model can read the design and its
  three-dimensional structure; `generated image.jpeg` and `Generated video.mp4` come out.
- Reference `C:\Users\mathe\OneDrive\Documents\Krunch Labs.pdf` for how he has presented
  this himself.
- Consider whether a **workflow chart** explains what he built better than a before/after.
- Research libraries, open source and other representations of this kind of work first.

## 4. Mouse-repulsion on mobile — `done`

**Reported:** particles move away from the cursor on desktop. A phone has no cursor.

**Done.** It was NOT already off. The nebula's cursor-ray repulsion attached
`pointermove`/`pointerleave` on `document` and ran a per-particle spring-damper plus a
raycast every frame, and `cfg.nebulaMouse` was non-zero on both tiers (desktop 10, mobile
7) — so a touch-drag scroll was driving it. The listeners are now attached only when the
tier is not mobile, which short-circuits the per-frame block entirely. Verified by reading
the attached listeners over CDP: present before, absent after. Particles, ambient drift
and rendering untouched.

**Honest result on the saving:** p50 33.4ms and p95 50.1ms are identical either way at 4x
throttle, and cumulative script time differs by under 2%, inside run-to-run variance. Real
work was removed; the wall-clock difference on this hardware is not measurable.

## 5. The mobile dock — `done`

**Reported, three separate faults:**
- The suggested questions take too much space at the bottom of a phone and cover other
  information.
- Suggested: fold them into the chat box itself, transitioning seamlessly, instead of a
  standing four-line list.
- The chat box **disappears while typing on a phone** and only comes back after the send
  key is pressed. The send control and the input are not visible during typing.

**Done, all three.**

The disappearing input was not a formula error. The inset was computed from
`innerHeight - vv.height - vv.offsetTop` and only ever applied on a viewport event, with
disagreement clamped to zero. iOS fires `resize` with pre-keyboard metrics and does not
reliably fire a settled one, so the inset stayed at zero and the dock sat under the
keyboard until send. Measured at 390x664 against the real component: three of five event
sequences left 332px of dock below the visible band. The dock now measures its own bottom
edge against the visible band and closes the gap, re-reading on a bounded rAF loop after
resize, scroll, focus and blur. Five of five sequences now land on the keyboard edge.

The prompt row shows one suggestion at a time below 768px, cross-fading, and the dock
measures 147px against 214px. Desktop keeps all four.

**No chat library.** Measured, minimum import, gzipped: the hand-rolled dock is 1.47kB
against assistant-ui at 66.0kB, ai-elements at 47.4kB, chatscope at 44.0kB plus 42kB of
CSS, prompt-kit at 19.3kB. The decisive point is not size: none of them ships a
keyboard-inset handler, so adopting one does the larger job and leaves the reported bug
exactly where it was.

## 6. The three linked repositories — `todo` (answer owed)

`pretext`, `hyperframes`, `flowtoken`. MJK has asked twice. Owed: a straight answer on
each, what was adopted, and what was not. The reading must go deeper than the README.

## 7. Generative UI — `todo`

Does gen UI help with any of the above? Answer per item, not in general.

## 8. Scroll easing — `done`

**Reported:** it should start slow, accelerate, then slow down on arrival, rather than
jumping straight into a fast scroll.

**Done.** Every flight now uses CSS's own `ease-in-out`, cubic-bezier(.42, 0, .58, 1),
chosen by measuring peak travel in px per frame against the alternatives at both
distances:

| Curve | One stop | Eight stops |
|---|---|---|
| `easeOutExpo` (was used for short hops) | 226 | 1,028 |
| `easeInOutExpo` (was used for long flights) | 207 | 1,025 |
| `easeInOutCubic` | 106 | 467 |
| `easeInOutQuart` | 136 | 616 |
| **cubic-bezier(.42, 0, .58, 1)** | **65** | **274** |

Roughly one viewport per 100ms — 141px per frame here — is where a flight starts to tear
visually, and both old curves exceeded it on the common one-stop hop.

---

## Standing instructions for this round

- Use subagents with vision, at scale, in parallel. Reason from macro and micro angles.
- Research online, in depth. Not README-level understanding.
- Render PDFs as images, because text extraction loses how the document is built.
- Ask MJK when something is genuinely his call.


---

## Found on the way, not asked for

**~35kB off the critical font path, verified but not yet taken.** JetBrains Mono is 40,480
preloaded bytes, a third of the site's 125,472-byte critical font payload. All fourteen
selectors that use it render committed content — section kickers, timeline years, corpus
card kickers, the dimension labels on the new figure — and never model output or visitor
input, so it can carry a `text=` subset of 4–8kB. Fraunces and Inter cannot: Fraunces
renders the visitor's own question and the model-derived dek.

Deliberately not done in this pass. The risk is a glyph outside the declared set falling
back silently to a system mono, and the eight items above were the ones asked for. It
needs a build-time change and a screenshot comparison of every mono-rendered region.

**The guard cannot read a datasheet.** Writing the MJK-101 memory as a specification table
tripped seven `unlicensed-quantity` violations on MJK's own authored prose — "Tail height
20 ft." among them — because the noun after a number is taken as its unit and a
telegraphic sentence gives it nothing to bind to. Rewriting it as prose fixed it and read
better, but the limit is real and will bite the next dense memory.
