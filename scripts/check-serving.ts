/**
 * Is the thing on that port actually serving this build, or is it a zombie?
 *
 * WHY THIS EXISTS. A server was found on port 3000, four hours old, answering 200 with
 * HTML that rendered perfectly — all nine sections, the canvas, the dock — while **every
 * hashed chunk it referenced returned 500**. Measured: `data-stop` never written,
 * `--dock-h` never set, no client JavaScript at all, and no error visible anywhere on the
 * page. It looked like a working site and was inert.
 *
 * WHAT CAUSES THAT IS NOT ESTABLISHED, and this file will not pretend otherwise. The
 * obvious theory — that a rebuild deletes the chunks a running `next start` still points
 * at — was tested twice and is WRONG: `next start` re-reads `.next` per request and
 * self-heals, both after an identical rebuild and after a rebuild with changed source.
 * Whatever produced the real one (a wiped `.next`, a build run in a git worktree, a
 * standalone server holding its own copies) was gone before it could be dissected.
 *
 * So this script detects the CONDITION and does not diagnose the cause. That is the part
 * worth having: the condition is silent, and it is the only failure mode here that makes a
 * page lie to you rather than break in front of you.
 *
 * That cost a real investigation. An agent measuring against such a server reported
 * `next dev` "never hydrates": `data-stop` never written, `requestIdleCallback` never
 * fired, the HMR socket failing. All three were true, and none of them was a bug in this
 * repository — it was a production server from four hours earlier, on the port `next dev`
 * would have used, serving a build that no longer existed. The HMR socket "failing" was
 * the loudest clue and the easiest to misread: production has no HMR endpoint to fail.
 *
 * So this is the check that turns four hours into four seconds. Point it at a URL before
 * you believe anything you measure there.
 *
 *   npm run serve:check                       # defaults to the dev port
 *   npm run serve:check -- http://localhost:3000
 *
 * It deliberately does NOT start or stop anything. Killing a server someone else is using
 * is worse than reporting on it.
 */

const DEFAULT_URL = 'http://localhost:3001/';

/** Every `/_next/static/…` asset the document asks for, in order, deduplicated. */
function assetsIn(html: string): string[] {
  const seen = new Set<string>();
  // `src="…"` and `href="…"`, single or double quoted. Turbopack hashes the basename,
  // which is the whole point: a stale reference cannot be repaired by a retry.
  const re = /(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g;
  for (const m of html.matchAll(re)) seen.add(m[1]);
  return [...seen];
}

async function main() {
  const target = process.argv[2] ?? DEFAULT_URL;
  const base = new URL(target);

  let html: string;
  try {
    const res = await fetch(base, { headers: { accept: 'text/html' } });
    if (!res.ok) {
      console.error(`✗ ${base.origin} answered ${res.status} for the document itself.`);
      process.exit(1);
    }
    html = await res.text();
  } catch (err) {
    console.error(`✗ nothing is listening at ${base.origin} — ${(err as Error).message}`);
    console.error('  Start one, or check the port: a server you started earlier may have exited.');
    process.exit(1);
  }

  const assets = assetsIn(html);
  if (assets.length === 0) {
    console.error(`✗ ${base.origin} served HTML that references no /_next/static assets at all.`);
    console.error('  That is not a Next build. Check what is on this port.');
    process.exit(1);
  }

  const results = await Promise.all(
    assets.map(async (path) => {
      const url = new URL(path, base);
      try {
        const res = await fetch(url, { method: 'GET' });
        return { path, status: res.status };
      } catch {
        return { path, status: 0 };
      }
    }),
  );

  const broken = results.filter((r) => r.status !== 200);

  /*
   * No dev-or-production label here, deliberately. The first version guessed one from
   * markers in the HTML and called a running `next dev` "production", which is exactly the
   * kind of confident wrong label that sent the original investigation after the wrong
   * thing. What this script can answer honestly is whether the assets resolve, so that is
   * all it says.
   */
  console.log(`${base.origin} — ${assets.length} static assets referenced`);

  if (broken.length === 0) {
    console.log('✓ every referenced asset resolves. This server is serving its own build.');
    return;
  }

  console.error('');
  console.error(`✗ ZOMBIE: ${broken.length} of ${assets.length} referenced assets do not resolve.`);
  for (const b of broken.slice(0, 6)) console.error(`    ${b.status || 'no response'}  ${b.path}`);
  if (broken.length > 6) console.error(`    … and ${broken.length - 6} more`);
  console.error('');
  console.error('  This server is serving HTML that points at assets it cannot produce. The page will');
  console.error('  render completely and load no client JavaScript, so nothing hydrates and no error');
  console.error('  appears anywhere on it. It will look like a working site.');
  console.error('');
  console.error('  Do not measure anything against it. Stop it and start a fresh one.');
  process.exit(1);
}

void main();
