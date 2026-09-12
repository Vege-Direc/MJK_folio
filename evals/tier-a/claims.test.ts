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
 * for each of the twelve stops, and that copy is exactly the kind that shipped the
 * fabrications: first-person, confident, and typed by hand next to a corpus that says
 * something slightly different. The prototype's own stop table
 * (`reference/preview.html:2151`) held four of the six retired claims below on the day
 * this port began, and porting it was a line-by-line exercise in not carrying them over.
 *
 * So the scanner is permanent, and it points at where authored copy actually lives --
 * `evals/tier-a/authored-copy.ts` holds that list, and `promises.test.ts` reads the same
 * one.
 *
 * TWO FILES WERE MISSING FROM IT UNTIL NOW, and they are the two that talk to a visitor
 * when the site is least sure of itself. `lib/fallback.ts` holds every word shown when no
 * model spoke, and `content/system-prompt.md` holds every instruction for when one does --
 * a sentence typed into either is read by a visitor as MJK's, in the first person, exactly
 * like one typed into `content/stops.ts`. Neither was scanned by anything. A fabricated
 * number in the prompt would have been quoted back by a model that had no idea it was not
 * licensed, and the guard would have passed it, because the guard checks the answer against
 * the corpus and the prompt is not the answer.
 *
 * Deliberately blunt. A curated list of the six fabrications this repo has actually
 * shipped, plus a light number-near-entity scan, beats a general claim parser we could
 * not trust to be right.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { authoredCopy, markdownProse, prose, ROOT, type CopySource } from './authored-copy';

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

type Violation = { file: string; line: string; detail: string };

function retiredClaimsIn({ file, lines }: CopySource): Violation[] {
  const found: Violation[] = [];
  for (const line of lines) {
    for (const claim of RETIRED_CLAIMS) {
      if (claim.pattern.test(line)) {
        found.push({ file, line, detail: `retired claim — ${claim.truth}` });
      }
    }
  }
  return found;
}

function unlicensedMagnitudesIn({ file, lines }: CopySource, corpus: string): Violation[] {
  const found: Violation[] = [];
  for (const line of lines) {
    for (const m of line.matchAll(MAGNITUDE)) {
      if (!corpus.includes(normalise(m[0]))) {
        found.push({ file, line, detail: `"${m[0].trim()}" is not licensed by any memory` });
      }
    }
  }
  return found;
}

function report(vs: Violation[]): string {
  return vs.map((v) => `\n  ${v.file}\n    ${v.detail}\n    in: ${v.line}`).join('');
}

const CORPUS = normalise(readFileSync(CORPUS_PATH, 'utf-8'));
const SOURCES = authoredCopy();

describe('authored copy makes no claim the corpus does not license', () => {
  it('is actually scanning the files copy lives in', () => {
    // Named, not counted: a refactor that quietly drops content/stops.ts from the scan
    // would otherwise leave a green test guarding nothing at all.
    const files = SOURCES.map((s) => s.file);
    expect(files).toContain('content/stops.ts');
    expect(files).toContain('content/static-copy.ts');
    expect(files).toContain('content/system-prompt.md');
    expect(files).toContain('lib/fallback.ts');
    expect(files.some((f) => f.startsWith('components/stops/'))).toBe(true);
    expect(SOURCES.flatMap((s) => s.lines).length).toBeGreaterThan(20);

    // The prompt is prose rather than string literals, so an extractor that silently
    // returned nothing for markdown would look exactly like a file with nothing to say.
    const prompt = SOURCES.find((s) => s.file === 'content/system-prompt.md');
    expect(prompt!.lines.length, 'content/system-prompt.md read as empty').toBeGreaterThan(30);
  });

  it('contains none of the six fabrications this repo has already shipped', () => {
    const vs = SOURCES.flatMap((s) => retiredClaimsIn(s));
    expect(vs, `retired claims are back:${report(vs)}\n`).toEqual([]);
  });

  it('quantifies nothing the corpus cannot back', () => {
    const vs = SOURCES.flatMap((s) => unlicensedMagnitudesIn(s, CORPUS));
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

  const fixture = (source: string): CopySource => ({ file: 'fixture.tsx', lines: prose(source) });

  it.each(RETIRED_CLAIMS.map((c) => [c.shipped, c.pattern] as const))(
    'catches: %s',
    (_shipped, pattern) => {
      const vs = retiredClaimsIn(fixture(FABRICATED)).filter((v) => pattern.test(v.line));
      expect(vs.length).toBeGreaterThan(0);
    },
  );

  it('flags the unlicensed numbers in that copy too', () => {
    expect(unlicensedMagnitudesIn(fixture(FABRICATED), CORPUS).length).toBeGreaterThan(0);
  });

  it('does not flag a quantity the corpus does license', () => {
    const licensed = `const x = { body: 'Reporting automated, cutting report generation time by half.' };`;
    expect(unlicensedMagnitudesIn(fixture(licensed), CORPUS)).toEqual([]);
  });

  /*
   * The markdown reader is new and is the only path by which the prompt is scanned at all,
   * so it gets its own proof rather than being trusted because the file above went green.
   * A fabricated number typed into an instruction is quoted back by a model in the first
   * person, and the grounding guard cannot save it: the guard checks the ANSWER against the
   * corpus, and by then the sentence is the answer.
   */
  it('catches a fabrication typed into the prompt rather than into a component', () => {
    const badPrompt = [
      '## What you know',
      '',
      'When someone asks about the agency years, say that the Taboola work shipped across',
      'five new APAC markets without dropping an advertiser.',
    ].join('\n');
    const scanned: CopySource = { file: 'fixture.md', lines: markdownProse(badPrompt) };
    expect(retiredClaimsIn(scanned).length).toBeGreaterThan(0);
    expect(unlicensedMagnitudesIn(scanned, CORPUS).length).toBeGreaterThan(0);
  });
});
