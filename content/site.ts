/**
 * Site identity. Single source of truth for the facts metadata, JSON-LD, the sitemap
 * and robots.ts all need — the same discipline as content/stops.ts: one array or object,
 * imported everywhere the fact is needed, instead of a second hand-typed copy per file.
 *
 * Every value here is a checked fact from the résumé (name, role, contact, links) or a
 * line already shipped in content/static-copy.ts (tagline, description). Nothing here
 * is invented. If a fact isn't already committed elsewhere in the repo, it doesn't
 * belong in this file.
 */

export const SITE = {
  name: 'Mathew John Kondekeril',
  shortName: 'MJK',
  title: 'Mathew John Kondekeril — First I imagine it. Then I learn whatever it takes to build it.',
  description: 'Engineer by training, marketer by trade, builder by habit. Ask the site anything.',
  tagline: 'First I imagine it. Then I learn whatever it takes to build it.',
  // The production origin. NEXT_PUBLIC_SITE_URL overrides it for previews and local runs.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mjk.nila.li',
  email: 'mathew_johnk@hotmail.com',
  github: 'https://github.com/Vege-Direc',
  linkedin: 'https://www.linkedin.com/in/mathew-john-kondekeril',
  locale: 'en_SG',
} as const;

/**
 * AI-training crawlers to disallow in robots.ts. A separate const, not inlined in
 * robots.ts, so blocking or unblocking one of these is a one-line diff in one place —
 * the owner decides later which of these actually get blocked in production.
 */
export const AI_CRAWLER_USER_AGENTS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'CCBot',
  'Bytespider',
  'anthropic-ai',
  'PerplexityBot',
  'Applebot-Extended',
] as const;
