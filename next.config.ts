import type { NextConfig } from 'next';

/**
 * `output: 'standalone'` traces the module graph and copies only what it reaches.
 * It cannot see `content/`: the ask route and lib/rag.ts read
 * `content/system-prompt.md` and `content/memories.yaml` off disk with
 * `readFileSync(join(process.cwd(), ...))`, which is a runtime string, not an import.
 * The Dockerfile copies `.next/standalone` and nothing else, so before this block the
 * production container shipped without the corpus and every answer was a 500 — a fault
 * no local `next dev` run could reproduce, because dev serves from the repo.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  /*
   * Next's default is `['image/webp']`, so the carousel was serving WebP to browsers
   * that would have taken AVIF — measured at 221.6 KB across its ten requests. AVIF
   * first, WebP for anything that cannot take it.
   */
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // `next dev` writes AGENTS.md and CLAUDE.md into the repo root and rewrites them on
  // every run. Neither was asked for, and a CLAUDE.md that appears by itself is a file
  // people edit and then lose. Turn it back on deliberately if the repo wants one.
  agentRules: false,
  outputFileTracingIncludes: {
    '/api/ask': ['./content/**'],
  },
};

export default nextConfig;
