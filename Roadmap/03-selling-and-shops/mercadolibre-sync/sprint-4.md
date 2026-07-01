# Mercado Libre sync — Sprint 4: Two-way stock sync (the oversell-safe core)

**Status:** 🟨 BUILT — draft PRs open, **HIGH → Daniel merges**. Backend
[be `b3c9c3b`] + frontend [fe `19d9cfb`], both gates green (BE: `medusa build` + `tsc --noEmit` + 40/40
unit specs incl. 13 new; FE: `tsc --noEmit` + 9/9 api specs). Ships **fully dark**: global
`ml.sync_enabled` kill-switch **default FALSE / fail-closed** (created in Flagsmith owed) **+** a per-seller
enable (default off). The reconciliation job ships **with** the live sync. **Owed to Daniel:** the
correctness/oversell ML-sandbox smoke (steps below) + flip `ml.sync_enabled` ON + register the webhook URL
in the ML dev portal + (optional) add `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` to the Cloud Run env for
drift alerts.

| Story | Status | Commit |
|---|---|---|
| US-10 — Medusa stock change → push to ML (idempotent, rate-limit aware) | ✅ | be `b3c9c3b` |
| US-11 — ML webhook → adjust Medusa inventory (replay-safe) | ✅ | be `b3c9c3b` |
| US-12 — Oversell-safe source-of-truth + reconciliation job + drift alerts | ✅ | be `b3c9c3b` |
| api spec (`e2e/ml-stock-sync.spec.ts`) | ✅ | fe `19d9cfb` |

> Goal: selling on either platform keeps stock consistent and **never oversells**. This is the core; it is
> gated per-seller behind a kill-switch so it can't oversell at scale before it's proven.

> **Architecture notes (decided while building):**
> - **Outbound trigger = `order.placed`, not an `inventory-level.updated` subscriber.** Medusa v2 reduces
>   *available* on a sale by creating a **reservation** (reserved_quantity ↑), not by writing a stocked
>   level — and the inventory module never emits `inventory-level.updated` anyway (the constant is defined
>   but no flow emits it). So the guaranteed, exactly-once "stock consumed" signal is `order.placed`; a
>   seller **manual** stock edit pushes from the seller-product-update path; the reconcile job is the
>   catch-all. All three funnel into one `service.pushStockToMl` (linkage + token + `updateMlItem({
>   available_quantity })`), which skips-if-unchanged (collapses bursts, safe on retry) and defers an ML
>   rate-limit to the reconcile job (never throws out of a subscriber).
> - **Source of truth = Medusa** (available = stocked − reserved). Conflict resolution when both sides
>   moved = **conservative `min()`** (`reconcileStock` → `max(0, min(both))`): the reconciled quantity
>   never exceeds either side and is never negative, so neither channel can sell what the other sold. This
>   pure seam (`modules/mercadolibre/sync-utils.ts`, mirrored to FE `lib/ml-stock.ts`) is the oversell proof.
> - **Inbound** re-fetches ML's *authoritative* `available_quantity` (never trusts the webhook body) and
>   applies it with `setVariantAvailableQuantity` (clamps ≥ 0, preserves Medusa reservations); replay-safe
>   per ML notification id (a bounded dedupe ring on the linkage metadata).
> - **Per-seller enable lives on the ML connection metadata** (`sync_enabled`), co-located with the token +
>   linkage in the module's own Postgres — set via secret-gated `POST /internal/ml/sync-settings`. No new
>   migration (all S4 state rides existing json metadata).

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
- **Backend unit spec (authoritative correctness proof):** `modules/mercadolibre/__tests__/ml-sync.unit.spec.ts`
  (13 tests, run by `npm run test:unit`) — `reconcileStock` never exceeds either side / never negative over
  a wide grid (US-12), `shouldPushStock` skip-if-unchanged (US-10), the replay-safe dedupe ring (US-11),
  `clampAvailable` no-negative. **Asserts no input combination yields oversold/negative stock.**
- **api spec:** `e2e/ml-stock-sync.spec.ts` (9 tests) — the FE mirror (`lib/ml-stock.ts`) of the same pure
  invariants, so the FE gate also proves no-oversell. The subscriber/webhook/job are backend writes (no ML
  mock needed — the correctness lives in the pure seam), so there is no live-HTTP layer here by design.
- **browser smoke owed:** **YES, to Daniel — correctness path.** With a real ML **sandbox**: sell a linked
  item on ML → confirm Miyagi decrements; reduce Miyagi stock → confirm ML reflects; inject drift → confirm
  the reconcile job heals it. (Concurrency/oversell can't be fully covered by an automated browser smoke.)
- **deterministic gate:** BE `medusa build` + `tsc --noEmit` + `npm run test:unit`; FE `tsc --noEmit` +
  `npm run build` (CI) + Playwright `api` — green before merge.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (backend Cloud Run) · ML **sandbox**
**Prerequisites (owed to Daniel):** backend `b3c9c3b` deployed (confirm the live revision rolled); flip
**`ml.sync_enabled` ON** in Flagsmith (create it first — a code flag is invisible until created, default
OFF in every env); register the webhook URL **`https://<cloud-run-host>/webhooks/mercadolibre`** in the ML
dev portal; a seller already connected to ML (S1) with **one linked, published product** (S3). Optional:
set `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` on Cloud Run so drift alerts fire.

1. Enable ML sync for the test seller:
   `curl -XPOST $CLOUD_RUN/internal/ml/sync-settings -H "x-internal-secret: $MEDUSA_INTERNAL_SECRET"
   -H 'content-type: application/json' -d '{"seller_slug":"<slug>","enabled":true}'` → `{sync_enabled:true}`.
   Pick a linked item with stock = **5** on both sides.
2. Buy 1 of that item on ML (sandbox).
   → Within the sync window Miyagi inventory shows **4**; the ML webhook applied it once (a redelivery of
   the same notification is a no-op — replay-safe).
3. Reduce the item's stock on Miyagi to **2** (a Miyagi sale via `order.placed`, **or** a manual stock edit
   in Mi tienda → the seller-product-update path).
   → The ML item `available_quantity` updates to **2**; the push is logged once, and an unchanged re-trigger
   is skipped (idempotent).
4. (drift) Manually set the ML quantity wrong (e.g. **9**) and wait for / trigger the `reconcile-ml-inventory`
   job (`*/30`).
   → Reconciliation corrects ML back to the true remaining (**2**, the conservative minimum); if it can't
   read/reconcile an item, a Telegram drift alert fires.
5. Flip `ml.sync_enabled` **OFF**.
   → No further pushes or webhook-driven adjustments occur (the webhook ACKs 200 and ignores; the job
   early-returns). This is the instant rollback.

If any step fails, note the step number + what you saw — that's the bug report.
**Correctness/oversell path:** steps 2–4 are owed to Daniel (concurrency/oversell can't be fully covered by
an automated browser smoke); keep the kill-switch ready as the instant rollback.
