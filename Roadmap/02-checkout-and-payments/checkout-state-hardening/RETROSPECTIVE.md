# Retrospective — Checkout & Manual-Payment State Hardening

**Shipped:** 2026-06-07 (3 sprints, all HIGH-risk, Daniel-merged). Driven by the #3a re-audit, which
confirmed three money-path P0s on `main`: the buyer's "ya pagué" wasn't durable, a seller could ship
before payment was confirmed, and the pay-button total differed from the summary under a coupon.

## What shipped
- **S1 — durable manual-payment state.** `lib/manual-payment-state.ts` is the one vocabulary
  (`pending_payment → buyer_reported_paid → payment_confirmed → processing`): derivation, transition
  guards, es-MX `whoActsNext`/badge copy. The buyer's "Ya hice el pago" persists on `order.metadata`
  via a new `POST /store/buyer/me/orders/:id/report-payment` (BE #13) and survives reload; the frontend
  proxies to it + keeps the Telegram nudge (FE #36). The OrdersInbox no longer says "Listo para enviar"
  on an unpaid order.
- **S2 — block ship before paid.** `canSellerShip` gates the UI (`ShippingSection` hidden until
  `paymentSettled`, confirm card moved above it) AND **both** backend ship mutations — the Envia `ship`
  route and the `[id]` PATCH that `ship-manual` proxies to → 422 for unpaid manual orders (BE #14 / FE #38).
- **S3 — one total + trust polish.** `lib/checkout-total.ts` `computeCheckoutTotal` is called by both the
  summary and the pay button (coupon parity); manual methods get a structured preview before placement;
  `payment/success` shows a recovery state instead of a false success on null completion; SPEI/cash
  refunds read "registrado / transferencia pendiente" not "emitido" (FE #39).

## What went well
- **Medusa-first held.** Zero new tables, one new backend route, the rest rode `order.metadata` + the
  existing normalizer. Reading the backend model first re-scoped the work smaller every sprint.
- **Extract-the-seam testing.** Each sprint added pure-logic specs on `lib/` helpers
  (`manual-payment-state`, `checkout-total`) — free, deterministic coverage that *proves* invariants
  (e.g. summary ≡ CTA because both call one function; an illegal state transition is rejected).
- **Backend-first deploys with graceful frontend degradation** kept the ~12-min Cloud Run window safe;
  for S1/S2 we waited for the new route/gates to go live before merging the frontend.

## What we learned (promoted to LEARNINGS.md)
- **`normalizeMedusaOrder` does not pass top-level `order.metadata`** — it curates top-level fields.
  Client surfaces that read raw `order.metadata` silently get `{}` for Medusa orders. S1/S2 found the
  manual confirm/report/ship sections had been dead for Medusa orders for this reason; the fix was to
  read the curated top-level fields. **Read the normalizer's actual output, not the raw order.**
- **One UI action can map to multiple backend mutations.** "Ship" had two (Envia `ship` route + the
  `[id]` PATCH behind `ship-manual`). A foolproof server gate must cover every mutation, not the route
  the button names.
- **A state machine lives best as a pure, next-free `lib/` helper** mirrored once in the backend
  normalizer for agents — single source on each side, unit-tested cheaply.

## Gaps / owed
- **Money/auth browser smokes owed to Daniel** (per-sprint walkthroughs): the authed report→reload,
  the 422→200 ship transition, a stalled-payment recovery, and a SPEI/cash refund label. These need real
  buyer/seller sessions on live orders and can't be automated.
- **Out of scope → #3c:** the full assisted-refund state machine, pickup reserved-slot scheduling,
  CP-first capture, the in-chat ledger (which consumes this epic's state), and the arranged-only policy.

## Notable mechanics
- Built in `git worktree`s off `main` (both app repos were on sibling agents' branches); the root
  orchestration repo is local-only (no remote) — docs committed straight to its `main`.
- `flagsmith-nodejs` was declared on `main` but never installed in the local tree → `tsc` failed on
  `lib/flags.ts`; fixed once with `npm install --no-save --no-workspaces` at the monorepo root.
