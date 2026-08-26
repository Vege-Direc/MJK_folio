/**
 * TEMPORARY — DELETE AT PLAN STEP 6.
 *
 * This file exists because one fact currently has two homes. `content/memories.yaml`
 * is the source of truth, and `components/sections/*.tsx` hard-codes a second copy of
 * the same claims. That is how two fabrications shipped and survived for months:
 *
 *   - "a company-wide 2FA rollout that landed without breaking a single advertiser account"
 *   - "A week of analyst work per client, per month — replaced."
 *
 * Both were corrected in the corpus and left standing in the component. This test makes
 * that class of drift un-shippable.
 *
 * At plan step 6 the sections render from the corpus, the second copy stops existing, and
 * the drift this file guards becomes structurally impossible. Delete the file then — do
 * not port it forward. A test guarding something that cannot happen is a liability.
 *
 * Deliberately blunt. A curated list of the six fabrications this repo has actually
 * shipped, plus a light number-near-entity scan, beats a general claim parser we could
 * not trust to be right.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SECTION_DIR = join(ROOT, 'components', 'sections');
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
 * quantity. Bare four-digit years are excluded on purpose — the timeline's dates are
 * the resume's job (see the header of Timeline.tsx) and check-corpus.ts's.
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
 * The copy a reader sees, pulled out of source. Tailwind lives in `className` and is
 * nothing but digits, so it goes first or it drowns the scan.
 */
function prose(source: string): string[] {
  const stripped = source
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

/** Section copy, plus the static strings the sections render verbatim. */
function copySources(): { file: string; source: string }[] {
  const paths = [
    ...readdirSync(SECTION_DIR)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => join(SECTION_DIR, f)),
    join(ROOT, 'content', 'static-copy.ts'),
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

describe('section copy makes no claim the corpus does not license', () => {
  it('is actually scanning the sections', () => {
    expect(SOURCES.length).toBeGreaterThanOrEqual(6);
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
      `unlicensed numbers in section copy. Either the number is wrong, or content/memories.yaml is missing the memory that licenses it:${report(vs)}\n`,
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
