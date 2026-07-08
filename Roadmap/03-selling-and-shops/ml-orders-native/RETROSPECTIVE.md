# ML orders, native — Retrospective

**Shipped:** 2026-07-06 (code) · epic close 2026-07-08 · 3 sprints · Area 03 · Risk HIGH throughout
**Flag:** `ml.orders_enabled` (enablement, default OFF) — **flipped ON by Daniel 2026-07-06 00:26 UTC.** Live in prod.

## What shipped
Mercado Libre sales used to only decrement stock; sellers ran two back-offices. A paid ML order now
materializes as a real, source-tagged Medusa order on a dedicated "Mercado Libre" sales channel, with
one fulfillment workflow, one notification rail, and one agent surface behind everything a seller sells:
- **S1** (backend `28f4e15` PR [#57](https://github.com/danybgoode/medusa-bonsai-backend/pull/57);
  frontend `c77a63c` PR [#170](https://github.com/danybgoode/miyagisanchezcommerce/pull/170)) — the
  spine: a durable idempotency table (absorbing ml-sync's deferred US-15), ML → Medusa order
  materialization coordinated with the live S4 stock-decrement path (one ML sale, exactly one inventory
  effect), ML → Medusa state mapping (paid → shipped → delivered), and a source badge on the seller
  order list/detail.
- **S2** (backend `6b4e8dc` PR [#58](https://github.com/danybgoode/medusa-bonsai-backend/pull/58);
  frontend `5623f97` PR [#172](https://github.com/danybgoode/miyagisanchezcommerce/pull/172)) —
  cancellation/refund mapping (restock coordinated with sync), seller notifications for ML orders via
  the existing granular multi-channel system, and the entitlement + kill-switch wiring
  (`ml_sync` grant + `ml.orders_enabled`).
- **S3** (backend `0611d73` PR [#59](https://github.com/danybgoode/medusa-bonsai-backend/pull/59);
  frontend `bef747d` PR [#174](https://github.com/danybgoode/miyagisanchezcommerce/pull/174)) — order
  tags (manual CRUD + automatic `mercadolibre` tag on ingest), bulk select + bulk fulfillment-status
  actions on the order list (source-agnostic by construction — mixed native/ML selections need no
  special-casing), and agent-surface parity: a new `list_orders` MCP tool + manifest entry.

## What went well
- **The idempotency/materialization seam held under real adversarial pressure.** US-0's `unique(link_id,
  ml_order_id)` table plus a transactional decision function (`decideMlOrderApply`) is the one thing
  standing between "an ML sale decrements stock exactly once" and a double-decrement or an order-less
  sale — cross-review across all 3 sprints repeatedly tried to break exactly this seam and repeatedly
  found either a real gap (fixed) or a claim refuted against Medusa's actual source (declined with the
  verification on the PR). Deliberately deferring the one genuinely architectural gap (a Redis-lock-down
  + double-delivery race) rather than rushing a fix under review pressure was the right call — it's an
  inherited S4 characteristic, not a Sprint 1 regression, and the real fix (insert-then-decrement)
  deserves its own pass.
- **Cross-agent review paid for itself on every sprint, including through a mid-epic tooling outage.**
  S1: codex's token was revoked mid-run; the harness auto-fell-back to Antigravity for rounds 2–4 and
  still surfaced 4 real bugs (a stranded-order retry gap, a `shipped` transition that only advanced
  `fulfillment_status` not the shipment workflow, a line-item quantity-blending bug, and an uncaught-throw
  inside the idempotency lock). S2: codex stayed unavailable (usage cap) all sprint; Antigravity (re-run
  after a pin bump) still found 2 real issues (a silently-swallowed non-2xx notify response, a missing
  idempotency marker on the cancel reconcile path) and correctly declined 3 more claims after checking
  them against real `@medusajs/core-flows` source. The **independent fresh-reviewer** pass (a distinct
  gate from the advisory cross-review) added 2 more real findings on S2. Verification against the actual
  installed source — not documentation memory — is what separated real findings from hallucinated ones
  on every round.
- **A scope-doc claim got checked against the actual code before being trusted, and turned out false.**
  US-9 was framed at grooming as "verify-not-build" (the README's own "what already exists" line claimed
  seller MCP order tools already existed). Direct research into `app/api/ucp/mcp/route.ts`'s tool
  registry found no order-read MCP tool anywhere — US-9 was reclassified as real (low-risk, additive)
  build before writing a line of code, not discovered mid-implementation.

## What we learned
- **A scope doc's "what already exists" line is a claim, not a fact — verify it against the real code
  before treating a story as a verification pass.** This generalizes the existing LEARNINGS habit of
  "grep the route before scoping a backend story" to the *epic's own prior research*, not just a fresh
  story: even a carefully-scoped epic can carry forward an inaccurate assumption from its own grooming.
- **A foreign-family reviewer degrading under a token/usage outage is still worth running — it caught
  real bugs on every sprint despite codex being unavailable for two of three.** The fallback chain
  (codex → Antigravity, with a version-pinned, fail-loud contract) meant the advisory pass never silently
  produced nothing; it's the graceful-degrade design already recorded in LEARNINGS' Tooling gotchas
  section, reconfirmed here across a longer outage than previously seen (a full sprint, not one run).
- **Bulk operations reusing a single-order code path (rather than a parallel bulk implementation) made
  "mixed source, one code path, no special-casing" free.** `applyOrderStatusTransition`, extracted
  behavior-preserving from the single-order `PATCH`, has zero ML/native branching — the bulk endpoint
  and the single-order endpoint can never drift apart on eligibility rules because they're the same
  function.

## Gaps / follow-ups
- **Owed: Daniel's live ML-sandbox smokes**, per sprint doc — S1 steps 7–12 (a real sandbox order
  materializing + state mapping), S2's cancel/refund + notification + entitlement-upsell walkthrough,
  and S3 steps 10–12 (a batch-day walkthrough mixing native + ML orders, plus the `list_orders` live
  agent round-trip — no `ms_agent_…` test-token fixture exists yet, a one-time provisioning ask, same
  shape as the existing `MS_TEST_*` secrets). The flag is already ON in prod, so these are real-traffic
  confirmations, not activation gates.
- **Companion epic `profit-analyzer` (Epic B) builds on this epic's order data** and correctly shipped
  after it, per the planned sequencing.
- **v2 seeds explicitly deferred at scope, not forgotten:** IF/THEN rule builder, order merge/split,
  batch label printing, ML buyer comms from Miyagi, label purchase for ML orders, non-ML external
  channels.
