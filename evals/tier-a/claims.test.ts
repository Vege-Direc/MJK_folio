/**
 * Authored copy makes no claim the corpus does not license.
 *
 * This file was written to be temporary. Its header said to delete it once the sections
 * rendered from the corpus and the second copy of every fact stopped existing. That has
 * now happened -- `components/sections/*` is gone and every card on every stop is built
 * from `content/memories.yaml` -- and the test is still here, because the premise was
 * wrong.
 *
 * Authored copy did not go away. It moved. `content/stops.ts` carries a title and a body
 * for each of the nine stops, and that copy is exactly the kind that shipped the
 * fabrications: first-person, confident, and typed by hand next to a corpus that says
 * something slightly different. The prototype's own stop table
 * (`reference/preview.html:2151`) held four of the six retired claims below on the day
 * this port began, and porting it was a line-by-line exercise in not carrying them over.
 *
 * So the scanner is permanent, and it points at where authored copy actually lives:
 * `content/stops.ts`, `content/static-copy.ts` and `components/stops/**`.
 *
 * Deliberately blunt. A curated list of the six fabrications this repo has actually
 * shipped, plus a light number-near-entity scan, beats a general claim parser we could
 * not trust to be right.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const STOP_DIR = join(ROOT, 'components', 'stops');
const CORPUS_PATH = join(ROOT, 'content', 'memories.yaml');

/* ── the six fabrications ──────────────────────────────────────────────────────
 * Every one of these rendered on the live site as a first-person statement of fact.
 * None was true. `truth` records what the corpus actually licenses, so a failure
 * tells the author what to write instead of only what not to write.
 */
const RETIRED_CLAIMS: { pattern: RegExp; shipped: string; truth: string }[] = [
  {
    pattern: /a\s+week\s+of\s+analyst\s+work/i,
    shipped: 'A week of analyst work per client, per month — replaced.',
    truth:
      'project-kinnect-automation licenses "cut report generation time by half". The week was never measured.',
  },
  {
    pattern: /without\s+breaking\s+a\s+single\s+advertiser/i,
    shipped: 'a company-wide 2FA rollout that landed without breaking a single advertiser account',
    truth:
      'project-taboola licenses "a global two-factor authentication launch" and nothing about breakage rates.',
  },
  {
    pattern: /five\s+(?:new\s+)?APAC\s+markets/i,
    shipped: 'Payments expansion across five new APAC markets without dropping an advertiser.',
    truth:
      'project-taboola licenses "emerging-market payment expansion into Korea and Indonesia" — two markets, named.',
  },
  {
    pattern: /5\s*[x×]\s*awareness/i,
    shipped: 'CANON — 5x awareness — Regional launch across 12 markets.',
    truth: 'cap-paid-media names Canon as a client. It licenses no awareness multiple, for anyone.',
  },
  {
    pattern: /2\s*[x×]\s*spend/i,
    shipped: 'LAUGHING COW — 2x spend — Category performance play.',
    truth:
      'cap-paid-media licenses "a 10x increase in ad spend on Rustomjee’s first project" — different client, different number.',
  },
  {
    pattern: /\bIsobar\b/i,
    shipped: 'Kinnect · Isobar · Taboola · Nanomark · Triad.',
    truth: 'Isobar appears nowhere in the corpus. He did not work there.',
  },
];

/* ── the light scan ────────────────────────────────────────────────────────────
 * A quantity sitting next to a unit is the shape every fabrication here took. We do
 * not try to understand the sentence; we require the corpus to contain the same
 * quantity. Bare four-digit years are excluded on purpose: dates are the resume's job,
 * and scripts/check-corpus.ts already holds every period against a plausible window.
 */
const QUANT = String.raw`(?:\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|dozen)`;
const UNIT = String.raw`(?:weeks?|months?|days?|hours?|markets?|clients?|accounts?|advertisers?|campaigns?|brands?|products?|images?|tools?|categories|viewers|people|teams?|breakages?)`;

const MAGNITUDE = new RegExp(
  [
    String.raw`\d+(?:\.\d+)?\s*(?:×|x\b|%)`, //                5x, 10x, 25%
    String.raw`\d+(?:\.\d+)?\+?\s+(?:million|billion|thousand)\b`, // 25 million
    String.raw`\b${QUANT}\s+(?:[\w'’-]+\s+){0,2}${UNIT}\b`, //   five new APAC markets
    String.raw`\bzero\b|\bnot\s+a\s+single\b|\bwithout\s+(?:a\s+single|breaking|dropping)\b`,
    String.raw`\bby\s+half\b`,
  ].join('|'),
  'gi',
);

function normalise(s: string): string {
  return ` ${s
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9%+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/**
 * Comments out, strings kept.
 *
 * The scan is for copy a reader sees, and a comment is never that. It became load-bearing
 * the moment `content/stops.ts` started documenting, in its own header, exactly which
 * fabricated phrases were dropped on the way over from the prototype — a list that is
 * worth having in the file that replaced them, and that a naive scan reads as five fresh
 * violations. A note saying "we did not ship 5x awareness" must not fail the test that
 * checks we did not ship 5x awareness.
 *
 * Hand-written rather than regex because `'https://github.com/Vege-Direc'` contains `//`
 * and is a link, not a comment. The walker tracks quotes, so it cannot make that mistake.
 * A `/` that opens a regex literal is left alone: comment starts require `//` or `/*`.
 */
function stripComments(source: string): string {
  let out = '';
  let i = 0;
  let quote = '';
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (quote) {
      if (c === '\\') {
        out += c + (next ?? '');
        i += 2;
        continue;
      }
      if (c === quote) quote = '';
      out += c;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      out += ' ';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * The copy a reader sees, pulled out of source. Tailwind lives in `className` and is
 * nothing but digits, so it goes first or it drowns the scan.
 */
function prose(source: string): string[] {
  const stripped = stripComments(source)
    .replace(/className=\{`[^`]*`\}/g, ' ')
    .replace(/className="[^"]*"/g, ' ')
    .replace(/className=\{[^}]*\}/g, ' ');

  const out: string[] = [];
  for (const m of stripped.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`([^`$]*)`/g)) {
    out.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  for (const m of stripped.matchAll(/>([^<>{}]+)</g)) out.push(m[1]);

  return out
    .map((s) =>
      s
        .replace(/\\(['"`])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((s) => s.includes(' ') && /[a-z]{3}/i.test(s));
}

type Violation = { file: string; line: string; detail: string };

function retiredClaimsIn(file: string, source: string): Violation[] {
  const found: Violation[] = [];
  for (const line of prose(source)) {
    for (const claim of RETIRED_CLAIMS) {
      if (claim.pattern.test(line)) {
        found.push({ file, line, detail: `retired claim — ${claim.truth}` });
      }
    }
  }
  return found;
}

function unlicensedMagnitudesIn(file: string, source: string, corpus: string): Violation[] {
  const found: Violation[] = [];
  for (const line of prose(source)) {
    for (const m of line.matchAll(MAGNITUDE)) {
      if (!corpus.includes(normalise(m[0]))) {
        found.push({ file, line, detail: `"${m[0].trim()}" is not licensed by any memory` });
      }
    }
  }
  return found;
}

/**
 * Every file that holds copy a reader sees and a human typed.
 *
 * `content/stops.ts` is the important one: it is where the nine authored titles and
 * bodies live now. The stop components are scanned too, because a label — a caption, a
 * counter, "01 · PDF" — is copy even when it is three characters long.
 */
function copySources(): { file: string; source: string }[] {
  const paths = [
    join(ROOT, 'content', 'stops.ts'),
    join(ROOT, 'content', 'static-copy.ts'),
    ...readdirSync(STOP_DIR)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => join(STOP_DIR, f)),
  ];
  return paths.map((p) => ({
    file: p.slice(ROOT.length + 1).replace(/\\/g, '/'),
    source: readFileSync(p, 'utf-8'),
  }));
}

function report(vs: Violation[]): string {
  return vs.map((v) => `\n  ${v.file}\n    ${v.detail}\n    in: ${v.line}`).join('');
}

const CORPUS = normalise(readFileSync(CORPUS_PATH, 'utf-8'));
const SOURCES = copySources();

describe('authored copy makes no claim the corpus does not license', () => {
  it('is actually scanning the files copy lives in', () => {
    // Named, not counted: a refactor that quietly drops content/stops.ts from the scan
    // would otherwise leave a green test guarding nothing at all.
    const files = SOURCES.map((s) => s.file);
    expect(files).toContain('content/stops.ts');
    expect(files).toContain('content/static-copy.ts');
    expect(files.some((f) => f.startsWith('components/stops/'))).toBe(true);
    expect(SOURCES.flatMap((s) => prose(s.source)).length).toBeGreaterThan(20);
  });

  it('contains none of the six fabrications this repo has already shipped', () => {
    const vs = SOURCES.flatMap(({ file, source }) => retiredClaimsIn(file, source));
    expect(vs, `retired claims are back:${report(vs)}\n`).toEqual([]);
  });

  it('quantifies nothing the corpus cannot back', () => {
    const vs = SOURCES.flatMap(({ file, source }) => unlicensedMagnitudesIn(file, source, CORPUS));
    expect(
      vs,
      `unlicensed numbers in authored copy. Either the number is wrong, or content/memories.yaml is missing the memory that licenses it:${report(vs)}\n`,
    ).toEqual([]);
  });
});

/**
 * The scanner is only worth having if it still bites. This replays the exact copy that
 * shipped, so the day someone loosens a pattern, the test guarding the guard goes red.
 */
describe('the scanner still bites', () => {
  const FABRICATED = `
    const featured = [
      { id: 'taboola', body: 'Payments expansion across five new APAC markets without dropping an advertiser. And a company-wide 2FA rollout that landed without breaking a single advertiser account.' },
      { id: 'kinnect', body: 'A week of analyst work per client, per month — replaced.' },
      { id: 'clients', body: 'Kinnect · Isobar · Taboola · Nanomark · Triad. Same pattern each time.' },
    ];
    export default function X() {
      return (
        <div className="grid grid-cols-2 gap-6 px-8 md:px-16 py-40">
          <span>CANON — 5× awareness — Regional launch across 12 markets.</span>
          <span>LAUGHING COW — 2× spend — Category performance play.</span>
        </div>
      );
    }
  `;

  it.each(RETIRED_CLAIMS.map((c) => [c.shipped, c.pattern] as const))(
    'catches: %s',
    (_shipped, pattern) => {
      const vs = retiredClaimsIn('fixture.tsx', FABRICATED).filter((v) => pattern.test(v.line));
      expect(vs.length).toBeGreaterThan(0);
    },
  );

  it('flags the unlicensed numbers in that copy too', () => {
    expect(unlicensedMagnitudesIn('fixture.tsx', FABRICATED, CORPUS).length).toBeGreaterThan(0);
  });

  it('does not flag a quantity the corpus does license', () => {
    const licensed = `const x = { body: 'Reporting automated, cutting report generation time by half.' };`;
    expect(unlicensedMagnitudesIn('fixture.tsx', licensed, CORPUS)).toEqual([]);
  });
});
