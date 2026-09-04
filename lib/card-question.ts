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
