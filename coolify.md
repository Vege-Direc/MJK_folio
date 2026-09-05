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

## Limits

OpenRouter rate-limits the account, not the visitor: 20 requests/minute, 1000/day. One
abusive visitor can exhaust the whole site's day if nothing stands between them and that
budget. `lib/security/limits.ts` enforces three ceilings, checked cheapest-to-the-abuser
first:

- **ip-burst** -- 6 requests / 60 s, per visitor (a script running in a tight loop).
- **ip-day** -- 40 requests / 24 h, per visitor.
- **global-day** -- `ASK_DAILY_BUDGET` requests / 24 h, shared by every visitor.
  Defaults to 800, set as an env var, kept comfortably under OpenRouter's 1000/day cap.

**The global budget is the primary control.** The per-IP ceilings shape how one visitor
behaves; the global budget is what actually keeps the account's daily request count
under OpenRouter's cap no matter how usage is distributed across visitors, IPs, or
proxies -- it is the one limit that holds even if IP attribution is imperfect (see the
`clientIp` doc comment in `lib/security/limits.ts` for why that attribution is trusted
only as far as this deployment's proxy topology allows). When any ceiling is hit, the
site never shows an error: it renders `lib/fallback.ts`'s licensed fallback copy instead.

Limiter state lives in Redis (`REDIS_URL`) when it is set, so the ceilings hold across
every app instance; it falls back to in-process memory when Redis is absent or
unreachable, which loosens the ceilings to per-container rather than failing requests.

**Cloudflare in front is still recommended**, even with the above in place. It stops
abusive traffic before it reaches Traefik at all (WAF rules, bot management, its own
rate limiting), and it is the layer to add if `clientIp`'s single-hop trust assumption
ever needs to change -- Cloudflare's `x-forwarded-for` handling and Traefik's need to
agree on which hop is the real client. Application-level limits are a backstop, not a
substitute, for stopping abuse at the edge.
