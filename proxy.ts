import { NextResponse, type NextRequest } from 'next/server';
import { AI_CRAWLER_USER_AGENTS } from '@/content/site';
import { recordView } from '@/lib/instrument/counters';
import { clientIp, hashIp } from '@/lib/security/limits';

/**
 * The denominator, and nothing else.
 *
 * `DIRECTION.md` decision 11 asks for "sessions, sessions-with-an-ask, and asks split by
 * origin". The ask side of that is counted where the asks arrive, in `lib/ask/handler.ts`.
 * This file exists because a rate of asking needs something to be a rate *of*, and the
 * only honest thing on this server that can be it is the requests the server already
 * served.
 *
 * WHY A REQUEST COUNT AND NOT A BEACON. The accurate way to count human page loads is a
 * small `fetch` fired from the page on mount. It was considered and rejected. A beacon is
 * a new request created for no purpose except to observe the reader, which is precisely
 * the shape of the thing `app/privacy/page.tsx` promises this site does not do, and it is
 * the one design the "nothing new is observed" argument in `lib/instrument/counters.ts`
 * cannot cover. Counting the document request instead is an access-log count -- the thing
 * every web server on earth keeps by default, and which this one already writes to a
 * container log Coolify retains. The cost is accuracy, in a direction that is stated
 * rather than hidden: this over-counts, because a crawler is a request too.
 *
 * WHY NOT A COOKIE, so nobody has to re-derive it: a cookie would make a session real and
 * would make this whole file unnecessary. It is not available. The privacy page says "No
 * cookies", that sentence is load-bearing, and `sessionStorage` is not a loophole either
 * -- ePrivacy Art 5(3) covers storage in a visitor's terminal equipment, not merely the
 * cookie jar. So a session is unmeasurable here, and the report says so in words rather
 * than presenting a request count as if it were people.
 *
 * `proxy.ts` and not `middleware.ts`: Next 16 deprecated the middleware filename in favour
 * of this one, and unlike middleware, proxy runs on the Node.js runtime unconditionally --
 * a `runtime` segment config here is a build error. That is what lets it reach the same
 * ioredis client the limiters use. Nothing here rewrites, redirects or reads a body; it
 * counts and calls `next()`. If this file is deleted, the site is unchanged and the ask
 * counters keep working without a denominator.
 */

export const config = {
  /*
   * Pages only.
   *
   * `api` is excluded because `/api/ask` counts itself with more precision than a request
   * count could, and `/api/health` is Coolify's liveness probe -- counting a monitor every
   * few seconds would swamp the number this file exists to produce. `_next` is the build
   * output. Anything with a dot in it is a file: `robots.txt`, `sitemap.xml`, `icon.svg`,
   * `resume.pdf`, the photographs. The three extensionless metadata routes are named
   * because they are images that would otherwise look like pages.
   */
  matcher: ['/((?!api|_next|opengraph-image|twitter-image|apple-icon|.*\\.).*)'],
};

/**
 * A crawler, a preview unfurler, or a monitor -- coarse, and deliberately so.
 *
 * Kept as a bucket rather than a filter: a number that has silently dropped some of its
 * input is worse than a number with a caveat, so the report shows both and says which is
 * which. The agent string is read, matched, and never stored anywhere.
 *
 * The AI crawlers come from `content/site.ts`, the same array `app/robots.ts` asks them
 * not to index with, so there is one list of those names in the repository rather than
 * two that drift.
 */
const CRAWLER =
  /bot\b|crawler|spider|slurp|headless|lighthouse|preview|scraper|monitor|uptime|pingdom|curl\/|wget|python-requests|go-http-client|facebookexternalhit|whatsapp|telegram|discord|embedly|semrush|ahrefs/i;

const AI_CRAWLERS = AI_CRAWLER_USER_AGENTS.map((name) => name.toLowerCase());

function isCrawler(userAgent: string): boolean {
  if (!userAgent) return true; // no agent string at all is a script, not a reader
  if (CRAWLER.test(userAgent)) return true;
  const lower = userAgent.toLowerCase();
  return AI_CRAWLERS.some((name) => lower.includes(name));
}

/**
 * Whether this request is a browser loading a page, as opposed to the same page's own
 * machinery talking to itself.
 *
 * `sec-fetch-dest: document` is the browser saying, without being asked, what it intends
 * to do with the response; it is the cleanest signal available and every browser this site
 * supports sends it. The `accept` fallback covers the ones that do not.
 *
 * The two Next headers are the important exclusion. A client-side navigation and a
 * prefetch both fetch the route again as an RSC payload, so without this a single reader
 * following one link could count as three views -- and the denominator of the one ratio
 * this instrument exists to produce would quietly inflate with every link added to the
 * page.
 */
function isDocumentRequest(req: NextRequest): boolean {
  if (req.method !== 'GET') return false;
  const headers = req.headers;
  if (headers.get('rsc') || headers.get('next-router-prefetch')) return false;
  const dest = headers.get('sec-fetch-dest');
  if (dest) return dest === 'document';
  return (headers.get('accept') ?? '').includes('text/html');
}

export function proxy(req: NextRequest) {
  if (isDocumentRequest(req)) {
    const bot = isCrawler(req.headers.get('user-agent') ?? '');
    const ip = clientIp(req.headers);
    // The same truncated hash the admission limiter derives from the same header on the
    // same class of request. It goes into a HyperLogLog, which holds registers rather than
    // inputs -- it can be asked how many, never who.
    recordView({ ipHash: ip === 'unknown' || bot ? null : hashIp(ip), bot });
  }
  return NextResponse.next();
}
