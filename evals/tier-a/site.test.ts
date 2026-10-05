/**
 * Launch-hygiene surface: content/site.ts, app/sitemap.ts, app/robots.ts, and the
 * JSON-LD serialiser in lib/json-ld.ts.
 *
 * app/layout.tsx itself is deliberately NOT imported here. It imports
 * `next/font/google`, which is a compile-time macro the Next.js compiler rewrites —
 * calling it under plain vitest throws, not because the metadata is wrong but because
 * the module can only be evaluated inside a Next.js build. So this file tests the data
 * layout.tsx is built from (SITE, the JSON-LD it renders, and the file-convention
 * routes) rather than importing the layout module directly. Confirmed empirically:
 * importing app/layout.tsx here fails with "Cannot find package '@/components/...'"
 * even before font resolution is reached (vitest's resolver has no bundler pass), and
 * the font call itself throws once resolution is fixed.
 */
import { describe, expect, it } from 'vitest';
import robots from '../../app/robots';
import sitemap from '../../app/sitemap';
import { AI_CRAWLER_USER_AGENTS, SITE } from '../../content/site';
import { serializeJsonLd } from '../../lib/json-ld';

describe('SITE', () => {
  it('has a valid URL', () => {
    expect(() => new URL(SITE.url)).not.toThrow();
  });

  it('carries the title and description app/layout.tsx builds metadata from', () => {
    expect(SITE.title.trim().length).toBeGreaterThan(0);
    expect(SITE.description.trim().length).toBeGreaterThan(0);
  });

  it('gives every contact link an absolute, well-formed URL', () => {
    expect(() => new URL(SITE.github)).not.toThrow();
    expect(() => new URL(SITE.linkedin)).not.toThrow();
    expect(SITE.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});

describe('sitemap', () => {
  it('lists the home page and /privacy, each with a lastModified date', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(SITE.url);
    expect(urls).toContain(`${SITE.url}/privacy`);
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});

describe('robots', () => {
  it('allows everything by default but disallows /api/', () => {
    const { rules } = robots();
    const ruleList = Array.isArray(rules) ? rules : [rules];
    const wildcard = ruleList.find((r) => r.userAgent === '*');

    expect(wildcard).toBeTruthy();
    expect(wildcard?.allow).toBe('/');
    expect(wildcard?.disallow).toBe('/api/');
  });

  it('blocks every AI-training crawler in content/site.ts, and only those', () => {
    const { rules } = robots();
    const ruleList = Array.isArray(rules) ? rules : [rules];
    const blockedAgents = ruleList.filter((r) => r.disallow === '/' && r.userAgent !== '*').map((r) => r.userAgent);

    expect([...blockedAgents].sort()).toEqual([...AI_CRAWLER_USER_AGENTS].sort());
  });

  it('points at the sitemap this repo actually serves', () => {
    expect(robots().sitemap).toBe(`${SITE.url}/sitemap.xml`);
  });
});

describe('serializeJsonLd', () => {
  it('round-trips a plain object', () => {
    const data = { '@type': 'Person', name: SITE.name };
    expect(JSON.parse(serializeJsonLd(data).replace(/\\u003c/g, '<'))).toEqual(data);
  });

  it('never emits a literal "<", even when a field contains one', () => {
    const hostile = { name: 'MJK', bio: '</script><script>alert(1)</script>' };
    const out = serializeJsonLd(hostile);

    expect(out).not.toContain('<');
    expect(out).toContain('\\u003cscript>');
  });
});
