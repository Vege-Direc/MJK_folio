# Open task list

Raised by MJK 2026-09-03. Every item here is reported back on individually when the work
is done. Nothing is closed without evidence. `PLAN.md` holds the specification and the
decisions; this file is the checklist for this round.

Status key: `todo` · `doing` · `done` · `blocked` · `wontfix (with reason)`

---

## 1. RD 350 image quality — `done`, with one question for MJK

**Reported:** the before image is squeezed to fit the gallery and distorted. Some images
are not loading properly.

**MJK's diagnosis was right, and the cause was exactly where he guessed.** The old wipe
was built on a homography fitted to six points on the two wheels. Measured back off the
shipped file, it sampled a 2053x1133 region into a 668x501 frame: a **1.36 aspect
squeeze**, so the stock bike stood 36% too tall for its length and its wheels were visible
ellipses. The finished bike beside it was an untouched crop. The distortion was in the
image preparation, not in any stylesheet.

**And no registration was ever possible.** Wheelbase divided by summed wheel radii — a
number no rotation, uniform scale or translation can change — is 2.95 in the stock
photograph and 2.24 in the finished one, 32% apart. The cameras were not in the same
place. Match the wheelbase and the stock wheels come out 24% small; match the wheels and
the rear axle misses by 180px. A full affine needs 38% anisotropy; the four-point
homography that fits exactly leaves a wheel 32% out of round. Every honest option was a
bad wipe.

**So it is a cut, not a wipe.** Each photograph is cropped to 4:3 and resized once,
uniformly — nothing is warped on either axis, both files are 780x585, and the rendered box
is 579x434, so `object-fit: cover` is an identity and neither photograph is touched.
Verified on the live site at 1440 and 390: both frames load, both are sharp, the wheels
are round.

**The one question for MJK.** The rebuilt bike's rear wheel and the tail of the seat unit
are cut off at the right edge — and that is the photograph, not the crop. `1.png` is the
only left-side profile of the finished bike and the photographer stood too close. The
stock frame shows the whole machine; the rebuilt one cannot. **Is there another shot of
the finished bike, further back?**

## 2. §02's figure — `done`

**Reported:** the engine-simulator screenshot does not fit the site's aesthetic.

**Required:** replace it with an isometric vector animation of a two-stroke internal
combustion engine, which dissipates into particles and reforms as a blueprint-style
render of the aircraft he designed at Brunel, drawn from
`C:\Users\mathe\OneDrive\Documents\Old Projects\Airbus Presentation.pdf` (the short form
of `Airbus Design Project.docx`).

**Done, as asked.** A two-stroke parallel twin holds for 850ms, gives way to 150
particles, and they cross the frame and reform as the plan view of the MJK-101. Twelve
iterations against period Yamaha reference before the engine read as an engine rather than
as architecture.

**The aircraft is his, not an illustration of an airliner.** The Airbus presentation he
pointed me at carries his own CAD plan view and a full specification table. The outline is
traced from that render, the dimensions are read off that table, and both are now in the
corpus as `mjk-101` — so the site can answer questions about the aircraft too. The trace
validates against his own numbers: span over length comes out 1.095 against a stated
110/97 = 1.134.

**On performance, measured rather than asserted.** The sequence runs once, on first sight,
and the particles are mounted only for the 1.6 seconds they exist — at rest the figure is
one path, one casing and six dimension lines, and nothing animates for the remainder of
the visit. Each particle carries both endpoints as custom properties, so the crossing is
one compositor transition per dot and no per-frame JavaScript touches the raster threads
the halo already taxes. Reduced motion goes straight to the aircraft.

## 3. Show the AI work as before and after — `doing`

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


---

## What reading the JewelAI codebase changed

MJK asked me to go deep rather than take his summary second-hand. Two things came back
that would otherwise have shipped as errors.

**A claim already on the site was wrong.** `jewelai-platform` said "I engineered a
multi-reference video-generation technique". The code says the opposite in a comment: the
pipeline deliberately does NOT pass the reference set to the video model, because the
element image's own scene gets rendered into the clip. `kling_elements` is typed and never
populated by any caller — checked at every call site, not taken on report. The technique
is real and it is in the IMAGE path. Corrected, and the true version is the better story:
he tried it on the video, diagnosed why it failed, and removed it.

**His three-photographs framing is confirmed and understated.** The whole set travels
together three separate times, and the model is never told in words what the piece looks
like — because describing a ring in text is how you get a different ring back. There is no
mesh and no photogrammetry, so "reads the structure from several angles at once" is right
and "builds a 3D model" would have been wrong.

**The clothing work is not JewelAI at all.** It is a separate Python pipeline, which is
what the corpus already called `project-photoshoot-pipeline`. Its own ledger records 107
runs, 249 jobs, 125 accepted images and 55 rejected, for 27 dollars of model calls — which
makes the corpus's existing "more than 50 images across 20+ products" true and
conservative.

**And the staged apparel image has no model in it.** The generated frame rehangs the
garments on a wooden rack in an invented room. Captioning it "on-model" would contradict
the picture beside it; the honest reading is stronger anyway, because the print, border
and tassels survive intact while the entire room is generated.


---

# Round two, raised 2026-09-03 after the first pass shipped

## 9. §02 pacing and the vanished figure — `done`

**Reported:** "transitions from engine to aircraft too fast and then disappears. Should it
be a loop? or user controlled option present along with loop so they can see it?"

The disappearing half was a bug I introduced: rewriting the component to drive itself from
`data-phase` left three CSS rules still keyed on `data-arrived`, which nothing set any
more, so the aircraft drew itself with an invisible stroke, no casing and no dimensions.
Fixed and verified in the page: dash offset 0, casing and dimensions at full opacity.

The pacing was real. 2.5s is long enough to notice something happened and too short to
watch it. Now 4.0s — engine 1.4s, scatter 0.9s, flight 1.7s.

**Not a loop, and a control instead.** A perpetual animation is the one thing this site has
measured and rejected: it cost 11% of the framerate and took the worst frame from 66ms to
92ms, and it would sit in the corner of the eye of someone reading the paragraph beside
it. A Replay control appears once the sequence has finished — the same bargain the RD 350
comparison strikes, where motion happens because a finger asked for it. Hidden under
reduced motion, where there is no sequence to replay.

**Still open:** MJK asks that the two-stroke be modelled more closely on the RD 350
specifically, rather than on the RD family generally.

## 10. The carousel's play control does not work — `todo`

**Reported:** "play button under motorcycle images doesn't work as well."

## 11. §05 does not explain itself — `todo`

**Reported:** "section 5 says aside in parallel a motorcycle, which really doesn't make
sense to someone coming to the website right? parallel to what? why? why a motorcycle?"

The kicker is `§ 05 — Aside` and the title is "In parallel, a motorcycle." Both assume the
reader already knows what it is parallel to. They do not.

## 12. The copy, across the whole site — `todo`

**Reported:** "can you check if the overall content on the website can be improved? I don't
want AI slop, so please use taste and impeccable skills and repos to help with this. I
don't want those rythmic, duality style sentences or poetic framing for no reason." And
separately: "Even descriptions of projects are cut short."

Also reported: **§03 has text on one side only on desktop** — it is a `plain` stop, so it
centres a single column and the other half is empty scene.

## 13. Page copy should prime the chat — `todo`

**Reported:** "I think content on the page should prime the user to ask more about it as
well through chat right?"

This is the sharpest framing of the site's purpose anyone has given it: the authored copy
is not there to say everything, it is there to make a visitor want to ask. Every section's
body should leave a specific, askable question hanging.

## 14. §07's display of the work — `todo`

**Reported:** "Section 7 display of work can be improved? images made larger? Gallery of
images we have? before and after? please research online best way to show things like
this and improve? lightbox? mason lightbox? something else?"

## 15. §08 duplication and lead capture — `todo`

**Reported:** "section 8 how to brief me and contact seems to be duplicated. Should we
link to google sheets or something else to collect leads instead of waiting for people to
reach out to us? or notion?"

## 16. The answers are cut short — `todo`

**Reported:** "When AI answers as well many times details are cut short, is that because
you've put a token limit on output? how does this work on desktop and mobile? can user
scroll through response without triggering the background animation scroll?"

Three questions: is there an output cap and where; does the answer surface differ between
desktop and phone; and can a visitor read a long answer without the page scroll driving
the camera.

## 17. Is this actually innovative — `todo`

**Reported:** "This is trying to be an innovative website right? can improve on this?"


## 18. Suggestions should follow the section being read — `todo`, my proposal

MJK asked whether the page copy should prime the chat. It should, and there is a second
half to that which the site is already equipped for and does not use.

The dock shows four fixed suggestions, the same four on every one of the nine sections.
But the site already knows which section is on screen — `ScrollProgress` writes it to
`data-stop` on `<html>`, and the ask route already reads it as `viewing` to resolve
deictic questions like "more on these?". So the suggestion in the dock can be the question
this section provokes, and change as the visitor travels.

That is the mechanism that makes the authored copy and the chat one thing rather than two.
Copy that names something specific and stops, and a dock that offers exactly the question
that specific thing raises. It costs nothing at runtime: the suggestions are authored per
stop in `content/stops.ts`, and the dock reads the same attribute the router already reads.

Two constraints from what has already been measured: every suggestion still has to fit one
line at 320px (40 characters, asserted in the tier-A evals), and the rotation must still
stop the moment the visitor types — a control that changes under a reader's hand is
unusable. Changing suggestion on scroll is a change under the reader's eye, so it should
swap only when the active section changes, never mid-read, and never while the field has
focus.
