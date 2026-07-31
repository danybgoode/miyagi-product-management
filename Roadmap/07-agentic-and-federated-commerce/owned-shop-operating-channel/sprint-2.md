# Owned-shop operating channel — make a shop sellable without marketplace admission — Sprint 2: Membership becomes load-bearing

**Status:** ⬜ not started

## Epic-mode boundary

This is the sprint that can take the storefront dark, and the only one. Until now the operating channel
was inert; here the publishable key starts resolving through it and every new product joins it. **It must
not start before Sprint 1's backfill is verified complete** — a key scoped to a channel with missing
products serves a partial catalog that looks perfectly healthy (README E2).

## Stories

### Story 2.1 — Publishable-key membership and the buyability proof

**As a** buyer, **I want** an owned-shop product to resolve at checkout, **so that** a shop can sell
something it never listed in the country marketplace.

**Acceptance:**

- The storefront publishable key is linked to the operating channel **in addition to** the marketplace
  channel. Link rows are counted before and after and match the Sprint 1.1 baseline plus exactly the
  expected new rows — no orphans, no duplicates (the 70-of-72 seed-residue incident is the precedent).
- A product in the **operating channel only** resolves on the channel-scoped `/store/products/:id` and
  can be added to a cart and bought end to end.
- A product in **both** channels behaves exactly as it does today — existing Mexico checkout is
  regression-free, including price, inventory reservation and fulfillment.
- `/mx` marketplace listings are **unchanged**: still filtered by the marketplace channel, still the same
  count. Adding a second membership must not add a single row to the marketplace catalog.
- The key change is a **production mutation performed by Daniel** from a reviewed command, with the
  before/after link-row counts in the report.
- Rollback is stated explicitly: what to unlink, in what order, and what the catalog looks like at each
  step.

**Risk:** high (a wrong key membership is a silent empty or bloated catalog)

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

## Sprint QA

- **api specs:** operating-channel-only product is buyable; both-channel product unchanged; create fails
  closed on missing operating channel and on unknown seller market; mechanical enumeration of product
  create/update writers; marketplace listing count unchanged; parent D4 owned-shop guard still green.
- **browser smoke owed:** **yes, to Daniel** — a real money-path purchase of an operating-channel-only
  product, and one regression purchase of an ordinary marketplace product. Automated specs cannot cover
  the live payment rails.
- **deterministic gate:** backend `tsc` + build + full suite green; frontend suite green (it should be
  untouched — if it is not, say why).

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production, after the publishable-key change.

1. Open `https://miyagisanchez.com/mx/l` and count the catalog.
   → Unchanged (72 at the time of writing). The second membership added nothing to the marketplace.
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
