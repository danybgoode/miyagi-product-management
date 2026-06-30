# Mercado Libre sync — Sprint 4: Two-way stock sync (the oversell-safe core)

**Status:** 🟦 READY — not started. **Risk: HIGH** (mutates Medusa Inventory + writes to ML). Daniel
merges. Behind a per-seller enable + `ml.sync_enabled` kill-switch. The reconciliation job ships **with**
the live sync, not after.

| Story | Status | Commit |
|---|---|---|
| US-10 — Medusa inventory subscriber → push stock to ML (debounced, idempotent) | ⬜ | |
| US-11 — ML webhook → adjust Medusa inventory (replay-safe) | ⬜ | |
| US-12 — Oversell-safe source-of-truth + reconciliation job + drift alerts | ⬜ | |
| api spec (`e2e/ml-stock-sync.spec.ts`) | ⬜ | |

> Goal: selling on either platform keeps stock consistent and **never oversells**. This is the core; it is
> gated per-seller behind a kill-switch so it can't oversell at scale before it's proven.

## Stories

### US-10 — Medusa inventory subscriber → push stock to ML
**As the** system, **I want** a Medusa stock change on a linked item to update its ML `available_quantity`,
**so that** ML reflects Miyagi sales. A Medusa **inventory subscriber** (`apps/backend/src/subscribers/`)
fires on inventory change for linked items → updates ML — **debounced** (collapse bursts), **idempotent**
(safe to retry), and **rate-limit aware** (back-off).
**Acceptance:** decrementing a linked product's Medusa stock updates the ML item quantity once (bursts
collapse); a retried/duplicated event doesn't double-apply; ML rate-limits trigger back-off, not failure.
**Risk:** high (external write; oversell)

### US-11 — ML webhook → adjust Medusa inventory
**As the** system, **I want** an ML sale (or stock change) to adjust Medusa inventory for the linked item,
**so that** Miyagi reflects ML sales. Reuse the despacho webhook receiver shape; on an ML
order/items notification, resolve the linkage and **adjust Medusa Inventory** — **replay-safe** (ML can
redeliver) and idempotent per ML event id.
**Acceptance:** an ML sale of a linked item decrements Medusa inventory exactly once; a redelivered
webhook is a no-op; an unlinked item is ignored cleanly.
**Risk:** high (inventory mutation; oversell)

### US-12 — Oversell-safe source-of-truth + reconciliation
**As a** seller, **I want** stock to never oversell and drift to self-heal, **so that** I trust the sync.
Define the **source-of-truth** rule per linked item and the conflict resolution when both sides move; ship
a periodic **reconciliation** job that compares Medusa vs ML quantities for linked items and corrects
drift, plus a **drift alert** when it can't. Per-seller enable + `ml.sync_enabled` kill-switch.
**Acceptance:** a simulated near-simultaneous sale on both sides resolves to the correct remaining stock
with no oversell; the reconcile job corrects an injected drift; flipping the kill-switch halts all sync
immediately.
**Risk:** high

## Sprint QA
- **api spec(s):** `e2e/ml-stock-sync.spec.ts` (api) — subscriber pushes once on a stock change + idempotent
  retry + rate-limit back-off (US-10); webhook decrements once + replay no-op + unlinked-ignored (US-11);
  conflict resolution + reconcile-corrects-drift + kill-switch-halts (US-12). Mock the ML API + inventory
  events; assert no path can produce negative/oversold stock.
- **browser smoke owed:** **YES, to Daniel — correctness path.** With a real ML **sandbox**: sell a linked
  item on ML → confirm Miyagi decrements; reduce Miyagi stock → confirm ML reflects; inject drift → confirm
  the reconcile job heals it. (Concurrency/oversell can't be fully covered by an automated browser smoke.)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge) · ML **sandbox**

1. Enable ML sync for one test seller (per-seller flag) with `ml.sync_enabled` ON; pick a linked item with
   stock = 5 on both sides.
2. Buy 1 of that item on ML (sandbox).
   → Within the sync window, Miyagi inventory for that item shows **4**; the ML webhook event is logged once.
3. Sell 2 of that item on Miyagi.
   → The ML item quantity updates to **2**; the subscriber push is logged once (no duplicate).
4. (drift) Manually set the ML quantity wrong (e.g. 9) and wait for / trigger the reconcile job.
   → Reconciliation corrects ML back to the true remaining (2); a drift event is recorded.
5. Flip `ml.sync_enabled` OFF.
   → No further pushes or webhook-driven adjustments occur (sync halted).

If any step fails, note the step number + what you saw — that's the bug report.
**Correctness/oversell path:** steps 2–4 are owed to Daniel; keep the kill-switch ready as the instant
rollback.
