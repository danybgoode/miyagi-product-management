# Sprint 1 — The spine: idempotency + ML order materialization + state mapping

> Epic: [ml-orders-native](README.md) · Risk: **HIGH** (Daniel merges) · Backend-first; dark behind
> `ml.orders_enabled` (default OFF).
> **Plan-mode prerequisite:** read the S4 stock-sync code on **fresh `origin/main`** (local backend
> checkout is stale) and decide the inventory seam: order-creation-with-reservation supersedes the S4
> delta for linked products, or order created inventory-neutral with the delta kept. One ML order =
> exactly one inventory effect. Also confirm in the ML sandbox the exact per-order fee/shipping field
> shapes (`sale_fee_details`, shipments) — capture them in order metadata from day one (Epic B needs them).

## Stories

### US-0 · Durable idempotency table — high
**As a** seller, **I want** every ML order applied exactly once no matter how many times ML retries or the
reconcile job re-polls, **so that** I never see duplicate orders or double stock moves.
Absorbs ml-sync S5's deferred US-15: a module table with `unique(link_id, ml_order_id)`, written
transactionally with the order/inventory effect; replaces the bounded applied-orders ring.
**Acceptance:** replaying the same `orders_v2` notification 5× and running the reconcile job over the same
window produces one order and one stock move; the unit spec proves the decision fn; migration applies clean.

### US-1 · Materialize a paid ML order as a Medusa order — high
**As a** seller, **I want** a paid ML sale to appear as a real order in my Miyagi order list, **so that**
I manage it like any other sale.
Dedicated "Mercado Libre" sales channel; line items resolved via `product-ml-link`; ML buyer
(nickname/contact ML exposes), `ml_order_id`, pack id, and raw fee/shipping payloads stored on the order;
no Clerk account created; coordinated with the S4 stock path per the plan-mode decision.
**Acceptance:** sandbox ML purchase → order visible in `/shop/manage/pedidos` with correct items, price,
channel attribution — and stock moved exactly once (flag ON). Flag OFF → today's behavior exactly.

### US-2 · ML → Medusa state mapping — high
**As a** seller, **I want** the Miyagi order to track the ML order's real status, **so that** the list is
trustworthy.
Pure mapping fn (ML paid/shipped/delivered → Medusa fulfillment transitions), applied on webhook + reconcile;
out-of-order and repeated notifications safe.
**Acceptance:** mark shipped then delivered on ML sandbox → Miyagi order shows each state; replay changes
nothing; the mapping fn has an api spec covering every ML status incl. unknowns (no-op + logged).

### US-3 · Source badge + ML metadata in the order UI — low
**As a** seller, **I want** to see at a glance which orders came from ML and their ML ids, **so that** I
can cross-reference when needed.
House tokens/components only — a badge + a detail section, like any `/shop/manage` surface.
**Acceptance:** list shows an ML badge on ML orders only; detail shows ML order id + pack id; es-MX copy,
no orphan strings.

## Sprint QA

- One api spec per story: idempotency decision fn (US-0), materialization contract via internal route
  (US-1), state-mapping pure fn (US-2), badge render from SSR HTML (US-3). Pure seams in next-free `lib/`.
- Backend deploys post-merge (no preview): agent runs the prod API smoke + route-deployed probe; the
  **live ML-sandbox money path is owed to Daniel** (below).
- Signature regression: stock moves exactly once with `ml.orders_enabled` ON and OFF.

## Sprint 1 — Smoke walkthrough (do these in order)

_Placeholder — the building agent writes the fool-proof numbered walkthrough (real URLs, one action + one
expected result per step, money/auth steps flagged **owed to Daniel**) before calling the sprint done._
