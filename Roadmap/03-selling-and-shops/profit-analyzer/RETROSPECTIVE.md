# Profit Analyzer — Retrospective

_Closed: 2026-07-06 · 2 sprints, both shipped to prod. Epic B of the Merchant Ops PRD._

## What shipped

Sellers now see their true margin after fees/COGS/shipping on every sale, and can solve for a price
that hits a target margin and apply it with one confirmed click.

- **S1 — Data foundation: COGS + append-only ledger + dark dashboard.** Backend
  [#61](https://github.com/danybgoode/medusa-bonsai-backend/pull/61) `9967adb`, frontend
  [#178](https://github.com/danybgoode/miyagisanchezcommerce/pull/178) `86a06ea`, same-day fix
  [#179](https://github.com/danybgoode/miyagisanchezcommerce/pull/179) `45a10e6`. COGS on
  `variant.metadata.unit_cost_cents` (listing editor + bulk CSV); an append-only `financial_event`
  Medusa-module table (Postgres trigger blocks UPDATE/DELETE, unit-tested against removal) written
  from both native (`order.placed` subscriber) and Mercado Libre (materialize hook) orders; a
  read-only per-order/per-SKU margin dashboard at `/shop/manage/profit`, dark behind
  `ops.profit_enabled`. **Caught + fixed the same day it flipped:** the flag-gate-before-`notFound()`
  pattern alone wasn't enough — Next had prerendered the page with the BUILD-TIME flag value, baking a
  static 404 no flip could change. Fix: `export const dynamic = 'force-dynamic'`; promoted to
  `LEARNINGS.md` as a standalone gotcha (flag-gated *pages*, not just routes, need it).
- **S2 — Intelligence: fee estimator, suggester, one-click apply, insights.** Backend
  [#62](https://github.com/danybgoode/medusa-bonsai-backend/pull/62) `8c53702`, frontend
  [#180](https://github.com/danybgoode/miyagisanchezcommerce/pull/180) `38f8944`. ML's own
  `listing_prices` fee rate (cached per category/listing-type); the corrected solve-for-price formula
  (`price = (COGS+shipping+fixed_fee)/(1−fee%−margin%)` — fees computed against the price being
  solved for, not the current price, per the groom-time correction); one-click **Apply** writing the
  Miyagi price via the same shared `updateSellerProduct()` the existing PATCH route uses, then — only
  when linked and `ml.publish_enabled` — pushing to ML via the existing publish/update parity, both
  called in-process (no self-HTTP hop); a new `price_apply` activity-log kind; and pure
  margin-killer/underpriced classifiers rendered as dashboard call-outs.

## What went well

- **The epic reused everything Sprint 1 (and two prior epics) had already built.** The suggester needed
  no new fee-sync pipeline (ML's `listing_prices` API on demand + cache); Apply needed no new write path
  (the existing `updateSellerProduct` + `publishOrSyncProduct` reconcile seam, called directly); the
  activity log needed no new table (one more validated `kind` on the existing `ml_sync_event`). Zero new
  Medusa modules in S2 — pure additive wiring onto S1's + mercadolibre-sync's primitives.
  (Medusa-first + reuse-before-rebuild, both paid off concretely here.)
  - **Corollary — per-SKU margin rows needed a bucketing key change mid-epic, and it was safe.**
    S1's `computeSkuMargins` bucketed by `product_id` (fine for a read-only table); S2's Apply needed
    an addressable *variant* (COGS + ML links are variant/product-scoped, not aggregate). Switching the
    bucket key to `variant_id ?? product_id` was additive — existing Sprint-1 tests kept passing
    unchanged because the fixtures happened to have 1:1 product↔variant mappings, confirmed by re-running
    the full existing suite before trusting the change.
- **Writing the unit tests caught a real design bug before it shipped.** The first draft of
  `classifyUnderpriced` compared the current price against the price achievable at a 25% reference
  margin — but the "underpriced" gate already requires realized margin ≥ 40%, and the achievable-price
  formula is monotonic in margin%, so a LOWER reference than the realized floor can *never* show
  headroom. Caught while writing the boundary tests, fixed to an ambitious 55% reference before the PR
  even opened. (Promoted to LEARNINGS.)
- **Cross-agent review (codex) earned its keep again.** It caught that the fee-estimate cache was keyed
  by category/listing-type only, ignoring the reference price — for a candidate price crossing into a
  different ML fee bracket within the 60s TTL, Apply could have applied a number verified against the
  wrong bracket. Fixed by re-fetching the rate at the ACTUAL candidate price right before confirming,
  not just reusing the initial-load estimate. It also flagged two items ("custom Next routes for
  commerce", "no new UCP/MCP capability") that turned out to be a false positive (matches the established
  proxy-route convention) and a genuine-but-out-of-scope observation — both answered with a reply comment
  rather than silently building or silently ignoring.
- **A throwaway local Postgres substituted for a broken "local dev" DB.** The checked-out `.env`'s
  Neon DB turned out to be the RETIRED, now-read-only instance from before the Cloud SQL cutover —
  reachable, but couldn't take the migration and had no `financial_event` table. A fresh Homebrew
  Postgres (`initdb`+`pg_ctl` on a scratch data dir, torn down after) let a real `medusa db:migrate` +
  `medusa develop` + a real `updateSellerProduct()` call + a real `price_apply` activity-log round-trip
  all get proven against an actual database — real evidence beyond the pure-function unit suite, with
  zero shared infrastructure touched.

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md (dedupe — sharpen, don't append). -->
- **An "is there room to push this further" classifier must compare against a reference STRICTLY on the
  far side of its own gate, or it can mathematically never fire.** If the gate is "already at/above
  margin X", the headroom check must reference a target > X (not ≤ X) — an achievable-price formula that
  increases monotonically with margin% guarantees a lower-or-equal reference is already priced-under by
  definition. Write the boundary unit tests for a new "is there headroom" heuristic BEFORE trusting the
  numbers, not after. (Promoted.)
- **When a local-dev `.env`'s DB turns out to be stale/read-only/wrong, provisioning a fresh throwaway
  local Postgres (Homebrew `initdb`+`pg_ctl`, no Docker needed) is fast enough to validate a real write
  path in an agent session** — `medusa db:migrate` + a seed script for a publishable key + a one-off
  `medusa exec` script calling the actual shared functions (not the HTTP layer, when auth can't be faked
  locally) gets real database-backed proof for the highest-risk story in under a few minutes. Tear down
  after; never touch the shared/retired Neon instance for writes. (Promoted — generalizes the S1 gotcha
  about the retired Neon DB into an actionable fix, not just a known limitation.)
- **A cache keyed on a stable "rate" dimension (category, listing-type) still needs re-validation at the
  reference-input (price) that actually varies, right before a money-affecting write** — caching the RATE
  is fine for interactive/live UI feedback, but the number that gets APPLIED should be checked fresh at
  the specific value it will be applied to, not just inherited from whatever triggered the cache fill.
  (Promoted — a reusable shape for any "cached estimate → confirmed write" flow.)

## Gaps / follow-ups

- **Live money-path smoke owed to Daniel:** the full Apply flow (Miyagi price change + a real linked ML
  listing's price actually moving) against a real ML sandbox connection, through the real Clerk-
  authenticated UI. Numbered walkthrough in `sprint-2.md`; this build session had no real Clerk or ML
  sandbox credentials to self-serve it, only a database-level proof of the write path.
- **S1's own owed walkthrough steps (4–13)** were never explicitly confirmed closed in this session —
  carry them forward if not already done (editor/CSV COGS entry, a real sale → ledger row, a label buy
  completing the shipping piece, a sandbox ML sale's `ml_raw_*` eyeball, the backfill-idempotency curl).
- **Known approximations, not blockers:** `PricingCard`'s "current price" is the SKU's realized average
  unit price (no live catalog-price read exists yet); the ML link never persisted which `listing_type`
  an item published under, so the fee estimate assumes `ML_DEFAULT_LISTING_TYPE` ('bronze').
- **Out of this epic's scope (unchanged from the groom-time decision):** ad-spend ingestion (Product Ads
  API), auto-repricing / IF-THEN rules, multi-currency COGS, landed cost, custom telemetry. A UCP/MCP
  tool for seller-agent repricing was flagged by cross-review as a reasonable idea but was never in this
  epic's approved stories — a candidate seed for a future epic, not a gap in this one.
