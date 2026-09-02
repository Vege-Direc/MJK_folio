# MJK Folio

Personal site for Mathew John Kondekeril. Long-scroll editorial with a persistent chat dock that rearranges a WebGL "mind" into the answer.

**Tagline:** *"First I imagine it. Then I learn whatever it takes to build it."*

## Stack
- Next.js 16 (App Router, Turbopack, standalone output)
- Three.js 0.169, vanilla, in `lib/mind/` (no react-three-fiber; the scene owns no React state)
- Tailwind v4 + custom-property palette
- AI SDK v7 (`ai`, `@ai-sdk/react`) + `@openrouter/ai-sdk-provider`
- One OpenRouter key; the primary model and its fallback list are committed in `lib/provider.ts`
- Coolify (Docker deploy)

Not yet wired: Redis (`ioredis` is installed for the rate limiter, nothing imports it), and the
chat dock does not yet dock its answers into the stops — every stop renders an empty
`#answer-<stopId>` for that.

## Palette rule
Cool inside the mind (cyan filaments, orange pulse — WebGL only). Warm outside (oat + amber — DOM only). They **never touch**.

## Local dev
```
cp .env.example .env       # fill in OPENROUTER_API_KEY
docker compose up          # Next + Redis
# or:
npm install && npm run dev
```

## Repo tree
```
app/           routing, layout, globals.css (the design layer), /api/ask + /api/health
components/    mind/ (canvas mount + scroll->progress), stops/ (the nine sections), chat/
content/       memories.yaml (RAG), stops.ts (identity + layout + authored copy), system-prompt.md
evals/         tier-A tests — authored claims, retrieval, stops
lib/           mind/ (the three.js scene), provider, rag, corpus loader + schema
scripts/       check-corpus.ts — the gate prebuild and CI run
public/        far-network.json (tier-3 topology, fetched at runtime), media/rd350/, resume.pdf
reference/     preview.html — the prototype the scene and layout were ported from
```

## Content is code
The site's "brain" is not the LLM — it's `content/memories.yaml`. Edit that file to change what the site knows about MJK. The system prompt in `content/system-prompt.md` sets voice + guardrails. `npm run corpus:check` refuses the build when the corpus is wrong.
