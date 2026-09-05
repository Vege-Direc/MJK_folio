# Design decisions

Impeccable, taste-skill and ui-ux-pro-max were run against this site. Most of what they
say applies. Some of it does not, because this site is not the shape those rules assume.
This file records which is which, and why, so the same arguments are not had twice.

It exists under the same rule as everything else in this repo: it is here because the
project has already lost time to decisions being re-made, and each entry below settles a
question that a screenshot re-opened at least once.

## What this site is

Impeccable asks you to choose one visitor mode. This site is three at once, and pretending
otherwise is what produced its worst mistakes:

- **Experience** — a three.js network the camera travels through as you scroll. The
  artifact. *Let it lead; the interface recedes.*
- **Read** — nine authored sections and a career history. Words that must be read
  comfortably, at length.
- **Operate** — a persistent input that answers questions and streams prose into the page.

The tension is entirely between the first two, and it has one resolution:

> **The scene and the words occupy the same space, and neither may mask the other.**

That is why a scrim failed twice. Covering the scene to protect the words satisfies Read
by destroying Experience, and the owner rejected it on sight both times. The words defend
themselves instead — a tight halo on the glyphs, nothing laid over the scene. If a stop
still cannot be read, the fix belongs in the scene's own lighting, not in a plate on top
of it.

The corollary settles what "the interface recedes" means here. It is not *all* interface:
the words are content too. It is the machinery — the dock, the status labels, the
citations, the verdicts. Those recede. The scene and the prose both lead.

## Rules taken as written

No argument, no exception, act on them:

- **11px floor on functional text.** Every small label was 10px. Being on the type ramp
  does not exempt a value; it launders the token, not the legibility.
- **4.5:1 on body, 3:1 on large text**, measured against the pixels actually rendered
  behind the glyphs, not against the flat page colour.
- **No raster buried under a wash.** The RD 350 photographs are the only real photographs
  here and the only proof of that story.
- **Browser surfaces carry the design**: selection, caret, scrollbars, focus rings.
  Cheapest signal a page was built rather than assembled, and the one most often skipped.
- **Cards are the lazy container.** Same-size cards of label-plus-heading-plus-text as
  page structure is a framework default, not a decision.
- **Tracking belongs on small caps labels, never on prose.**
- **Verify in bounded passes, not a loop.** Build fully, inspect once across desktop and
  mobile together, fix in one batch, confirm once, stop.

## Rules kept, with the reason they do not apply

**The eyebrow ban, for the § section labels.** Impeccable bans a label above a heading
outright and says no brief earns it back. That ban is aimed at the decorative eyebrow —
`PLATFORM` floating above `Built for scale`, carrying nothing. `§ 04 — APAC` is not that.
It is an address in a navigable space: the scroll is a camera path through nine named
locations, and a question routes an answer *to one of them*, so the visitor has to know
where they just landed. It is a chapter heading, closer to a gallery room number than to
a SaaS kicker. Kept for stops 1 through 8.

**Section numbers.** Permitted by the same rule when the sequence carries information the
reader needs. Here the sequence is the product: nine stops in a fixed order, traversed by
a camera. Kept.

**Monospace, in two of its three uses.** The ban is on mono as a costume for "technical".
The timeline's years are measurement and the § labels are coordinates, both of which the
rule explicitly allows. The dock's `TRY` / `⟶ ASK` / `↵ SEND` are interface chrome wearing
the costume, and they are the ones to reconsider.

**Body measure.** The floor says 65–75ch. This site sets shorter, around 55–62ch, because
the line sits over a moving background and the eye has to re-find the line start against
motion. A standard written for text on paper-white does not survive contact with a
scrolling particle field. Deviation is deliberate; do not "fix" it back.

## Open, and the owner's call

- **The hero's name label.** `MATHEW JOHN KONDEKERIL · SINGAPORE` above the tagline is a
  genuine eyebrow, and the one instance the detector flagged. His name should probably
  have its own presence rather than being a caption on someone else's sentence.
- **Fraunces and Inter**, flagged as the saturated AI-wave pairing. Fraunces is genuinely
  characterful and earns its place if its variable axes are actually used; Inter is the
  generic half. A distinctive body face would do more for this site than any layout tweak,
  at the cost of a self-hosted font and a bundle.

## Palette

Unchanged and non-negotiable. Cyan `#3ecfff` and orange `#ff8a3d` exist only inside the
WebGL layer. The DOM is warm oat and amber. They never meet.
