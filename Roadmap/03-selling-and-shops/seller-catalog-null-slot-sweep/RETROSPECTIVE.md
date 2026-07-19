# Seller-catalog null-slot sweep — 23 reads across 21 runtime files — Retrospective

_Closed: 2026-07-19_

## What shipped

- Backend [PR #104](https://github.com/danybgoode/medusa-bonsai-backend/pull/104), squash
  `f813206`, deployed as `medusa-web-00003-jgv`: 23 unsafe seller→products reads across 21 runtime
  files now pass through typed null-filtering helpers.
- Twelve historical ownership reads include soft-deleted products with nested Medusa
  `QueryContext` semantics: 11 seller-order authorization seams plus paid-ticket redemption.
- All order-level authorization now requires the seller own every resolvable item and fails closed
  for empty/missing/mixed items or relation-query errors.
- An import-aware TypeScript-AST inventory guard owns every `products.*` relation selection,
  migrated resolver call, deleted-inclusive historical call, and all-item ownership seam.

## What went well

- Re-grep found the true scope—including a seed-missed home-personalization read—before edits.
- Combining the planned HIGH and LOW PRs avoided leaving the active public attribution failure live
  through a second review and deploy. Three story commits kept the larger PR reviewable.
- The fresh review caught two correctness gaps the first green gate did not: ticket redemption
  needed deleted-inclusive history, and several touched order routes were pre-existing fail-open or
  partial-ownership checks. Absorbing both made the epic’s “other seller remains 403” acceptance true
  instead of documenting a known exception.
- Risk-based model routing held: Sol/high owned Medusa and authorization work; Terra/medium handled
  bounded frontend/test changes and independent audits.

## What we learned

- Medusa’s top-level `withDeleted` does not automatically widen a nested relation. The nested
  relation needs its own `QueryContext({})`; verify the installed query lowering rather than relying
  on option-name intuition.
- Historical ownership is broader than “orders.” Tickets and any durable artifact that stores a
  product ID must survive listing deletion, while public catalog reads must keep default deletion
  filtering.
- A sweep guard should pin the migrated inventory and its semantic options, not just grep one
  dangerous `.map()` spelling. The final guard catches all literal `products.*` selections and
  verifies imported resolver/ownership calls.

## Gaps / follow-ups

- Owed to Daniel: authed confirm-payment, ship, release-escrow, and cross-seller 403 browser smokes
  on a disposable order whose listing was deleted; plus a real scanner redemption for a deleted
  event listing. The backend has no branch preview and production test data was not mutated to
  manufacture these cases.
