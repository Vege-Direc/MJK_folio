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

## 4. Mouse-repulsion on mobile — `todo`

**Reported:** particles move away from the cursor on desktop. A phone has no cursor.

**Required:** disable that motion effect on touch devices if it is not already off. Do
**not** disable the particles themselves.

## 5. The mobile dock — `todo`

**Reported, three separate faults:**
- The suggested questions take too much space at the bottom of a phone and cover other
  information.
- Suggested: fold them into the chat box itself, transitioning seamlessly, instead of a
  standing four-line list.
- The chat box **disappears while typing on a phone** and only comes back after the send
  key is pressed. The send control and the input are not visible during typing.

**Required:** research existing chat-interface components rather than extending the
hand-rolled one, and say whether one fits a site whose answers dock into the page rather
than into a transcript.

## 6. The three linked repositories — `todo` (answer owed)

`pretext`, `hyperframes`, `flowtoken`. MJK has asked twice. Owed: a straight answer on
each, what was adopted, and what was not. The reading must go deeper than the README.

## 7. Generative UI — `todo`

Does gen UI help with any of the above? Answer per item, not in general.

## 8. Scroll easing — `todo`

**Reported:** it should start slow, accelerate, then slow down on arrival, rather than
jumping straight into a fast scroll.

**Note:** a tween shipped earlier today, but short flights use `easeOutExpo`, which is
fast at the start and slow at the end — the opposite of what is asked for at the start of
the move. This needs changing, not defending.

---

## Standing instructions for this round

- Use subagents with vision, at scale, in parallel. Reason from macro and micro angles.
- Research online, in depth. Not README-level understanding.
- Render PDFs as images, because text extraction loses how the document is built.
- Ask MJK when something is genuinely his call.
