# Owned-shop operating channel — make a shop sellable without marketplace admission — Sprint 3: The seller can actually choose

**Status:** ⬜ not started

## Epic-mode boundary

The capability works by Sprint 2; here it becomes something a merchant can *ask for*. This sprint
re-opens a contract the parent epic deliberately closed (`publish_to_market: null`), so it is the one
that must be explicit about what a client written against the old refusal now sees.

## Stories

### Story 3.1 — Re-enable owned-shop-only publication end to end

**As a** merchant, **I want** to create a product for my own shop without listing it in the Mexico
marketplace, **so that** my shop is my own channel and the marketplace is a choice.

**Acceptance:**

- `publish_to_market: null` is accepted again and means **"operating channel only"** — buyable on the
  owned shop, absent from every country marketplace. It no longer means "no channel at all".
- The refusal that the parent epic installed is **removed deliberately**, and
  `product-publication.ts`'s header comment — which currently instructs the reader to build this epic
  first — is rewritten to describe what now exists. Leaving a stale "this is impossible" comment in place
  is how the next person re-derives a settled decision.
- A client that previously received the loud refusal now succeeds; the change is stated in the PR body
  as a contract change, with the call sites named.
- The unsellable state stays unreachable: there is **no** value of `publish_to_market` that produces a
  product in zero channels. Assert it exhaustively over the input domain, not by example.
- Seller-agent (MCP) product creation exposes the same choice with the same semantics — surface parity,
  per AGENTS rule #3.

**Risk:** high (publication/authorization contract)

### Story 3.2 — Publish and unpublish an existing product

**As a** merchant, **I want** to list an existing own-shop product in the marketplace later — or pull it
back out — **so that** the decision is reversible and not frozen at creation.

**Acceptance:**

- Publishing adds the marketplace channel and leaves the operating channel intact.
- Unpublishing removes the marketplace channel **only**. The product stays buyable on the owned shop; it
  never lands in zero channels.
- Unpublish is proven by the deterministic pair the parent epic used: after unpublish the product is
  **present** on the owned shop and **absent** from `/mx`, and it can still be bought.
- Whatever caches channel membership (ISR, `unstable_cache` tags, the storefront's shop reads) is
  invalidated so the change is visible without a deploy — or the staleness window is stated in the doc.
- The action is authorized to the owning seller only, and a partner/agent caller obeys the existing grant
  rules.

**Risk:** med (reversible, but touches publication state)

### Story 3.3 — Seller, admin and agent surfaces for operating-vs-published

**As a** merchant or operator, **I want** to see whether a product is *buyable*, *published*, or both,
**so that** "it is on my shop" and "it is in the marketplace" stop being the same word.

**Acceptance:**

- The seller's listing view distinguishes the two states with distinct labels — a product that is
  buyable-but-unpublished is not shown as an error or as "draft".
- Admin/partner shop summaries expose operating-channel and marketplace-channel membership as separate
  facts, consistent with the parent epic's market labels.
- The seller-agent read surfaces the same distinction, and a write that would publish into a market whose
  marketplace is not open still fails closed with an actionable message.
- Copy is es-MX (AGENTS rule #5). No new bilingual surface is introduced.
- No general seller UI offers US marketplace publication.

**Risk:** med (read/label surfaces over a settled contract)

## Sprint QA

- **api specs:** `publish_to_market: null` → operating channel only; exhaustive proof that no input
  yields zero channels; publish/unpublish round-trip with the present-on-shop / absent-from-`/mx` pair;
  authorization on publish/unpublish; label derivation for the three states.
- **browser spec:** the seller listing view showing a buyable-but-unpublished product without an error
  state.
- **browser smoke owed:** **yes, to Daniel** — one real unpublish of a live product and a purchase after
  it, to prove the money path survives losing marketplace membership.
- **deterministic gate:** both repos' `tsc` + build + full suites green; parent epic's market population
  guard and D4 owned-shop guard still green.

## Sprint 3 — Smoke walkthrough (do these in order)

Env: production.

1. Create a product choosing "my shop only".
   → Renders on the shop page, subdomain and embed. **Absent** from `/mx`, `/mx/l` and marketplace search.
2. Buy it end to end. **(money step — Daniel)**
   → Succeeds.
3. Publish it to the Mexico marketplace from the seller UI.
   → Appears on `/mx` within the stated cache window; still buyable throughout.
4. Unpublish it again.
   → Disappears from `/mx`; **still buyable** on the owned shop. Buy it once more to prove it. **(money step — Daniel)**
5. Ask the seller agent for the product's state over MCP.
   → Reports operating and published as **separate** facts, matching what the UI shows.
6. Attempt to publish it to `us` through any surface.
   → Fails closed with an actionable message; nothing mutates.

If any step fails, note the step number + what you saw — that's the bug report.
