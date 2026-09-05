# MJK Folio

Personal site for Mathew John Kondekeril. Long-scroll editorial with a persistent chat dock that routes each answer into the stop it belongs to, over a WebGL "mind" the camera travels through as you scroll.

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
Cool inside the mind (cyan filaments, orange pulse — WebGL only). Warm outside (oat + amber — DOM only). They **never touch**.

## Local dev
```
cp .env.example .env       # fill in OPENROUTER_API_KEY; drop REDIS_URL unless you run Redis
docker compose up          # Next + Redis
# or:
npm install && npm run dev
```

## Repo tree
```
app/           routing, layout, globals.css (the design layer), /api/ask + /api/health, metadata routes
components/    mind/ (canvas mount + scroll→progress), stops/ (the nine sections), chat/ (dock, provider, docked answer)
content/       memories.yaml (the corpus), stops.ts (identity + layout + authored copy), system-prompt.md, site.ts
evals/         tier-A tests — authored claims, retrieval + routing table, grounding fixtures, limits, the ask route, site
lib/           mind/ (the three.js scene), ask/ (the answer path), retrieve, grounding/, security/, fallback, provider, corpus/
scripts/       check-corpus.ts (the gate prebuild and CI run), route-eval.ts, guard-eval.ts
public/        far-network.json (tier-3 topology, fetched at runtime), media/rd350/, resume.pdf
reference/     preview.html — the prototype the scene and layout were ported from; PORT_NOTES.md
```

## Content is code
The site's "brain" is not the LLM — it's `content/memories.yaml`. Edit that file to change what the site knows about MJK. The system prompt in `content/system-prompt.md` sets voice + guardrails. `npm run corpus:check` refuses the build when the corpus is wrong. Every stop needs at least two memories; the checker says which are thin.

## How an answer happens
```
t≈0     POST /api/ask  — validate {question, history}; admit (per-IP burst, per-IP day, global day)
t≈5ms   retrieve()     — BM25 over content/memories.yaml → stopId, confidence, licensing memories
t≈10ms  data-route     — the page scrolls to the stop; the scene follows scroll as it always does
t≈15ms  data-envelope  — kicker, title, cards (by memory id), cites. The whole layout, deterministic.
…       text           — the model streams prose, and only prose (reasoning disabled)
end     guard()        — every number and proper noun checked against the retrieved memories
        verified · salvaged (bad sentences removed) · replaced (the memory text itself is shown)
```
Every refusal path (throttled, budget spent, off-topic, provider down) is HTTP 200 with an
envelope built from corpus text. The model has no layout authority and no structured-output
requirement; that is what makes free models safe here. `npm run route:eval` and
`npm run guard:eval` print the routing table and the guard fixtures.
