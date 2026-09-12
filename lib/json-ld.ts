/**
 * Serialise a JSON-LD payload for a `<script type="application/ld+json">` tag.
 *
 * Every `<` is replaced with its JSON unicode escape (backslash, u, 0, 0, 3, c) so a
 * value containing a literal `</script>` (or any other tag) cannot break out of the
 * script element it is embedded in. Pulled out of
 * app/layout.tsx so this escaping is one function, not a `JSON.stringify(...).replace(...)`
 * that a future edit could copy wrong — and so it is importable from an eval without
 * dragging in `next/font/google`, which only resolves inside the Next.js compiler.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
