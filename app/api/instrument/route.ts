import { createHash, timingSafeEqual } from 'node:crypto';
import { read } from '@/lib/instrument/counters';
import { formatReport, windowDays } from '@/lib/instrument/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The instrument, read. One person, one page of text, `DIRECTION.md` decision 11.
 *
 * ADMISSION FOLLOWS THIS REPOSITORY'S OWN PATTERN rather than inventing one. The secret is
 * an environment variable read with `process.env[VAR]?.trim()`, exactly as
 * `lib/provider.ts` reads `OPENROUTER_API_KEY`, because a secret is a secret and belongs
 * in the environment; and the failure mode is the one `app/api/health/route.ts` argues for
 * in its own comment -- "an unauthenticated endpoint that reports whether a credential is
 * configured tells a stranger which half of the deployment to attack." So this answers
 * **404, never 401**, for a wrong token and for an unset one alike. To anybody without the
 * token, and to anybody scanning, this route does not exist. `app/robots.ts` already
 * disallows `/api/`, and the response carries `noindex` anyway.
 *
 * WITH NO `INSTRUMENT_TOKEN` SET, THE ROUTE IS OFF. That is the deliberate default and it
 * is also the whole rollback: unset the variable and the aggregate becomes unreadable by
 * anyone, including its owner, while the counters carry on costing nothing. Deleting
 * `proxy.ts` stops the denominator. Neither undo touches a line the visitor sees.
 *
 * The token may arrive as `Authorization: Bearer <token>` or as `?key=<token>`. The query
 * form exists because the brief asked for a route MJK can *open*, and a browser cannot set
 * a header -- with the ordinary cost that a URL ends up in history and in the address bar.
 * There is nothing on the page to link out to, so it cannot leak by referrer, and the
 * token is rotatable by editing one environment variable in Coolify.
 */

const TOKEN_VAR = 'INSTRUMENT_TOKEN';

/** The response for "there is nothing here", which is also the response for "wrong key". */
const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * Constant-time comparison over digests rather than over the strings themselves.
 *
 * `timingSafeEqual` throws on differing lengths, and the lengths are themselves a fact
 * worth not leaking, so both sides are hashed to a fixed 32 bytes first. This is the
 * standard construction and it is here rather than as an `===` because a token compared
 * with `===` leaks its prefix to anyone patient enough to measure.
 */
function tokenMatches(offered: string, expected: string): boolean {
  const a = createHash('sha256').update(offered).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const expected = process.env[TOKEN_VAR]?.trim();
  if (!expected) return notFound();

  const url = new URL(req.url);
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const offered = bearer || url.searchParams.get('key') || '';
  if (!offered || !tokenMatches(offered, expected)) return notFound();

  const reading = await read(windowDays(url.searchParams.get('days')));

  const headers = {
    'cache-control': 'no-store',
    // Belt and braces over robots.ts: a page that is only ever fetched with a secret in
    // the URL is exactly the page that must never end up in an index.
    'x-robots-tag': 'noindex, nofollow',
  };

  // `?format=json` returns the same reading unformatted, for piping somewhere. The text is
  // the interface; this is the escape hatch, and it deliberately carries no prose, so
  // nothing that reads it can quote a ratio without the counts underneath it.
  if (url.searchParams.get('format') === 'json') {
    return new Response(JSON.stringify(reading, null, 2), {
      headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
    });
  }

  return new Response(formatReport(reading), {
    headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' },
  });
}
