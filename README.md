# MJK Folio

Personal site for Mathew John Kondekeril. Long-scroll editorial with a persistent chat dock that routes each answer into the stop it belongs to, over a WebGL "mind" the camera travels through as you scroll.

**Twelve stops**, in this order and no other: `hero, origin, apac, now, work, asanjo,
jewelai, mrunn, engineering, pivot, rd350, contact`. `contact` must stay last — the last
waypoint is pulled back along its own segment, and a test asserts the stop that lands there.
Twelve is terminal: the eighth thing MJK ships becomes a tile on §04's index, not a §12.

Changing the *number* of stops re-rolls `mulberry32(0x5eed ^ M)` and invalidates every
screenshot-derived number in this repo. Changing the *order* does not.

**Tagline:** *"First I imagine it. Then I learn whatever it takes to build it."*

## Stack
- Next.js 16 (App Router, Turbopack, standalone output)
- Three.js 0.169, vanilla, in `lib/mind/` (no react-three-fiber; the scene owns no React state)
- Tailwind v4 + custom-property palette
- AI SDK v7 (`ai`, `@ai-sdk/react`) + `@openrouter/ai-sdk-provider`
- One OpenRouter key; the primary model and its fallback list are committed in `lib/provider.ts`
- minisearch (BM25 retrieval and routing), rate-limiter-flexible over ioredis (admission), Redis in production
- Coolify (Docker deploy)

## Palette rule
Cool inside the mind (cyan filaments, orange pulse — WebGL only). Warm outside (oat + amber — DOM only). They **never touch** in the DOM.

**One amendment, made in the open rather than taken as a silent exception (`f916af3`).** The
intro gate's portrait is cyan, because the gate is ruled part of the WebGL layer, where cyan
is already native. It is not an exception to the rule; it is the rule applied to a surface
that had not existed when the rule was written. A cyan mark anywhere in the DOM is still a
defect.

## When a server lies to you

`npm run dev` is pinned to **3001** and `npm start` to **3000**, so the two can run at once
and neither can shadow the other. That split exists because of a real failure: a four-hour-old
server was found on 3000 answering 200 with HTML that rendered perfectly — every section, the
canvas, the dock — while **every hashed chunk it referenced returned 500**. No client
JavaScript ran, `data-stop` was never written, and nothing on the page said so.

It was reported as "`next dev` never hydrates". It was not a dev-server bug and it was not in
this repository.

```
npm run serve:check                        # the dev port
npm run serve:check -- http://localhost:3000
```

**Run it before you believe anything you measure against a server.** The signature to
recognise by eye: the page renders, sections are present, and yet `data-stop` is unset,
`--dock-h` is empty and the console shows 500s for `/_next/static/…`. That is not a bug in the
page. You are talking to a server that cannot serve its own build.

The cause is not established — the obvious theory, that a rebuild strands a running
`next start`, was tested and is wrong; it re-reads `.next` and self-heals. The check detects
the condition without claiming to diagnose it.

## Local dev
```
cp .env.example .env       # fill in OPENROUTER_API_KEY; drop REDIS_URL unless you run Redis
docker compose up          # Next + Redis
# or:
npm install && npm run dev
```

## Repo tree
```
app/           routing, layout, globals.css (the design layer), /api/ask + /api/health + /api/instrument, metadata routes
proxy.ts       counts document requests, and nothing else — the denominator for the instrument
components/    mind/ (canvas mount + scroll→progress, the intro gate), stops/ (the twelve sections), chat/ (dock, provider, docked answer)
content/       memories.yaml (the corpus), stops.ts (identity + layout + authored copy), static-copy.ts (the per-stop prompt chips), system-prompt.md, site.ts
evals/         tier-A tests — authored claims, retrieval + routing table, grounding fixtures, limits, the ask route, site
lib/           mind/ (the three.js scene), ask/ (the answer path), retrieve, grounding/, security/, instrument/, fallback, provider, corpus/
scripts/       check-corpus.ts (the gate prebuild and CI run), check-serving.ts (`serve:check`), route-eval.ts, guard-eval.ts, make-portrait.ts
public/        far-network.json (tier-3 topology, fetched at runtime), media/rd350/, resume.pdf
reference/     preview.html — the prototype the scene and layout were ported from; PORT_NOTES.md
```

## Content is code
The site's "brain" is not the LLM — it's `content/memories.yaml`. Edit that file to change what the site knows about MJK. The system prompt in `content/system-prompt.md` sets voice + guardrails. `npm run corpus:check` refuses the build when the corpus is wrong. Every stop needs at least two memories; the checker says which are thin.

**As of 2026-09-06: 55 memories, 44 of them cardable, and 29 of the 55 reach the rendered
HTML** against a floor of 29 and a target of 55 — the rule-24 count, printed by
`corpus:check` and deliberately unflattering. The routing table is **77 questions with 164
authored aliases**, gated at `MIN_ACCURACY = 0.9`. **Re-run the scripts before quoting any
of these; every one of them moves on the next push, and three of them were quoted stale in
three documents at once.**

## How an answer happens
```
t≈0     POST /api/ask  — validate {question, history}; admit (per-IP burst, per-IP day, global day)
t≈1ms   retrieve()     — BM25 over content/memories.yaml → stopId, confidence, licensing memories
                         warm: p50 0.17ms, p95 0.80ms. 5ms is the pessimistic end, not the measurement
t≈10ms  data-route     — the page scrolls to the stop; the scene follows scroll as it always does
t≈15ms  data-envelope  — kicker, title, cards (by memory id), cites. The whole layout, deterministic.
…       text           — the model streams prose, and only prose (reasoning disabled)
end     guard()        — every number and proper noun checked against the retrieved memories
        verified · salvaged (bad sentences removed) · replaced (the memory text itself is shown)
```
**The intro gate** runs before any of this — a particle portrait that assembles, holds, and is
flown through — and it is skipped for reduced motion, a return visit, a hash deep link and
JavaScript off, so it reaches a minority of visits and cannot be the delivery mechanism for
anything the hero must say. **Today it reaches nobody without being asked for.** It ships
behind a placeholder guard: `INTRO_NEEDS_FORCING = PORTRAIT.placeholder` compiles
`if (true && !f) return;` into the pre-paint decision script, so while the portrait is a
synthetic head the gate runs only with `?intro=1`. **It refuses to run on a face that is not
his**, and that is the guard, not the `console.warn` beside it.

Every refusal path (throttled, budget spent, off-topic, provider down) is HTTP 200 with an
envelope built from corpus text. The model has no layout authority and no structured-output
requirement; that is what makes free models safe here. `npm run route:eval` and
`npm run guard:eval` print the routing table and the guard fixtures.

## The instrument
The site's whole thesis is that visitors will **ask** rather than only scroll, and until
now nothing checked it: every claim in `PLAN.md` was measured against panel judgement, and
none against a real visitor. Meanwhile `lib/security/limits.ts` had been running a Redis
daily counter on `/api/ask` since admission control shipped, and nobody had ever read the
number it held.

`lib/instrument/counters.ts` reads it, plus four things beside it — page views, the
**card / chip / typed** split nobody has published for any site, how many questions a
conversation got, and what the guard did with the answer. Five Redis hashes and two
HyperLogLogs per UTC day, ninety days, no new dependency and no third party.

**It counts only what the server already handled.** No cookie, no `localStorage`, no
`sessionStorage`, no beacon, no identifier of any kind — which is also why a *session* is
unmeasurable here and the report says so rather than calling a request a person.
`app/privacy/page.tsx` names all of it in the site's own voice; if that page and this code
ever disagree, the page is right and the code is the bug.

```
GET /api/instrument?key=$INSTRUMENT_TOKEN[&days=30][&format=json]
```
Plain text, one screen, every ratio printed next to the counts it came from and a Wilson
interval around it. With `INSTRUMENT_TOKEN` unset the route answers **404** — to everyone,
including its owner. That is the default and the rollback; deleting `proxy.ts` drops the
denominator and changes nothing a visitor sees.
