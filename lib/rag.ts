import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

type Memory = {
  id: string;
  section: 'story' | 'timeline' | 'projects' | 'capabilities' | 'contact';
  title: string;
  tags: string[];
  body: string;
};

let cache: Memory[] | null = null;
function all(): Memory[] {
  if (cache) return cache;
  const raw = readFileSync(join(process.cwd(), 'content', 'memories.yaml'), 'utf-8');
  cache = parse(raw) as Memory[];
  return cache;
}

/**
 * Bag-of-words retrieval — good enough for ~200 memories.
 * Swap for embeddings when the corpus grows past ~500.
 */
export async function retrieveMemories(query: string, k = 4): Promise<string> {
  const q = query.toLowerCase();
  const scored = all().map((m) => {
    const hay = `${m.title} ${m.tags.join(' ')} ${m.body}`.toLowerCase();
    let score = 0;
    for (const word of q.split(/\W+/).filter((w) => w.length > 2)) {
      if (hay.includes(word)) score++;
    }
    return { m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, k)
    .filter((s) => s.score > 0)
    .map((s) => `[${s.m.section}/${s.m.id}] ${s.m.title}\n${s.m.body}`)
    .join('\n\n');
}
