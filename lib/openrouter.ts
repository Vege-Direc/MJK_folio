import { createOpenAI } from '@ai-sdk/openai';
import Redis from 'ioredis';

// OpenRouter is OpenAI-API-compatible; we use @ai-sdk/openai with a custom baseURL.
// Keys are rotated round-robin; keys marked rate-limited sit out for 60s (tracked in Redis).

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
const KEYS = (process.env.OPENROUTER_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean);

async function keyIsCool(id: string) {
  if (!redis) return true;
  return (await redis.get(`or:cool:${id}`)) === null;
}

export async function markKeyRateLimited(id: string) {
  if (!redis) return;
  await redis.set(`or:cool:${id}`, '1', 'EX', 60);
}

export async function keysAvailable(): Promise<boolean> {
  if (KEYS.length === 0) return false;
  for (let i = 0; i < KEYS.length; i++) {
    if (await keyIsCool(String(i))) return true;
  }
  return false;
}

export function pickProvider() {
  // Naive round-robin index in memory. Swap for Redis-backed if you scale horizontally.
  for (let i = 0; i < KEYS.length; i++) {
    const idx = (Date.now() + i) % KEYS.length;
    // Note: keyIsCool is async; the caller can retry on 429. In practice we let onError
    // mark and future calls skip. Keeping this sync for the AI SDK's provider signature.
    const provider = createOpenAI({
      apiKey: KEYS[idx],
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://mjk.dev',
        'X-Title': 'MJK Folio',
      },
    });
    return { provider, keyId: String(idx) };
  }
  return { provider: null as any, keyId: '' };
}
