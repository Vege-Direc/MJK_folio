/**
 * The one place the corpus is read at runtime. Every memory is validated against
 * `memorySchema` on load, so a bad entry fails the first request loudly instead of
 * being retrieved silently. `scripts/check-corpus.ts` catches the same thing at
 * build time; this is the runtime half of that promise.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { StopId } from '../../content/stops';
import { memorySchema, type Memory } from './schema';

let cache: Memory[] | null = null;

export function loadMemories(): Memory[] {
  if (cache) return cache;
  const raw = readFileSync(join(process.cwd(), 'content', 'memories.yaml'), 'utf-8');
  const parsed: unknown = parse(raw);
  if (!Array.isArray(parsed)) throw new Error('content/memories.yaml must be a YAML list of memories');
  cache = parsed.map((entry, i) => {
    const result = memorySchema.safeParse(entry);
    if (!result.success) {
      const detail = result.error.issues.map((issue) => issue.message).join('; ');
      throw new Error(`content/memories.yaml entry #${i + 1} is invalid: ${detail}`);
    }
    return result.data;
  });
  return cache;
}

export function memoriesForStop(stopId: StopId): Memory[] {
  return loadMemories().filter((m) => m.stopId === stopId);
}

export function memoryById(id: string): Memory | undefined {
  return loadMemories().find((m) => m.id === id);
}
