# MJK Folio

Personal site for Mathew John Kondekeril. Long-scroll editorial with a persistent chat dock that rearranges a WebGL "mind" into the answer.

**Tagline:** *"First I imagine it. Then I learn whatever it takes to build it."*

## Stack
- Next.js 15 (App Router, standalone output)
- react-three-fiber + drei (WebGL mind)
- Tailwind v4 + custom-property palette
- Motion (DOM transitions)
- Vercel AI SDK (streaming) + OpenRouter with key-rotation
- Redis (rate-limit state, path-glow persistence)
- Coolify (Docker deploy)

## Palette rule
Cool inside the mind (cyan filaments, orange pulse — WebGL only). Warm outside (oat + amber — DOM only). They **never touch**.

## Local dev
```
cp .env.example .env       # fill in OPENROUTER_KEYS
docker compose up          # Next + Redis
# or:
npm install && npm run dev
```

## Repo tree
```
app/           routing, layout, chat + health APIs
components/    mind (R3F), sections, chat dock, panel, ui primitives
content/       memories.yaml (RAG), static-copy.ts, system-prompt.md
lib/           openrouter rotation, rag, event bus
reference/     original index.html WebGL — to port into components/mind/
```

## Content is code
The site's "brain" is not the LLM — it's `content/memories.yaml`. Edit that file to change what the site knows about MJK. The system prompt in `content/system-prompt.md` sets voice + guardrails.
