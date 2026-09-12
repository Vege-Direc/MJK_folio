/**
 * The question a card asks when it is pressed.
 *
 * In one place because three things need to agree on it exactly: the click handler that
 * sends it, the comparison that decides whether a card is currently the one being answered,
 * and the eval that asserts every card routes to its own memory. Two of those are on
 * opposite sides of a React tree, and a string built twice is a string that drifts.
 *
 * WHY THIS PHRASING AND NOT THE BARE TITLE. `tell`, `me` and `about` are all stopwords in
 * `lib/retrieve.ts`, so this tokenizes to exactly the title and the routing is byte-identical
 * — verified across all fourteen cards. What the extra words buy is the `ASKED` line in
 * `AnswerBlock`, which prints the visitor's question back to them: "Tell me about AI agents."
 * reads as something a person said, and "AI agents" reads as a database key.
 *
 * It is a pure function of authored corpus data, which is what lets an eval assert the whole
 * set without a browser.
 */
export function cardQuestion(title: string): string {
  return `Tell me about ${title}.`;
}

/**
 * The query parameter that names an answer.
 *
 * `scripts/check-corpus.ts` states the rule this exists for, in the repository's own
 * words: an answer "has no URL, which is fatal for the audience that scans and forwards
 * rather than converses". A recruiter does not converse. Until this parameter existed a
 * chat answer changed nothing in the address bar, left no history entry and could not be
 * sent to anybody -- and because answers stream from `/api/ask`, which `app/robots.ts`
 * disallows, anything reachable only by asking was structurally unindexable as well.
 *
 * IT NAMES A MEMORY, NEVER A QUESTION. `?ask=project-tallybridge`, never `?ask=<free
 * text>`. The set of memory ids is closed and authored, `content/memories.yaml` is the
 * only thing that can widen it, and the value is resolved to a title on the client and
 * turned into `cardQuestion(title)` before it goes anywhere near the wire. A parameter
 * carrying prose would be a way for a stranger to put words on somebody else's screen
 * under MJK's name, which is the same hazard `lib/security/schema.ts` refuses from the
 * other direction, arriving as a link instead of as a request body.
 *
 * `/` and not `/ask/<id>`: the answer docks *inside* the stop it belongs to on the page
 * that already exists, so a route segment would need a second page, a second set of
 * metadata and a second sitemap entry to render the same document. `app/layout.tsx`
 * already declares `alternates.canonical: '/'`, so every `?ask=` address collapses to `/`
 * for an indexer and no duplicate is created.
 */
export const ASK_PARAM = 'ask';

/** The address of one memory's answer. Relative, so it works on any origin. */
export function askHref(memoryId: string): string {
  return `?${ASK_PARAM}=${encodeURIComponent(memoryId)}`;
}
