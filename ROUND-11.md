# Round 11 — Preview → repo sync

## What's in this round

The current working artifact is `public/preview.html` — a single self-contained HTML file that runs the full experience:

- Original WebGL scene (waypoints, filaments, dendrites, far-network atmosphere) — untouched from your `reference/original-webgl.html`
- 9 stops, editorial two-column composition (kicker / title / body on one side, media on the other)
- Real carousel component on the RD350 stop with:
  - Large hero image, 5-thumb strip, current/total counter
  - Auto-advance every 5.2s, pause on hover, click-to-swap
- Persistent chat dock at the bottom
- Chat answers stream as an **appended paragraph** into the target stop's body, tagged with the user's question — the title/kicker are never overwritten, so follow-up asks accumulate as a real conversation
- 5 RD350 photos, re-treated (light warm-neutral wash, contrast preserved, people cropped out of the profile shot)

## Files added / changed under `mjk-folio/`

    public/preview.html                        (new — full working artifact)
    public/media/rd350/{1..5}.jpg              (new — treated photos)
    media/rd350/{1..5}.jpg                     (mirror for local-file access)
    ROUND-11.md                                (this file)

## To review locally

Open `public/preview.html` in a browser directly — it is self-contained.
Or run `npm run dev` and visit `http://localhost:3000/preview.html`.

## To fold into the Next.js app (later)

The current Next scaffold still has the placeholder sections from round 10. The
authoritative visual + interaction design now lives in `public/preview.html`.
Port pattern per component:

- **Sections** — each stop's compose type ('hero' | 'plain' | 'cards' |
  'carousel' | 'contact') becomes a small React component in
  `components/sections/`. Pull the JSX shape from the `renderStopHTML`
  function inside preview.html.
- **Carousel** — `components/media/Carousel.tsx` (a straight port of
  `renderCarousel` + `wireCarousel`, using `useState` and `useEffect`
  for auto-advance).
- **Chat streaming** — the `streamReplace` function in preview.html is the
  authoritative UX; replace canned REPLIES with the OpenRouter route
  (`app/api/chat/route.ts`) once the backend is up on Coolify.
- **WebGL** — keep `reference/original-webgl.html` as the source of truth
  and mount it via `<iframe>` in Next, OR port the scene into R3F later.
  For round 11 the raw HTML is the priority; do not attempt a partial R3F
  port that will drift.

## Outstanding (from the todo list)

1. Apply carousel/gallery to origin, engineering, pivot, APAC, projects stops
2. Wire chat streaming into all 9 stops (only 5 REPLIES targets today)
3. Ask-history within a stop (new question currently replaces the old answer)
4. Real AI: OpenRouter streaming through the Mastra/AI SDK backend on Coolify
5. Photography brief for remaining sections
6. Mobile pass (<900px): per-stop stacking rules
