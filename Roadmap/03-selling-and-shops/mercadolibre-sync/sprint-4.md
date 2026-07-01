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

> **Architecture notes (decided while building + hardened by cross-agent review):**
> - **Delta / source-of-truth model — NOT absolute reconcile.** Cross-review caught that comparing the two
>   channels' *absolute* available quantities can't recover concurrent independent sales (baseline 5, ML
>   sells 2 → 3, Miyagi sells 3 → 2; true remaining 0, but `min(3,2)=2` → a 2-unit oversell). So **Medusa is
>   the single source of truth**, and each channel's **sale** is applied to Medusa as a **delta, exactly
>   once**. `applySale(available, sold) = max(0, available − sold)` composes correctly with a simultaneous
>   Miyagi sale (`applySale(2,2)=0`) and never goes negative — the oversell proof (pure
>   `modules/mercadolibre/sync-utils.ts`, mirrored to FE `lib/ml-stock.ts`).
> - **Inbound (US-11)** — public `/webhooks/mercadolibre` on the `orders_v2` topic reads the order's
>   per-item **sold quantities** and **decrements** Medusa via `applySale` (preserving reservations),
>   **idempotent per ML order id** (a bounded applied-orders ring on the linkage). The order id — not the
>   notification `_id` — is the exactly-once key.
> - **Outbound (US-10) = `order.placed` + manual-edit hook → mirror Medusa's available to ML** (not an
>   `inventory-level.updated` subscriber: Medusa v2 reduces available via a *reservation*, and never emits
>   that event). Skips-if-unchanged; a manual edit pushes the product's **summed** available (multi-variant
>   safe); an ML rate-limit defers to the job (never throws).
> - **Reconcile job (US-12) = missed-webhook recovery + mirror.** Polls each seller's ML orders since a
>   per-seller marker and applies any **not-yet-applied** order (delta, idempotent) — recovering a dropped
>   webhook — then mirrors Medusa→ML so ML never advertises more than the truth. Telegram drift alert on
>   failure.
> - **Per-seller enable lives on the ML connection metadata** (`sync_enabled`), co-located with the token +
>   linkage — set via secret-gated `POST /internal/ml/sync-settings`. No migration (all S4 state rides json
>   metadata). *Deferred to S5:* ML cancellations/returns (restock) + manual ML-side stock edits (the mirror
>   keeps ML ≤ Medusa meanwhile — safe direction).
> - **Hardened over 4 cross-agent review rounds** (codex): the min-reconcile oversell → delta model; a
>   non-atomic apply → per-link Redis lock + re-check; absolute available-set → relative `adjustInventory`
>   decrement (reservation-safe); paid-only status filter; order-id (not notification-id) idempotency;
>   truncated-poll progress; mark-only-when-inventory-resolved.
> - **Known bounded residuals → S5 idempotency table (approved with Daniel 2026-07-01).** Riding sync state
>   on the linkage JSON metadata leaves two *safe-direction* concurrency residuals under rare same-item
>   concurrency: (1) a crash between the inventory decrement and the applied-order marker → double-decrement →
>   **under-count, never oversell** (decrement-first is the deliberate safe ordering); (2) concurrent
>   full-metadata rewrites (inbound ring vs outbound push marker) can drop a field → re-decrement (under-count)
>   or a harmless extra push. Both self-heal via the 30-min reconcile. The durable fix is a dedicated
>   sync-state table with a `unique(link_id, ml_order_id)` constraint + writes transactional with the
>   inventory change — a migration, deliberately out of S4's no-migration scope. **S5 story owed.**

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
  (run by `npm run test:unit`) — `applySale` decrements by exactly the sold qty / never negative over a grid
  incl. the concurrent case (US-11), the exactly-once applied-order ring (US-11/12), `shouldPushStock`
  skip-if-unchanged (US-10), `normalizeOrderItems` per-item aggregation. **Asserts no input combination
  yields oversold/negative stock.**
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
4. (missed-webhook recovery) Buy 1 more on ML, but simulate a dropped webhook (don't let it deliver, or
   temporarily point the ML webhook elsewhere). Wait for / trigger the `reconcile-ml-inventory` job (`*/30`).
   → The job polls ML orders, finds the un-applied sale, and decrements Medusa to **1** (delta, exactly-
   once — re-running the job does NOT double-decrement); it then mirrors Medusa→ML. If it can't reach ML, a
   Telegram drift alert fires.
5. Flip `ml.sync_enabled` **OFF**.
   → No further pushes or webhook-driven adjustments occur (the webhook ACKs 200 and ignores; the job
   early-returns). This is the instant rollback.

If any step fails, note the step number + what you saw — that's the bug report.
**Correctness/oversell path:** steps 2–4 are owed to Daniel (concurrency/oversell can't be fully covered by
an automated browser smoke); keep the kill-switch ready as the instant rollback.
