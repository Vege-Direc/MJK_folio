# Direction

The exit artefact for the 2026-09-05/06 research round. Eleven agents, four retractions.
`TASKS.md` holds the evidence; `SPEC-architecture.md` holds the migration; this file holds the
decisions and is deliberately short.

**Not "foolproof" — falsifiable and reversible.** Every decision below states what would prove
it wrong and what it costs to undo. That is achievable; certainty is not, and promising it is
how this project has already retracted four numbers.

---

## The decisions

| # | Do this | Why, in one line |
|---|---|---|
| 1 | **Reorder the spine: work above story.** `hero, now, work, asanjo, jewelai, mrunn, origin, engineering, pivot, apac, rd350, contact` | First proof moves from screenful **9.1 to 2.3** |
| 2 | **§07 becomes an index**; JewelAI, Asanjo and MruNN get stops; JewelAI and Asanjo get routes | 17 of 19 work memories are currently never drawn |
| 3 | **Do not fork the scroll. Ship navigation** — a hero anchor and a section index | A shortcut edge would read as a duplicated mesh; `/#work` already works and nothing says so |
| 4 | **The scroll carries existence AND evidence.** Withhold biography depth and work depth only | Never withhold a project, artefact, role, year or title |
| 5 | **Ship the hero sentence now** — promote the imperative, drop "scroll first, ask second" | One string. The site's own copy trains the behaviour we are fighting |
| 6 | **Build eager scene loading first.** Then decide the gate | Without it the gate lifts onto an empty canvas at 4.6s on Fast 3G |
| 7 | **Voice: "I do not know that one, and I am not going to guess."** Never a promise | A commitment is the one falsehood class the guard cannot check |
| 8 | ~~Finish the phone~~ **DONE, 8 commits.** Bloom won the fork; composer stays | Hero **3.16% → 8.84%**, contact **6.10% → 23.35%**. Mobile now exceeds desktop at both |
| 9 | **Asanjo as one engagement** — storefront and the catalogue imagery that fills it | The only named, checkable, end-to-end work on the site |
| 10 | **Animate only the return edge and the token** in the workflow chart | +803 bytes, zero JS, zero dependencies |
| 11 | **Expose the Redis ask-counter** as a private, cookie-free aggregate | The instrument already exists and has never been read |
| 12 | **Make rule 24 a build gate** in `check-corpus.ts` | 54 memories, 8 cards, ~36 bodies in no HTML at all |

## What would prove each wrong, and what undoing costs

| # | Falsified by | Undo cost |
|---|---|---|
| 1 | Ask-origin data showing visitors reach `work` by asking, not scrolling | One array reorder. **No seed re-roll — order does not touch `M`** |
| 2 | §07's index not fitting 653px, where `overflow: hidden` deletes rather than scrolls | One revert; but the memory `stopId` moves come with it |
| 3 | Anchor uptake above ~2% arguing for more navigation, not less | One `<a>` |
| 4 | An ask rate at the top of the range making withholding safe | Copy only |
| 5 | Nothing. This is free | One string |
| 6 | Scene chunk already cached for most real visitors | One import change |
| 7 | Nothing found. Disclosure costs are context-bound; concealment costs hit hireability | Copy only |
| 8 | Contrast fell? It did not — **10.50 → 10.28 mobile**, floor 4.5 | Per-commit revert; each step separate. Take budget from `nebulaPoints`, never `secondaryPerNode` |
| 9 | Asanjo asking not to be named after all | Delete two memories |
| 10 | A judge panel finding the motion says nothing | Two CSS rules |
| 11 | Nothing. It is a counter that already runs | Delete an endpoint |
| 12 | The gate proving unsatisfiable at memory grain | One script check |

## Collisions, preserved rather than averaged

- **Reduction budget.** Only one reduction may be taken — the branch and the disclosure thesis
  are correlated in the wrong direction. *Thesis agent:* "if only one may be taken, take the
  branch, because a branch is opt-out and the thesis is opt-in." *Branch agent:* the branch
  fails on geometry regardless. **Both point the same way; the reasoning was never reconciled.**
- **Segmentation.** *Audiences agent:* "Detection is the second half of an answer whose first
  half is a navigation." *Thesis agent* accepted this in full and corrected its own text.
  Settled: **segment the content, never the entry.**
- **Cueing.** *Cueing sweep:* on-page cues are missed — 24% noticed non-ad banners.
  *Intro agent:* "banner blindness is a position and format effect, and the hero `<h1>` is
  neither." **Unsettled. It supports the sentence more cleanly than it supports the gate.**
- **The advocate's dent, unanswered:** the chat is "a grounded-RAG widget with a serif skin.
  Nothing in the pattern itself produces 'his mind' over 'a chatbot' — that reading is hoped
  for." **Only decision 11 can settle it.**

## Questions only MJK can answer — with a default if he does not

| Question | Option A | Option B | **Default** |
|---|---|---|---|
| Asanjo facts: role, dates, stack, outcome, which theme | Supply them → a named case study | Silence | **Hold the website tile; ship the apparel stop, which the corpus already licenses** |
| Paxel | Keep whole | Drop | **Trim to the judgment quotes; cut the volume numbers** |
| The intro gate | Build it | Scrap it | **Build eager loading (decision 6) regardless; decide the gate after** |
| Portrait colour vs `DESIGN.md` | Rule the intro part of the WebGL layer, amend the doc | — | **Neutral white; take no silent exception** |
| MruNN recording | Real data, names changed | Seeded demo tenant | **Seeded demo** |
| Contact address | A domain address | Keep as is | **Keep, flagged** |
| Lead capture | Store questions | Do not | **Do not — decision 7 removed the need** |

## The retraction ledger

| Claim | Status |
|---|---|
| "Attract loop lost by 90% over 502 sessions" | **Unsourced.** Direction survives; number does not |
| "5–15% chat engagement" | **Unattributed editorial.** Anchors are 0.84% and 0.5%; estimate 2–8% |
| `PLAN.md` §6.2 "LinkedIn absent from the site" | **False when written.** Corrected |
| "6,000–8,000 particles, 43ms" for the portrait | **Wrong by 3x.** The objection does not stand |
| "Portrait needs ≥1500px" (mine) | **~1280px, comfortable from 1366** |
| "The scroll carries existence" (mine) | **Existence AND evidence** |
| "`subMaxNodes` 720→200 is a saving" | **It is not.** Neither cap is ever reached |
| The 86ms flight frame gap | Retracted earlier; **still asserted in `globals.css:185-190`** |

## The one number to measure

**Sessions, sessions-with-an-ask, and asks split by origin — card, chip, or typed.**
Instrument: the Redis counter already running in `lib/security/limits.ts`. Nobody has published
that split for any site, and it is the only thing that can settle whether this site is what it
claims to be.
