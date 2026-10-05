# WebGL port notes

**Source of truth for the scene: `reference/preview.html`.** The port is done; this file now
records what came across, what was fixed on the way, and what the prototype still holds that the
site deliberately does not. Verified against the working tree on 2026-09-02.

## Where things live

| | |
|---|---|
| `lib/mind/scene.ts` | the scene. `createMind(canvas, opts)` -> a handle. Vanilla three, no React, no GSAP, no page. |
| `lib/mind/config.ts` | the desktop/mobile `CFG` tables and `PALETTE`, verbatim from `preview.html:381-495` |
| `lib/mind/curves.ts` | `makeCurve` (`:403-439`) and `tubeWithTangent` (`:913-937`), verbatim |
| `lib/mind/waypoints.ts` | `buildWaypoints` (`:2128-2149`), `mulberry32`, `srand` |
| `lib/mind/controller.ts` | module-level registry so other client code can reach the running scene |
| `components/mind/MindCanvas.tsx` | the only thing that mounts it |
| `components/mind/ScrollProgress.tsx` | document scroll -> `setProgress`, and the lit-stop marker |
| `components/stops/` | the nine sections, five compose kinds, server-rendered |
| `app/globals.css` | the editorial layer from `<style id="mjk-overrides">` (`:89-308`) |
| `public/far-network.json` | tier-3 topology, 4,664 nodes / 4,642 edges, fetched at runtime |
| **`reference/preview.html`** | the prototype. **Was served at `/preview.html` in production until 2026-09-02.** It contains fabricated claims (see below); it must never go back into `public/`. |
| `reference/original-webgl.html` | **not a page.** Line 400 is `<script type="__bundler/template">` holding the real document as ~112 KB of JSON-escaped string on line 401. History, not a source. |

## Preserved

- Scroll-linked camera path through a pre-formed neural network. Per-segment uniform sampling, so
  `u = i/8` lands exactly on vantage `i` — `ScrollProgress` maps stop `i` in view to exactly that.
- **Filament `#3ecfff`, pulse `#ff8a3d`.** These now live only in `lib/mind/config.ts`. They are not
  CSS tokens any more, in either file, because nothing in the DOM may use them.
- Node cluster density and drift physics; the desktop/mobile `CFG` tables, number for number.
- The three render tiers, the nebula, and `UnrealBloom` — bloom on desktop only, which is a tuned
  decision, not an oversight: mobile raises `nodeCoreWhite` to `.42` precisely because the shader
  carries the glow alone.
- `makeCurve`'s constraint that offsets depend on `(dir, len, seed)` and never on absolute
  endpoints. That identity is why the camera curve is the axon curve translated up, and why the
  flight reads as travelling *inside* the network.

## Fixed in the port

- **The scrolljack.** `preview.html:1726` discarded every scroll event for the 1.6s of a camera
  flight, and `:1761` then called `window.scrollTo` and moved the document up to eight viewport
  heights in a single frame. The scene now has no code path to the scroll position at all:
  `setProgress` is pushed in, `flyTo` animates the camera only, and moving the page is the caller's
  decision.
- **`prefers-reduced-motion` read once** (`:446`). It is live now — `setReducedMotion` re-pushes the
  sway/breath/shimmer/drift uniforms and hides the pulse meshes, and `MindCanvas` listens for
  `change`.
- **No pause, ever.** The prototype's rAF loop had no `visibilitychange` check and no
  `webglcontextlost` handler, so a hidden tab kept rendering and a lost context left a black page
  forever. Both exist now.
- **`isMobile` included `innerWidth <= 768`** (`:443`), computed once, so a narrow desktop window got
  the mobile scene permanently with no way back. `detectTier` asks about the pointer and the core
  count instead — properties of the machine, which is what a tier is about.
- **Leaked listener.** `destroy()` removed `mousemove` and left the `mouseleave` added beside it.
- **`document.createElement('canvas')`** for the pulse sprite is a computed `DataTexture` now, so the
  module reaches for nothing it was not handed except `canvas.ownerDocument`.
- **The invalid `@import`.** `preview.html:99` puts an `@import` after a rule block, which every
  browser ignores — the prototype has been rendering in system fallbacks its whole life. Fonts come
  from `next/font` and are real. **Validate the port against the CSS, not against a screenshot of
  the prototype.**
- **No mobile layout.** Three media queries in 2,509 lines, none touching `.section-inner`: at 375px
  the two-column grid stayed two columns. The restack in `globals.css` is designed, not extracted.
- **The unlayered reset defeating Tailwind.** `* { margin: 0; padding: 0 }` outside a cascade layer
  beats every utility in `@layer utilities` regardless of specificity, so the chat dock's
  `mx-auto px-6 md:px-10` computed to zero and it ran edge to edge. The reset is in `@layer base`.
- **Carousel autoplay** (`:2228-2230`) paused on `mouseenter` and nothing else — a WCAG 2.2 SC 2.2.2
  failure — and its interval outlived the element. It now pauses for hover, focus, touch and reduced
  motion, has a visible pause control, is keyboard operable, and clears its timer.
- **PNG-24 files named `.jpg`**, 4.14 MB, all five fetched eagerly as both hero and thumbnail. Renamed
  to `.png` and served through `next/image` with `sizes`.
- **`renderContact`'s `href="#"`** for the resume (`:2258`), while `public/resume.pdf` sat there.
- **`innerHTML` everywhere.** Every `render*` was string concatenation with no escaping; a caption
  went straight into an `alt` attribute. Titles are `{ strong, muted }` data now and there is no
  `dangerouslySetInnerHTML` in the tree.

## Not ported: the fabricated copy

`MJK_STOPS` (`preview.html:2151`) carries claims `content/memories.yaml` does not license. None of
them came over. The full list, with what the corpus actually says, is in the header of
`content/stops.ts`; four of the six are also enforced by `evals/tier-a/claims.test.ts`, which scans
`content/stops.ts`, `content/static-copy.ts` and `components/stops/**` on every test run.

## Do not

- **Do not put `preview.html` back in `public/`.** It was publicly served, with those claims, until
  this port.
- **Do not port the chat.** `preview.html:2454` iterates `reply.answer`, a key no `REPLIES` entry
  defines, so every submit throws after the camera has already flown. `resetStop` is declared twice
  (`:2421`, `:2461`) and the second shadows the first. The dock in `components/chat/` is a rewrite.
- **Do not pin `three` to anything but `0.169.0`.** The addon internals (`UnrealBloomPass` uniform
  names, `OutputPass`, `mergeGeometries`) are version-coupled.
- **Do not touch cyan or orange from the DOM layer, or oat and amber from the scene.** The two
  palettes never meet.
- **Do not give `lib/mind/scene.ts` a reference to `window` or `document`.** Everything it needs
  comes through `createMind`'s arguments or `canvas.ownerDocument`. That is what makes the scrolljack
  unreachable rather than merely absent.
- **Do not add a sixth compose kind.** Nine stops, five kinds, and the model has no say in either.

## Stale references removed

`route_to_section`, "myelination", "dendritic sprouting" and "Round 3 physics" appeared in earlier
revisions of this file. None exist in the current architecture. The model has no routing tool;
routing is deterministic and comes from retrieval.
