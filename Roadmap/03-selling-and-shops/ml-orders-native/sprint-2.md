# Sprint 2 — Full lifecycle: cancel/refund, notifications, entitlement + kill-switch

> Epic: [ml-orders-native](README.md) · Risk: **HIGH** (US-4) · Backend-first; still dark behind
> `ml.orders_enabled` until this sprint completes the lifecycle.

## Stories

### US-4 · Cancellation / refund mapping — high
**As a** seller, **I want** an ML cancellation or refund to cancel the Miyagi order and restock exactly
once, **so that** my inventory and order list stay truthful.
Coordinated with the S4 sync + US-0 idempotency (a cancel after a materialized order must not double-restock);
partial/edge ML states surfaced honestly on the order rather than guessed.
**Acceptance:** sandbox cancel of a paid ML order → Miyagi order cancelled + stock restored once; replaying
the cancel notification changes nothing; unmapped cancel reasons land as a logged note, never a crash.

### US-5 · Seller notifications for ML orders — med
**As a** seller, **I want** new ML orders and their state changes on the notification channels I already
chose (email / push / Telegram), **so that** I don't have to watch two inboxes.
Rides the granular-notifications system; ML-sourced events join the existing order event groups — no new
preference surface.
**Acceptance:** with Pedidos notifications ON, a sandbox ML order fires the seller's chosen channels; OFF
fires nothing; copy es-MX.

### US-6 · Entitlement + kill-switch wiring — med
**As the** platform, **I want** ML order materialization gated on the `ml_sync` entitlement and the
`ml.orders_enabled` flag, **so that** the paid SKU covers it and we can kill it instantly.
Reuses `lib/ml-sync-entitlement*`; non-entitled sellers keep stock-only sync + see the existing upsell;
flag is fail-closed.
**Acceptance:** non-entitled seller → no orders materialize, upsell visible; entitled + flag ON → orders
flow; flag OFF kills materialization without touching stock sync.

## Sprint QA

- Api specs: cancel/restock decision fn (US-4), notification event-group mapping (US-5), entitlement gate
  fn (US-6). Signature regression smoke re-run (stock exactly once, both flag states).
- **Owed to Daniel:** live ML-sandbox cancel/refund walkthrough + Telegram notification receipt + the
  entitlement upsell check on a non-entitled shop.

## Sprint 2 — Smoke walkthrough (do these in order)

_Placeholder — written by the building agent before sprint close (real URLs; money/auth steps flagged
**owed to Daniel**)._
