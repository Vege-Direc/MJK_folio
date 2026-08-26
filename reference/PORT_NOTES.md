# WebGL port notes

**Source of truth for the scene: `public/preview.html`.** Everything below was verified against the
working tree on 2026-08-26. If this file disagrees with `preview.html` or `app/globals.css`, they win
and this file is a bug.

## Which file is the scene

- **`public/preview.html`** — the authoritative, runnable scene. Port from this.
- **`reference/original-webgl.html`** — **not a page.** Line 400 is
  `<script type="__bundler/template">` holding the real document as ~112 KB of JSON-escaped string on
  line 401. It cannot be opened or iframed as-is, and its inner scene is feature-identical to
  `preview.html`. It is history, not a source.

## Preserve

- Scroll-linked camera path through a pre-formed neural network.
- **Filament `#3ecfff`, pulse `#ff8a3d`.** These are the values in `preview.html`,
  `original-webgl.html` and `app/globals.css` — all three agree. (An earlier revision of this file
  named `#4dd4e8` / `#ff7a3d`. Both were wrong.)
- Node cluster density and drift physics; the desktop/mobile `CFG` tables (`preview.html:448`).
- The three render tiers, the nebula, and the `UnrealBloom` pass.
- `public/far-network.json` — the tier-3 topology (4,664 nodes / 4,642 edges), decoded from the
  base64 data URI that was at `preview.html:310`. `meta.params` preserves every generation parameter.
  The generator script was never committed and does not exist.

## Do not

- **Do not port into `components/mind/Cortex.tsx`.** That file is a partial R3F re-implementation that
  drifted from the scene; it is slated for deletion along with `geometry.ts`, `useActivation.ts`,
  `useScrollProgress.ts` and `MindScene.tsx`. Extract the vanilla scene verbatim into one module
  instead and mount it from a thin client component.
- **Do not port the chat.** `preview.html`'s chat is dead code: line 2454 iterates `reply.answer`, a
  key no `REPLIES` entry defines, so every submit throws after the camera flies. `resetStop` is also
  declared twice (`:2421`, `:2461`) and the second shadows the first. Port the **scene and the CSS**;
  rewrite the chat, the answer rendering and the reset logic.
- **Do not pin `three` to anything but `0.169.0`.** `preview.html:363` imports `three@0.169.0` via
  importmap; the scene must run against the version it was authored for.
- **Do not touch cyan or orange from the DOM layer.** They are WebGL-only. Warm oat/amber is DOM-only.
  The two palettes never meet.
- **Do not re-suppress user scroll during a camera flight.** `preview.html:1728` does, and
  `:1748-1762` then moves the document in a single frame at `onComplete` — a scrolljack plus a hard
  context change. That behaviour is a known defect to fix in the port, not a behaviour to preserve.

## Stale references removed

`route_to_section`, "myelination", "dendritic sprouting" and "Round 3 physics" appeared in earlier
revisions of this file. None of them exist in the current architecture. The model has no routing tool;
routing is deterministic and comes from retrieval.
