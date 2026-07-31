# Owned-shop operating channel — make a shop sellable without marketplace admission — Sprint 2: Membership becomes load-bearing

**Status:** ⬜ not started

## Build contract (locked by the architect before the builder started)

**Read D3, D5 and D7 in the epic README before writing a line.** The scaffolded version of Story 2.1 was
**wrong in a way that would have silently broken every cart in production**, and it has been rewritten.
The short version:

- **The publishable key MOVES; it never gains a second channel (D3).** A key with >1 channel makes
  Medusa 2.15.3 discard its own error into an unread `req.errors` array and fall the cart back to
  `store.default_sales_channel_id`. Exactly one link row before, exactly one after.
- **The operating channel is a superset (D2)**, which is what makes a single-channel key correct.
- **The stock-location link (D5) must already exist** from S1.3, or completion fails at reservation.
- **The frontend IS in scope this sprint (D7)** — `lib/cart.ts`'s admission gate is Story 2.3.

## Epic-mode boundary

This is the sprint that can take the storefront dark, and the only one. Until now the operating channel
was inert; here the publishable key starts resolving through it and every new product joins it. **It must
not start before Sprint 1's backfill is verified complete** — a key scoped to a channel with missing
products serves a partial catalog that looks perfectly healthy (README D10).

## Stories

### Story 2.1 — Move the publishable key to the operating channel, and prove buyability

**As a** buyer, **I want** an owned-shop product to resolve at checkout, **so that** a shop can sell
something it never listed in the country marketplace.

**Acceptance:**

- The storefront publishable key is **unlinked from the marketplace channel and linked to the operating
  channel** — per **D3**, never linked to both. Link rows counted before and after: **1 → 1**, matching
  the D1 baseline. Any run that would leave the key holding two channels **aborts**, and a spec asserts
  that refusal (the 70-of-72 seed-residue incident is the precedent for counting; D3 is the reason for
  the cap).
- A spec encodes **why**: with two channels and no `sales_channel_id` in the body, Medusa assigns the
  cart the **store default** channel silently. Cite `ensure-pub-key-sales-channel-match.js` and
  `find-sales-channel.js` — do not paraphrase the mechanism, name the source.
- The operating channel is confirmed linked to every stock location the marketplace channel is linked to
  (**D5**) **before** the key moves. If it is not, the move refuses.
- A product in the **operating channel only** resolves on the channel-scoped `/store/products/:id` and
  can be added to a cart and bought end to end.
- A product in **both** channels behaves exactly as it does today — existing Mexico checkout is
  regression-free, including price, inventory reservation and fulfillment.
- `/mx` marketplace listings are **unchanged**: still filtered by the marketplace channel (**D4**), still
  77. The parent epic's population guard stays green.
- The key change is a **production mutation performed by the orchestrator** from a reviewed command, with
  the before/after link-row counts in the report. The builder writes and dry-runs it only.
- Rollback is stated explicitly and matches **D9**: relink the key to the marketplace channel; the
  catalog returns to exactly today's.

**Risk:** high (a wrong key membership is a silent empty or bloated catalog — or a silently misrouted cart)

### Story 2.2 — Product create and update join the operating channel alongside publication

**As a** seller, **I want** every product I create to be buyable on my own shop, **so that** buyability
is automatic and publication is the deliberate, separate choice.

**Acceptance:**

- `seller-product-create` attaches **both** the seller market's operating channel and — when the product
  is being published — the marketplace channel. Per README E1.1's ruling; if that decision came out the
  other way, this story implements the cart-context resolution instead and says so.
- A missing operating channel **fails the create with an actionable message**. It never silently creates
  a product in the marketplace channel alone, and never in no channel at all.
- Products created for a seller whose `operating_market` is unknown fail closed rather than defaulting to
  MX (the parent epic's write-default rule).
- Every existing create path is covered — the population of create/update call sites is enumerated
  **mechanically**, not by the ones the story author remembered. A new writer added later lands in no
  bucket and reddens a spec.
- The marketplace read filter and the owned-shop read path are **untouched** — the parent D4 guard and
  the market population guard stay green.

**Risk:** high (catalog write path + authorization boundary)

### Story 2.3 — Checkout admission proves buyability, not marketplace publication

**As a** buyer, **I want** the checkout to accept a product that is sold on its own shop, **so that** the
operating channel actually reaches the money path instead of stopping at the storefront's front door.

Added at the locking pass (**D7**). Without it, Sprint 2's whole capability is unreachable: `lib/cart.ts`
→ `resolveCheckoutLines` admits every line through `GET /store/listings/:id?market=mx`, the **marketplace**
detail endpoint, so an operating-channel-only product is refused before a cart exists.

**Acceptance:**

- A **new backend admission seam** answers exactly one question: *is this product a member of this
  market's **operating** channel?* Same market scoping, same fail-closed three states as `market-read.ts`
  (`unknown` 400 / `closed` 404 / `unavailable` 503) — an unresolvable operating channel **never** falls
  back to admitting everything.
- `GET /store/listings/:id` is **untouched** and still means marketplace-publication truth (epic **E3**).
  The relaxation lives in its own route with its own single rule — not behind an option flag on the
  existing read boundary, which would be a guard the caller can switch off.
- `lib/cart.ts` calls the admission seam instead of the marketplace detail endpoint **when
  `catalog.owned_shop_only_enabled` is ON**; with the flag OFF the existing marketplace-only admission
  runs unchanged (**D8**). Both paths are specced.
- **The productId → variantId ownership proof below the gate is unchanged**, and a spec asserts it still
  fires. Admission widens by exactly one fact — *buyable on its own shop* — and never to "any product id".
  The comment block in `resolveCheckoutLines` explaining that divergence is preserved and updated, not
  deleted.
- A product belonging to **another market's** seller is refused by the new seam, with a spec.
- A **draft** product is refused: channel membership is not publish state, and D6 deliberately links
  drafts into the operating channel.

**Risk:** high (this is the anti-IDOR admission boundary on the money path)

## Sprint QA

- **api specs:** operating-channel-only product is buyable; both-channel product unchanged; **the key-move
  planner refuses any outcome leaving >1 channel on the key (D3)**; the move refuses while the
  stock-location link is absent (D5); create fails closed on missing operating channel and on unknown
  seller market; mechanical enumeration of product create/update writers; the admission seam's three
  states + cross-market refusal + draft refusal (2.3); the variant-ownership proof still fires;
  marketplace listing count unchanged (77); parent D4 owned-shop guard still green.
- **browser smoke owed:** **yes, to Daniel** — a real money-path purchase of an operating-channel-only
  product, and one regression purchase of an ordinary marketplace product. Automated specs cannot cover
  the live payment rails.
- **deterministic gate:** backend `tsc` + build + full suite green; **frontend `tsc` + build + Playwright
  `api` suite green — the frontend IS touched this sprint (D7), contrary to the scaffold.**

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production, after the publishable-key change and with `catalog.owned_shop_only_enabled` ON.

0. Re-run `GET /internal/backfill-sales-channel`.
   → The storefront key shows **exactly one** channel link, and it is the **operating** channel.
     Two links here means step 1 onward will be silently wrong — stop and roll back (D9).
1. Open `https://miyagisanchez.com/mx/l` and count the catalog.
   → Unchanged (**77** published, per D1). The move added nothing to the marketplace.
2. Buy an ordinary marketplace product end to end. **(money step — Daniel)**
   → Succeeds exactly as before: price, payment, confirmation email, order.
3. Create a product on a real shop with publication to the marketplace.
   → Lands in both channels; appears on `/mx`.
4. Create a product with **no** marketplace publication (once S3.1 lands; before that, link it by hand).
   → Renders on the shop's own page, its subdomain and its embed; **absent** from `/mx` and its search.
5. Buy that operating-channel-only product end to end. **(money step — Daniel)**
   → Succeeds. This is the capability the whole epic exists for.
6. Open the same product's id under `/mx/l/<id>`.
   → Not found. Buyable ≠ published, and the marketplace still refuses it.

If any step fails, note the step number + what you saw — that's the bug report.
