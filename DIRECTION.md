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
| 1 | ~~Reorder~~ **DONE — `e01fcf6`, `c31f182`, `4e61a52`, `33050f9`.** `hero, origin, apac, now, work, engineering, pivot, rd350, contact`, with `§ 02 — The career` | `work` index 7 → 4, `apac` 4 → 2. Copy byte-identical except one `pivot` clause. Halo worst cell **9.96:1** against a 4.5 floor; four of twelve moved measurements went *up* |
| 1b | The twelve-stop target it grows into | `hero, origin, apac, now, work, asanjo, jewelai, mrunn, engineering, pivot, rd350, contact` — MJK's own cut, reproducing his short flow for **100% of visitors with no question asked** |
| 2 | **§07 becomes an index**; JewelAI, Asanjo and MruNN get stops; JewelAI and Asanjo get routes | 17 of 19 work memories are currently never drawn |
| 3 | **Navbar WITHDRAWN.** The hero sentence becomes the anchor; §07 is the index; `§ NN` labels self-anchor; **add `pushState` to `goToStop`** | Chat moves the viewport but produces no address. The one move that makes the chat *navigate* rather than be replaced |
| 4 | **The scroll carries existence AND evidence.** Withhold biography depth and work depth only | Never withhold a project, artefact, role, year or title |
| 5 | **Ship the hero sentence now** — promote the imperative, drop "scroll first, ask second" | One string. The site's own copy trains the behaviour we are fighting |
| 6 | **Build eager scene loading first.** Then decide the gate | Without it the gate lifts onto an empty canvas at 4.6s on Fast 3G |
| 7 | ~~Voice~~ **DONE — `97c7752`, `4a5e084`, `76d3425`.** *"I do not know that one, and I am not going to guess. It is better put to me directly."* | `topical:false` was serving THREE reasons with one rebuke — "do you know Rust?" got "Not my lane". Split. Plus a promise guard, proven by breaking it |
| 8 | ~~Finish the phone~~ **DONE, 8 commits.** Bloom won the fork; composer stays | Hero **3.16% → 8.84%**, contact **6.10% → 23.35%**. Mobile now exceeds desktop at both |
| 9 | **Asanjo as one engagement** — storefront and the catalogue imagery that fills it | The only named, checkable, end-to-end work on the site |
| 10 | **Animate only the return edge and the token** in the workflow chart | +803 bytes, zero JS, zero dependencies |
| 11 | ~~Expose the Redis ask-counter~~ **DONE — `b77edcb`, `9367f5d`, `9a543be`, `efb1ec5`, `369e22d`, `decb406`.** `GET /api/instrument`, plain text, `INSTRUMENT_TOKEN` | The instrument already existed and had never been read. It now counts views, asks, **card/chip/typed**, depth, stop and outcome — and on its first live run it caught itself rendering an unreachable store as a site nobody had visited |
| 12 | ~~Rule 24 as a build gate~~ **DONE — `8e63f97`, and it FAILS out loud.** 17 of 54 memories reach the HTML; §04 is 2 of 19 | Ships as a warning with a floor of 17 that errors on regression. Decision 2 is what closes it |

| 13 | ~~The fork~~ **DONE — `39ffcd1`, `f101480`, `9d2ac1d`.** The axon forks at soma 2 and rejoins at soma 5; the camera takes it during a routed flight | Draw calls unchanged 22→22 / 18→18. Caught a contrast regression at the first radius: p05 fell to 4.30, under the 4.5 floor |
| 14 | ~~Task 38, the career rail~~ **DONE — `71d612c`.** Rail after the title, paragraph below it | Was 0 rows above the fold; now both era captions and three full rows. The obvious fix — flipping the order — was screenshotted and rejected: it deletes the kicker, the title AND the body |
| 15 | ~~The dev server~~ **DONE — `e4b57b0`.** It was never broken; a four-hour-old server on the next port was | `npm run serve:check`, and dev moves to 3001 so `start` on 3000 cannot shadow it |

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
| 11 | Nothing. It is a counter that already runs | **Unset `INSTRUMENT_TOKEN`** — the route 404s to everyone, owner included. Delete `proxy.ts` to drop the denominator. Neither touches a line the visitor sees |
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

**Answered 2026-09-06.** Nothing here is blocking any more.

| Question | Answer |
|---|---|
| Asanjo | **Named — and CORRECTED 2026-09-06.** Imagery first, then contracted to rebuild the storefront: Shopify 2.0 theme, 309 commits, 31 Mar – 26 Jun 2026, scroll-scrubbed video hero from an AI-generated clip of a real product. **But the theme is NOT live** — the design `asanjokutch.org` serves today is not his, so the site must not link it as his work. A screen recording replaces it. **"Siddhi" is the client's POC, a person, and must never appear** |
| Paxel | **Keep** |
| The intro gate | **Build it.** Duration is mine to choose — he proposed 3–5s and has since said 1–2s is fine "depending on how you build it" |
| Portrait colour | **Cyan is authorised.** Better still, no exception is needed: rule the intro part of the WebGL layer, where cyan is already native |
| MruNN recording | **Later.** Not blocking |
| RD 350 photograph | **Fine as they are.** Blocked item 1 closed — stop waiting for a wider frame |
| Contact address | **Keep** |
| Fonts | **Left to me** |
| TallyBridge | **Public on GitHub**, a library he is still working on. Find the URL and link it |
| Lead capture | **Not needed** — decision 7 removed it |

## The retraction ledger

| Claim | Status |
|---|---|
| "Attract loop lost by 90% over 502 sessions" | **Unsourced.** Direction survives; number does not |
| "5–15% chat engagement" | **Unattributed editorial.** Anchors are 0.84% and 0.5%; estimate 2–8% |
| `PLAN.md` §6.2 "LinkedIn absent from the site" | **False when written.** Corrected |
| "6,000–8,000 particles, 43ms" for the portrait | **Wrong by 3x.** The objection does not stand |
| "Portrait needs ≥1500px" (mine) | **~1280px, comfortable from 1366** |
| "The scroll carries existence" (mine) | **Existence AND evidence** |
| "A shortcut is 1.1% shorter and would read as a duplicated mesh" | **Wrong by 7.5x.** Compared against the straight node polyline, not the drawn curve. It is 8.3% shorter and separates by 313–354px on a 900px frame |
| "The chat breaks — an answer would have nowhere to dock" (mine, called fatal) | **False.** `ChatDock.tsx:165` already renders inline when no container exists |
| "thoughtbot segments the entry successfully" | **False.** Fetched and checked: plain hub nav, no entry chooser |
| "First proof moves to screenful 2.3" (mine) | **3.28** on the same table's own convention |
| "`subMaxNodes` 720→200 is a saving" | **It is not.** Neither cap is ever reached |
| The 86ms flight frame gap | Retracted earlier; the last place still asserting it was fixed in `8f424c2` |

## The one number to measure

**Sessions, sessions-with-an-ask, and asks split by origin — card, chip, or typed.**
Instrument: the Redis counter already running in `lib/security/limits.ts`. Nobody has published
that split for any site, and it is the only thing that can settle whether this site is what it
claims to be.

**Built.** `GET /api/instrument?key=$INSTRUMENT_TOKEN`. Read it with
`curl -H "Authorization: Bearer $INSTRUMENT_TOKEN" https://mjk.nila.li/api/instrument`.

One correction to the ask above, made rather than assumed: **a session is not measurable
here and the report does not pretend otherwise.** A session needs a device identifier, and
the privacy page's "No cookies" rules out both a cookie and a `sessionStorage` flag
(ePrivacy Art 5(3) covers storage, not merely cookies). What is measured instead is *page
views* — document requests the server already served, crawlers bucketed separately — and a
per-day HyperLogLog of the address hash the limiter already computes, which estimates
distinct visitors and can say how many, never who. Both are named as approximations on the
page that prints them.

**Do not read a first week of it as evidence.** Every ratio carries a Wilson interval and
says outright when the band is too wide to separate 2% from 8%, which at this site's traffic
will be true for some time. The instrument's job is to stop the guessing eventually, not to
replace one unattributed number with a thinly-sourced one — which is exactly how the
`5–15%` figure got onto the retraction list above.
