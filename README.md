# MJK Folio

Personal site for Mathew John Kondekeril. Long-scroll editorial with a persistent chat dock that rearranges a WebGL "mind" into the answer.

**Tagline:** *"First I imagine it. Then I learn whatever it takes to build it."*

## Stack
- Next.js 16 (App Router, Turbopack, standalone output)
- react-three-fiber + Three.js 0.169 (WebGL mind — being ported to vanilla Three)
- Tailwind v4 + custom-property palette
- AI SDK v7 (`ai`, `@ai-sdk/react`) + `@openrouter/ai-sdk-provider`
- One OpenRouter key; the primary model and its fallback list are committed in `lib/provider.ts`
- Coolify (Docker deploy)

Not yet wired: Redis (`ioredis` is installed for the rate limiter, nothing imports it).

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
app/           routing, layout, /api/ask + /api/health
components/    mind (R3F), sections, chat dock
content/       memories.yaml (RAG), stops.ts, static-copy.ts, system-prompt.md
evals/         tier-A tests — corpus claims, retrieval, stops
lib/           provider, rag, corpus schema, event bus
scripts/       check-corpus.ts — the gate prebuild and CI run
reference/     original index.html WebGL — to port into components/mind/
```

## Content is code
The site's "brain" is not the LLM — it's `content/memories.yaml`. Edit that file to change what the site knows about MJK. The system prompt in `content/system-prompt.md` sets voice + guardrails. `npm run corpus:check` refuses the build when the corpus is wrong.
