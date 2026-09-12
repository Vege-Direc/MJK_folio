import type { MetadataRoute } from 'next';
import { AI_CRAWLER_USER_AGENTS, SITE } from '@/content/site';

/**
 * `/api/` is disallowed because it's machinery (the chat route, health check), not
 * content — nothing there is meant to be indexed.
 *
 * The AI-training-crawler block is a default, not a verdict: AI_CRAWLER_USER_AGENTS
 * lives in content/site.ts as one array so the owner can add, remove, or drop the
 * whole block later without touching this file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        disallow: '/',
      })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
