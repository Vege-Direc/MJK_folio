/**
 * Where copy a human typed actually lives, and how to get the prose back out of it.
 *
 * This was inside `claims.test.ts`, which was the only scanner that existed. There are two
 * now -- one for claims the corpus does not license, one for promises nothing can keep --
 * and they must agree on what "authored copy" means or the second one guards a smaller
 * repository than the first. `voice.test.ts` has already been through this: its rule read
 * `stops.ts` and the fallbacks only, so a card eyebrow derived from a tag printed "CTA"
 * above §08's cards for months with a green suite the whole time.
 *
 * WHAT COUNTS. A file belongs here when a human typed a sentence into it AND a visitor can
 * end up reading that sentence. The second half is why `content/system-prompt.md` is in the
 * list despite never being served: every word of it is instruction to a model that speaks to
 * visitors in the first person as MJK, so a sentence typed there is copy with one extra step
 * in front of it. The one file this deliberately does NOT read is `content/memories.yaml`.
 * MJK wrote it, it is the licence for everything else, and a scanner that holds the source of
 * truth to the standard of the copy derived from it has the dependency backwards.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = process.cwd();

/**
 * Comments out, strings kept.
 *
 * The scan is for copy a reader sees, and a comment is never that. It became load-bearing
 * the moment `content/stops.ts` started documenting, in its own header, exactly which
 * fabricated phrases were dropped on the way over from the prototype -- a list that is
 * worth having in the file that replaced them, and that a naive scan reads as five fresh
 * violations. A note saying "we did not ship 5x awareness" must not fail the test that
 * checks we did not ship 5x awareness.
 *
 * Hand-written rather than regex because `'https://github.com/Vege-Direc'` contains `//`
 * and is a link, not a comment. The walker tracks quotes, so it cannot make that mistake.
 * A `/` that opens a regex literal is left alone: comment starts require `//` or `/*`.
 */
export function stripComments(source: string): string {
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

/** Drops anything that is punctuation, a token, or a fragment rather than a sentence. */
function readable(lines: string[]): string[] {
  return lines
    .map((s) =>
      s
        .replace(/\\(['"`])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((s) => s.includes(' ') && /[a-z]{3}/i.test(s));
}

/**
 * The copy a reader sees, pulled out of source. Tailwind lives in `className` and is
 * nothing but digits, so it goes first or it drowns the scan.
 */
export function prose(source: string): string[] {
  const stripped = stripComments(source)
    .replace(/className=\{`[^`]*`\}/g, ' ')
    .replace(/className="[^"]*"/g, ' ')
    .replace(/className=\{[^}]*\}/g, ' ');

  const out: string[] = [];
  for (const m of stripped.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`([^`$]*)`/g)) {
    out.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  for (const m of stripped.matchAll(/>([^<>{}]+)</g)) out.push(m[1]);

  return readable(out);
}

/**
 * A markdown file, line by line, with the markers taken off.
 *
 * There is no equivalent of a comment here: every line of `content/system-prompt.md` is
 * addressed to the model, so every line is in scope. The markers come off because `**Never
 * promise a reply.**` and `- If you do not know` are the same sentences as their plain
 * versions and a pattern should not have to know which one it is looking at.
 */
export function markdownProse(source: string): string[] {
  const withoutFences = source.replace(/```[\s\S]*?```/g, ' ');
  return readable(
    withoutFences
      .split('\n')
      .map((line) => line.replace(/^\s*[-*+>]\s+/, '').replace(/^#+\s*/, '').replace(/[*_`]/g, '')),
  );
}

export type CopySource = {
  /** Repo-relative and posix-separated, so a failure message is the same on every machine. */
  file: string;
  lines: string[];
};

function source(relative: string): CopySource {
  const abs = join(ROOT, ...relative.split('/'));
  const text = readFileSync(abs, 'utf-8');
  return { file: relative, lines: relative.endsWith('.md') ? markdownProse(text) : prose(text) };
}

/**
 * Every file that holds copy a reader sees and a human typed.
 *
 * `content/stops.ts` is the important one: it is where the nine authored titles and bodies
 * live now. The stop components are scanned too, because a label -- a caption, a counter,
 * "01 · PDF" -- is copy even when it is three characters long.
 *
 * `lib/fallback.ts` and `content/system-prompt.md` are the two that were missing, and they
 * are the two that address a visitor when the site is at its least sure of itself: one holds
 * every word shown when no model spoke, the other every instruction for when one does. A
 * fabrication or a promise typed into either reaches a reader exactly as fast as one typed
 * into `stops.ts`.
 *
 * `components/chat` is here for the same reason and earned its place immediately: the dock's
 * transport-failure line is authored copy nothing had ever read, and adding it caught a fault
 * in the first pattern written against it.
 */
export function authoredCopy(): CopySource[] {
  const stopDir = join(ROOT, 'components', 'stops');
  return [
    source('content/stops.ts'),
    source('content/static-copy.ts'),
    source('content/system-prompt.md'),
    source('lib/fallback.ts'),
    ...readdirSync(stopDir)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => source(`components/stops/${f}`)),
    ...readdirSync(join(ROOT, 'components', 'chat'))
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => source(`components/chat/${f}`)),
  ];
}
