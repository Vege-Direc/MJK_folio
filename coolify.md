# Coolify deploy

Runs alongside Mrunn and Jewel AI on your existing Coolify host.

**Build:** Dockerfile (auto-detected)
**Port:** 3000
**Health check:** `GET /api/health` returns `{"ok":true}`

**Env vars to set in Coolify:**
- `OPENROUTER_API_KEY` — one key. OpenRouter rate-limits per account, so more keys add nothing.
- `REDIS_URL` — Coolify's one-click Redis service URL. Reserved for rate-limit state.
- `NEXT_TELEMETRY_DISABLED=1`
- `NEXT_PUBLIC_SITE_URL` — the public https origin (e.g. `https://mathewjohnk.com`). Feeds
  metadata, Open Graph, JSON-LD and the sitemap; wrong or unset here means shared links
  and search results point at `localhost`.

The model is not an env var. `lib/provider.ts` commits the primary model and the fallback
list, because each entry is a checked claim that belongs in a diff.

**Turn gzip OFF for this app** (Advanced → Gzip Compression). `/api/ask` answers with
Server-Sent Events, and the proxy buffers a compressed response until it is complete: the
answer still arrives, all at once, at the end. The stream is the feature.

**Domain:** point your DNS + TLS to the app service via Coolify's proxy.

**Zero-downtime:** enabled by default. Coolify rolls the container on green health check.
