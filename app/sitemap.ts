import type { MetadataRoute } from 'next';
import { SITE } from '@/content/site';

/**
 * Two routes exist: `/` and `/privacy`. This list grows exactly as fast as `app/`
 * grows real pages — no speculative entries.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE.url,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${SITE.url}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
