/**
 * The corpus gate. `npm run corpus:check`, and `prebuild` runs it before every build.
 *
 * Every factual defect this site has shipped was written by a human into an unvalidated
 * file -- a hardcoded array in a React component, a hand-edited YAML entry. This script is
 * the thing that reads content/memories.yaml the way a reviewer would if a reviewer were
 * always available, and refuses the build when it is wrong.
 *
 * Two rules govern what belongs in here:
 *
 *   1. A check exists only if it would have caught a defect this project has already
 *      shipped. Nothing is here because it seemed tidy.
 *   2. The error message IS the documentation. There is no corpus spec, no README, no
 *      schema reference -- if a rule is worth enforcing, its violation has to tell an
 *      author who has never seen this file what to fix and why it matters. Write the
 *      messages that way, or delete the rule.
 *
 * Structural rules live in lib/corpus/schema.ts. Nothing imports them at runtime yet, so
 * they are build-time rules; what lives here needs either the filesystem or the whole
 * corpus in view.
 *
 * Exit codes: 0 clean (warnings allowed and expected), 1 on any error.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { isMap, isSeq, parseDocument, type Document } from 'yaml';
import { ANSWERABLE_STOP_IDS, STOP_IDS, type StopId } from '../content/stops';
import {
  gallerySlug,
  memorySchema,
  nearestField,
  parsePeriod,
  unknownFieldsIn,
  type Memory,
  type Section,
} from '../lib/corpus/schema';

const ROOT = process.cwd();
const CORPUS_PATH = 'content/memories.yaml';
const GALLERY_ROOT = 'public/media';

/** Every answerable stop should be able to answer more than one way. */
const MIN_MEMORIES_PER_STOP = 2;

/**
 * Which sections plausibly belong on which stop. This catches the contradiction, not the
 * judgement call: a `contact` memory parked on the rd350 aside is a mistake, whereas a
 * `story` memory on `now` is a choice. Warning only -- the author knows things this table
 * does not.
 */
const SECTIONS_FOR_STOP: Record<Exclude<StopId, 'hero'>, readonly Section[]> = {
  origin: ['story', 'timeline'],
  engineering: ['story', 'timeline', 'capabilities'],
  pivot: ['story', 'timeline'],
  apac: ['timeline', 'projects', 'capabilities'],
  rd350: ['story'],
  // `timeline` belongs on `now` because the current role is the last row of the career
  // timeline the apac stop renders, and it lives here rather than there.
  now: ['story', 'projects', 'capabilities', 'timeline'],
  work: ['timeline', 'projects', 'capabilities'],
  contact: ['contact'],
};

/* -- output ---------------------------------------------------------------- */

const TTY = process.stdout.isTTY === true;
const ESC = String.fromCharCode(27);
const paint = (code: string) => (s: string) => (TTY ? `${ESC}[${code}m${s}${ESC}[0m` : s);
const red = paint('31;1');
const yellow = paint('33;1');
const green = paint('32;1');
const dim = paint('2');
const bold = paint('1');

const WRAP = 96;

function wrap(text: string, indent: string): string {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > WRAP) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out.map((l) => indent + l).join('\n');
}

type Severity = 'error' | 'warning';

type Finding = {
  severity: Severity;
  /** 1-based line in content/memories.yaml, when we can pin it down. */
  line?: number;
  /** The memory id, or a positional label when the id itself is the problem. */
  memory?: string;
  field?: string;
  message: string;
  /** The concrete edit. Always an imperative -- "set x to y", never "consider whether". */
  fix?: string;
};

const findings: Finding[] = [];
const error = (f: Omit<Finding, 'severity'>) => findings.push({ ...f, severity: 'error' });
const warn = (f: Omit<Finding, 'severity'>) => findings.push({ ...f, severity: 'warning' });

function render(f: Finding): string {
  const tag = f.severity === 'error' ? red('ERROR  ') : yellow('WARN   ');
  const where = f.line ? `${CORPUS_PATH}:${f.line}` : CORPUS_PATH;
  const subject = [f.memory, f.field].filter(Boolean).join('  ' + dim('·') + '  ');
  const head = `${tag}${dim(where)}${subject ? '  ' + bold(subject) : ''}`;
  const body = wrap(f.message, '       ');
  const fix = f.fix ? '\n' + wrap(`fix: ${f.fix}`, '       ') : '';
  return `${head}\n${body}${fix}\n`;
}

/* -- line numbers ---------------------------------------------------------- */

/**
 * Maps a memory index (and optionally a field within it) back to a line in the YAML, so
 * every finding is a clickable `content/memories.yaml:175` rather than "somewhere in the
 * corpus". A checker you have to go hunting for is a checker people learn to ignore.
 */
function buildLineIndex(raw: string, doc: Document) {
  const breaks: number[] = [];
  for (let i = 0; i < raw.length; i++) if (raw[i] === '\n') breaks.push(i);

  const lineOf = (offset: number): number => {
    let lo = 0;
    let hi = breaks.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (breaks[mid] < offset) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };

  const items = isSeq(doc.contents) ? doc.contents.items : [];

  const memoryLine = (index: number): number | undefined => {
    const node = items[index] as { range?: [number, number, number] } | undefined;
    return node?.range ? lineOf(node.range[0]) : undefined;
  };

  const fieldLine = (index: number, field: string): number | undefined => {
    const node = items[index];
    if (!isMap(node)) return memoryLine(index);
    for (const pair of node.items) {
      const key = pair.key as { value?: unknown; range?: [number, number, number] } | null;
      if (key && key.value === field && key.range) return lineOf(key.range[0]);
    }
    return memoryLine(index);
  };

  return { lineOf, memoryLine, fieldLine };
}

/* -- helpers --------------------------------------------------------------- */

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * The gallery directory a slug was probably meant to name.
 *
 * Character distance alone is the wrong measure here: `rd350-build` and `rd350` are six
 * edits apart and obviously the same gallery. Slug mistakes are almost always a whole
 * hyphen-segment gained or lost -- a descriptive suffix someone added to the corpus but
 * not to the disk -- so shared segments and containment rank ahead of edit distance.
 */
function nearestGallery(slug: string, dirs: readonly string[]): string | null {
  const wanted = new Set(slug.split('-'));
  const scored = dirs
    .map((name) => {
      const shared = name.split('-').filter((seg) => wanted.has(seg)).length;
      const contains = slug.startsWith(name) || name.startsWith(slug) || slug.includes(name) || name.includes(slug);
      return { name, shared, contains, distance: levenshtein(slug, name) };
    })
    .filter((c) => c.shared > 0 || c.contains || c.distance <= Math.max(2, Math.floor(slug.length / 3)))
    .sort(
      (a, b) => b.shared - a.shared || Number(b.contains) - Number(a.contains) || a.distance - b.distance,
    );
  return scored[0]?.name ?? null;
}

const posix = (p: string) => p.replace(/\\/g, '/');

function listDirs(dir: string): string[] {
  try {
    return readdirSync(join(ROOT, dir), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/* -- 1. the file parses ---------------------------------------------------- */

let raw: string;
try {
  raw = readFileSync(join(ROOT, CORPUS_PATH), 'utf-8');
} catch {
  console.error(
    render({
      severity: 'error',
      message:
        `${CORPUS_PATH} could not be read. It is the source of truth for every factual claim on this site, so ` +
        'nothing downstream can be checked without it. If the file moved, update CORPUS_PATH in ' +
        'scripts/check-corpus.ts and lib/rag.ts together.',
      fix: `restore ${CORPUS_PATH}.`,
    }),
  );
  process.exit(1);
}

const doc = parseDocument(raw);
const lines = buildLineIndex(raw, doc);

if (doc.errors.length > 0) {
  for (const e of doc.errors) {
    error({
      line: lines.lineOf(e.pos[0]),
      message:
        `${CORPUS_PATH} is not valid YAML: ${e.message} Nothing else in this report ran, because a corpus that ` +
        'does not parse is a corpus the site loads as nothing at all.',
      fix: 'repair the YAML above and re-run `npm run corpus:check`.',
    });
  }
  console.error('\n' + findings.map(render).join('\n'));
  console.error(red(`\n0 memories · ${findings.length} errors · 0 warnings\n`));
  process.exit(1);
}

if (!isSeq(doc.contents)) {
  console.error(
    render({
      severity: 'error',
      line: 1,
      message:
        `${CORPUS_PATH} must be a YAML list of memories at the top level -- a file of "- id: ..." entries. It ` +
        `parsed as ${doc.contents === null ? 'an empty document' : 'a single value'} instead, which loads as zero ` +
        'memories and leaves the site answering from nothing.',
      fix: 'make the top level a list.',
    }),
  );
  process.exit(1);
}

const rawItems = doc.toJS() as unknown[];

/* -- 2-5. each memory against the schema ----------------------------------- */

/** Label a memory before we know whether its id is usable. */
function label(item: unknown, index: number): string {
  const id = (item as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id.trim() ? id.trim() : `memory #${index + 1} (no usable id)`;
}

const valid: { memory: Memory; index: number }[] = [];

rawItems.forEach((item, index) => {
  const name = label(item, index);

  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    error({
      line: lines.memoryLine(index),
      memory: `memory #${index + 1}`,
      message:
        'this list entry is not a memory. Every top-level entry must be a mapping with at least id, section, ' +
        'stopId, title, tags and body. A stray scalar here shifts nothing else, it just loads as a memory the ' +
        'renderer cannot read.',
      fix: 'delete the entry or write it out as a full memory.',
    });
    return;
  }

  // Unknown keys before schema validation: zod strips them silently, and a silently
  // stripped `stopid:` is exactly how defect H hid for as long as it did.
  for (const key of unknownFieldsIn(item)) {
    const meant = nearestField(key);
    error({
      line: lines.fieldLine(index, key),
      memory: name,
      field: key,
      message: meant
        ? `\`${key}\` is not a field this project knows about, but \`${meant}\` is -- field names are ` +
          'case-sensitive and this one differs only in case or punctuation. YAML accepts it, the schema drops ' +
          `it, and the memory behaves as though \`${meant}\` were never set at all: no error, no value, no clue.`
        : `\`${key}\` is not a field this project knows about. Valid fields are id, section, stopId, title, ` +
          'body, tags, period, media, aliases, facts. An unrecognised key is loaded, ignored, and never ' +
          'mentioned again -- if it was meant to do something, it is not doing it.',
      fix: meant ? `rename \`${key}\` to \`${meant}\`.` : `remove \`${key}\`, or add it to MEMORY_FIELDS in lib/corpus/schema.ts if it is real.`,
    });
  }

  const parsed = memorySchema.safeParse(item);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.length > 0 ? issue.path.join('.') : undefined;
      error({
        line: field ? lines.fieldLine(index, String(issue.path[0])) : lines.memoryLine(index),
        memory: name,
        field,
        message: issue.message,
      });
    }
    return;
  }

  valid.push({ memory: parsed.data, index });
});

/* -- 3. ids are unique ----------------------------------------------------- */

// Run against the raw ids, not just the memories that validated: a duplicate id must not
// be able to hide behind an unrelated error in the same entry.
const idFirstSeen = new Map<string, number>();
rawItems.forEach((item, index) => {
  const id = (item as { id?: unknown } | null)?.id;
  if (typeof id !== 'string' || !id.trim()) return;
  const key = id.trim();
  const first = idFirstSeen.get(key);
  if (first === undefined) {
    idFirstSeen.set(key, index);
    return;
  }
  error({
    line: lines.fieldLine(index, 'id'),
    memory: key,
    field: 'id',
    message:
      `duplicate id -- \`${key}\` is already the id of the memory on line ${lines.memoryLine(first) ?? '?'}. Ids ` +
      'are the retrieval citation key and the WebGL pulse target, so two memories sharing one means the second ' +
      'is unreachable: every lookup in the site resolves to the first and this memory can never be shown.',
    fix: `give this memory an id of its own.`,
  });
});

// Deliberately not a whole-corpus zod schema. One would only see memories that already
// validated, and a duplicate id must still be reported when the entry carrying it has an
// unrelated error as well -- so the rule lives here, over the raw items, not in
// lib/corpus/schema.ts.

/* -- 6. periods agree with the prose around them --------------------------- */

// Defect A's shape exactly: a date in the structured field contradicting the years in the
// text next to it -- Kinnect dated 2013 in a component while the corpus said 2017-2019.
// A warning, not an error: a body may legitimately name a year that is not a date of the
// work ("a 1986 Yamaha RD 350"), and this check cannot tell the difference.
for (const { memory, index } of valid) {
  if (!memory.period) continue;
  const span = parsePeriod(memory.period);
  if (!span) continue;

  const inBody = [...memory.body.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  const strays = [...new Set(inBody)].filter((y) => y < span.start || y > span.end);
  if (strays.length === 0) continue;
  warn({
    line: lines.fieldLine(index, 'period'),
    memory: memory.id,
    field: 'period',
    message:
      `the body names ${strays.length === 1 ? 'the year' : 'the years'} ${strays.join(', ')}, which ` +
      `${strays.length === 1 ? 'falls' : 'fall'} outside \`period: "${memory.period}"\`` +
      `${span.open ? ` (open-ended, read as ${span.start}-${span.end})` : ''}. One of the two is wrong, and a ` +
      'date that disagrees with the sentence beside it is how five of nine timeline rows stayed factually ' +
      'wrong on this site for months. If the year is subject matter rather than a date of the work -- a 1986 ' +
      'motorcycle, a 2019 tournament -- this warning is expected and correct to leave.',
    fix: `check the year against the resume, then correct either the body or \`period\` so the two agree.`,
  });
}

/* -- 8. galleries exist ---------------------------------------------------- */

type Signature = { name: string; exts: readonly string[]; test: (b: Buffer) => boolean };

const SIGNATURES: readonly Signature[] = [
  {
    name: 'PNG',
    exts: ['.png'],
    test: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { name: 'JPEG', exts: ['.jpg', '.jpeg'], test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { name: 'GIF', exts: ['.gif'], test: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  {
    name: 'WebP',
    exts: ['.webp'],
    test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  { name: 'AVIF/HEIF', exts: ['.avif', '.heic', '.heif'], test: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' },
];

function sniff(file: string): Signature | null {
  try {
    const fd = readFileSync(file);
    return SIGNATURES.find((s) => s.test(fd)) ?? null;
  } catch {
    return null;
  }
}

const existingGalleries = listDirs(GALLERY_ROOT);

for (const { memory, index } of valid) {
  if (!memory.media) continue;
  const slug = gallerySlug(memory.media);
  if (!slug) continue; // the schema already reported the malformed reference

  const relative = `${GALLERY_ROOT}/${slug}`;
  const absolute = join(ROOT, GALLERY_ROOT, slug);

  let isDir = false;
  try {
    isDir = statSync(absolute).isDirectory();
  } catch {
    isDir = false;
  }

  if (!isDir) {
    const near = nearestGallery(slug, existingGalleries);
    const nearCount = near ? readdirSync(join(ROOT, GALLERY_ROOT, near)).length : 0;

    error({
      line: lines.fieldLine(index, 'media'),
      memory: memory.id,
      field: 'media',
      message: near
        ? `\`media: ${memory.media}\` points at ${relative}/, which does not exist. ` +
          `${GALLERY_ROOT}/${near}/ does exist and holds ${nearCount} file${nearCount === 1 ? '' : 's'} -- ` +
          'one edit away from the slug written here. Which side is wrong? Almost certainly this line, not the ' +
          'directory: the directory is where the bytes actually are, and other code loads those bytes by path, ' +
          'so renaming it breaks every reference while fixing the slug touches exactly one. Nothing renders ' +
          'either way until they agree.'
        : `\`media: ${memory.media}\` points at ${relative}/, which does not exist, and no directory under ` +
          `${GALLERY_ROOT}/ is close enough to be the one meant (present: ${existingGalleries.join(', ') || 'none'}). ` +
          'The carousel for this memory renders empty.',
      fix: near
        ? `set \`media: gallery:${near}\` -- or, if the directory really is the misnamed one, grep the repo ` +
          `for "${GALLERY_ROOT}/${near}" first, rename it to ${slug}/, and update every hit. Do one or the ` +
          'other, never both.'
        : `create ${relative}/ and put the images in it, or point \`media\` at a gallery that exists.`,
    });
    continue;
  }

  const files = readdirSync(absolute, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);

  if (files.length === 0) {
    error({
      line: lines.fieldLine(index, 'media'),
      memory: memory.id,
      field: 'media',
      message:
        `\`media: ${memory.media}\` resolves to ${relative}/, which exists but is empty. The stop composes a ` +
        'carousel; an empty gallery renders as a captioned blank where an image should be.',
      fix: `add the images to ${relative}/, or drop the \`media\` key until they exist.`,
    });
    continue;
  }

  // Extension vs actual bytes. Files get renamed by hand during asset shuffles and the
  // extension is what the server derives Content-Type from -- the name and the bytes
  // disagreeing is a real, shipped state, not a hypothetical one.
  const mismatched = files
    .map((name) => ({ name, ext: extname(name).toLowerCase(), sig: sniff(join(absolute, name)) }))
    .filter((f) => f.sig !== null && !f.sig.exts.includes(f.ext));

  if (mismatched.length > 0) {
    const first = mismatched[0];
    const kinds = [...new Set(mismatched.map((f) => f.sig!.name))].join('/');
    warn({
      line: lines.fieldLine(index, 'media'),
      memory: memory.id,
      field: 'media',
      message:
        `${mismatched.length} of ${files.length} file${files.length === 1 ? '' : 's'} in ${relative}/ ` +
        `${mismatched.length === 1 ? 'is' : 'are'} named with the wrong extension: ${first.name} carries a ` +
        `${first.sig!.name} header but a ${first.ext} name (all ${mismatched.length} are ${kinds} data). The ` +
        'extension is what the server sends as Content-Type, so these are served under a type they are not. ' +
        'Browsers sniff past it today; image pipelines, caches and CDNs are not obliged to.',
      fix:
        `rename ${relative}/*${first.ext} to ${first.sig!.exts[0]} and update every reference to those paths, ` +
        'or re-encode the files to match the names they already have.',
    });
  }
}

/* -- 9. section against stop ----------------------------------------------- */

for (const { memory, index } of valid) {
  if (memory.stopId === 'hero') continue; // already an error
  const allowed = SECTIONS_FOR_STOP[memory.stopId];
  if (!allowed || allowed.includes(memory.section)) continue;

  warn({
    line: lines.fieldLine(index, 'section'),
    memory: memory.id,
    field: 'section',
    message:
      `\`section: ${memory.section}\` on \`stopId: ${memory.stopId}\` is a combination this project does not ` +
      `otherwise use -- memories on ${memory.stopId} are normally ${allowed.join(', ')}. The two fields answer ` +
      'different questions (section is how it renders, stopId is where it lives), so this may well be ' +
      'deliberate, but a mismatch is usually one of the two having been copied from the memory above.',
    fix:
      `confirm the pairing is intended. If it is, widen SECTIONS_FOR_STOP in scripts/check-corpus.ts so the ` +
      'warning stops being noise.',
  });
}

/* -- 7. coverage ----------------------------------------------------------- */

const perStop = new Map<StopId, number>(STOP_IDS.map((id) => [id, 0]));
for (const { memory } of valid) perStop.set(memory.stopId, (perStop.get(memory.stopId) ?? 0) + 1);

const thin = ANSWERABLE_STOP_IDS.map((id) => ({ id, count: perStop.get(id) ?? 0 })).filter(
  (s) => s.count < MIN_MEMORIES_PER_STOP,
);

for (const stop of thin) {
  warn({
    memory: stop.id,
    field: 'coverage',
    message:
      stop.count === 0
        ? `no memory targets the \`${stop.id}\` stop. The router can send a question here and retrieval will ` +
          'return nothing at all, which leaves the model answering an unanswerable stop from its own priors -- ' +
          'the exact machinery that produces a fabrication.'
        : `only 1 memory targets the \`${stop.id}\` stop. Every question routed here retrieves the same single ` +
          'memory, so the stop gives one answer no matter what was asked, and any question it does not cover ' +
          'is answered from outside the corpus.',
    fix:
      `write ${MIN_MEMORIES_PER_STOP - stop.count} more ` +
      `${MIN_MEMORIES_PER_STOP - stop.count === 1 ? 'memory' : 'memories'} for \`${stop.id}\` in ${CORPUS_PATH}.`,
  });
}

/* -- report ---------------------------------------------------------------- */

const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warning');

console.log('');
console.log(bold(`corpus · ${posix(CORPUS_PATH)}`));
console.log('');

if (findings.length > 0) {
  // Errors first: they are the ones that stop the build.
  for (const f of [...errors, ...warnings]) console.log(render(f));
}

// The coverage table prints whether or not anything is thin -- it is the concrete input to
// the corpus-authoring backlog, and a gap list you only see when it is already bad is a
// gap list nobody plans against.
const width = Math.max(...ANSWERABLE_STOP_IDS.map((id) => id.length));
console.log(bold(`coverage · ${ANSWERABLE_STOP_IDS.length} answerable stops`) + dim(`  (hero is authored-only)`));
for (const id of ANSWERABLE_STOP_IDS) {
  const count = perStop.get(id) ?? 0;
  const short = MIN_MEMORIES_PER_STOP - count;
  const note = short > 0 ? yellow(`needs ${short} more`) : dim('ok');
  console.log(`  ${id.padEnd(width)}  ${String(count).padStart(2)}  ${note}`);
}
console.log('');

const summary =
  `${valid.length} memories · ${errors.length} error${errors.length === 1 ? '' : 's'} · ` +
  `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`;

if (errors.length > 0) {
  console.log(red(summary));
  console.log(dim('the build is blocked until the errors above are fixed.'));
  console.log('');
  process.exit(1);
}

console.log(warnings.length > 0 ? yellow(summary) : green(summary));
console.log('');
