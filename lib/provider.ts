import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/**
 * Which model answers, and what happens when it will not.
 *
 * The model list is committed code, not configuration, and that is deliberate. Every
 * entry here is a claim about the world that was checked on a date -- that the model
 * exists, that it is free, that its endpoint supports the parameters we send -- and a
 * claim that was checked belongs in a diff, next to the evidence, where a reviewer can
 * see it change and `git blame` can say who changed it and when. In an env var the same
 * decision is invisible: the previous version of this file defaulted to
 * `meta-llama/llama-3.3-70b-instruct:free` via `process.env.OPENROUTER_MODEL`, that model
 * was delisted by OpenRouter, and nothing in the repository could tell anyone -- the
 * failure would have surfaced as a 404 in production with no commit to point at. The API
 * key is a secret and stays in the environment; the model is a decision and stays here.
 *
 * Checked 2026-09-02 against OpenRouter's model list: all four support structured outputs
 * on at least one endpoint. `openrouter/free` sits last as a router of last resort -- it
 * picks whatever free model satisfies the request's features, so it cannot be reasoned
 * about, only fallen back to.
 */
export const PRIMARY_MODEL = 'z-ai/glm-5.2:free';

export const FALLBACK_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'dots-studio/dots-3-note-preview:free',
  'openrouter/free',
];

/**
 * One key. OpenRouter rate-limits per ACCOUNT (20 rpm, 50/day, 1000/day past $10 of
 * credit), so the key rotation this file replaced could not have worked: every key in the
 * list would have shared one budget. Backpressure belongs in a rate limiter, not in a
 * second credential.
 */
const API_KEY_VAR = 'OPENROUTER_API_KEY';

export function hasApiKey(): boolean {
  return Boolean(process.env[API_KEY_VAR]?.trim());
}

/**
 * The model to answer with, plus the call-site options that carry the fallback list.
 *
 * The two settings live where the provider types them, and each ends up verbatim in the
 * outbound JSON body:
 *   - `provider.require_parameters` is a model setting. It tells OpenRouter to route only
 *     to endpoints that support every parameter in the request, so a provider that
 *     silently ignores a structured-output schema is excluded rather than allowed to
 *     answer in prose.
 *   - `models` is a per-request option (`OpenRouterProviderOptions`). OpenRouter tries
 *     `model` first and walks this list on failure, inside the one request.
 *
 * Throws rather than returning a half-configured client: a caller that has not checked
 * `hasApiKey()` first is a bug, and a provider built on an empty key fails later, further
 * from the cause, as a 401 mid-stream.
 */
export function askModel() {
  const apiKey = process.env[API_KEY_VAR]?.trim();
  if (!apiKey) {
    throw new Error(
      `${API_KEY_VAR} is not set. Call hasApiKey() and answer 503 before reaching for a model.`,
    );
  }

  const openrouter = createOpenRouter({ apiKey, appName: 'MJK Folio' });

  return {
    model: openrouter(PRIMARY_MODEL, { provider: { require_parameters: true } }),
    providerOptions: { openrouter: { models: FALLBACK_MODELS } },
  };
}
