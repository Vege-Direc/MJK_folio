# Coolify deploy

Runs alongside Mrunn and Jewel AI on your existing Coolify host.

**Build:** Dockerfile (auto-detected)
**Port:** 3000
**Health check:** `GET /api/health` returns 200

**Env vars to set in Coolify:**
- `OPENROUTER_KEYS` — comma-separated keys, rotated at runtime
- `OPENROUTER_MODEL` — default `meta-llama/llama-3.3-70b-instruct:free`
- `REDIS_URL` — Coolify's one-click Redis service URL
- `NEXT_TELEMETRY_DISABLED=1`

**Domain:** point your DNS + TLS to the app service via Coolify's proxy.

**Zero-downtime:** enabled by default. Coolify rolls the container on green health check.
