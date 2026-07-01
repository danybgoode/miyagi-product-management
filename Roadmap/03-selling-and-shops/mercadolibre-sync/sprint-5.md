# Mercado Libre sync — Sprint 5: Resilience, observability & paid-SKU gating

**Status:** 🟦 READY — not started. Hardening + the monetization hook on top of the working sync.

| Story | Status | Commit |
|---|---|---|
| US-13 — Token-refresh recovery + re-auth surfaces + sync activity log | ⬜ | |
| US-14 — Paid/promoter-SKU entitlement gate (wiring) | ⬜ | |
| US-15 — Durable sync-state table (crash-safe, clobber-proof idempotency) | ⬜ | |
| api spec (`e2e/ml-resilience-gate.spec.ts`) | ⬜ | |

> Goal: the integration recovers from real-world failures and the seller can see what it's doing; and ML
> sync can be turned into a paid/promoter SKU when you want to monetize it.

## Stories

### US-13 — Token-refresh recovery + re-auth surfaces + activity log
**As a** seller, **I want** to be told when my ML connection needs attention and to see what synced,
**so that** I trust and can debug the integration. Harden token-refresh failure handling (a revoked/expired
refresh token prompts re-auth in `/shop/manage` rather than silently failing); add a per-seller **sync
activity log** (imports, publishes, stock pushes, webhook adjustments, reconciliations, errors). es-MX.
**Acceptance:** a revoked ML token surfaces a clear re-connect prompt (no silent breakage); the activity
log lists recent sync events with outcomes; errors are legible, not stack traces.
**Risk:** med

### US-14 — Paid/promoter-SKU entitlement gate (wiring)
**As** Daniel, **I want** ML sync to be gateable as a paid/promoter SKU, **so that** it can be monetized.
Wire an entitlement check (reuse the subscription/entitlement + promoter-SKU patterns) so sync features are
available only to entitled sellers; fail-safe (gate off ⇒ today's behavior for already-enabled testers).
Register ML sync as a promoter SKU so a promoter code + commission apply (promoter-program).
**Acceptance:** a non-entitled seller can't enable ML sync (sees the upsell); an entitled seller can; a
promoter code applies to the ML-sync SKU; flipping the gate off doesn't break enabled testers.
**Risk:** med

### US-15 — Durable sync-state table (crash-safe, clobber-proof idempotency)
**As the** system, **I want** the ML sale-application idempotency + mirror state to live in a real table, not
the linkage JSON metadata, **so that** the two bounded concurrency residuals S4 documented can't ever
double-decrement or drop state. Add a `product_ml_sync` (or extend a table) with a **`unique(link_id,
ml_order_id)`** constraint written **in the same transaction as the inventory decrement** (insert-first
idempotency), and move `last_pushed_available` / `orders_synced_at` / applied-orders off the JSON blob so
inbound and outbound writes stop clobbering each other. Requires a **migration** (deliberately out of S4).
**Acceptance:** a simulated crash between decrement and marker does NOT double-apply on retry; concurrent
inbound+outbound never lose an applied-order or the push baseline; the S4 unit invariants still hold.
**Risk:** high (inventory idempotency; migration). Daniel merges.
> Context: S4 shipped the oversell-safe core on JSON metadata (no migration) with two *safe-direction*
> residuals (crash → under-count; metadata clobber → under-count/harmless), reconcile-healed. This makes them
> impossible rather than merely bounded. Approved with Daniel 2026-07-01 (S4 close).

## Sprint QA
- **api spec(s):** `e2e/ml-resilience-gate.spec.ts` (api) — revoked-token → re-auth surface, activity-log
  entries written for each sync action (US-13); entitlement gate allows/denies + promoter-code applies +
  fail-safe (US-14). Mock ML + entitlement.
- **browser smoke owed:** to Daniel — revoke an ML **sandbox** token and confirm the re-connect prompt;
  confirm a non-entitled seller sees the upsell and an entitled one can enable.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 5 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge) · ML **sandbox**

1. As a connected seller, revoke the ML app authorization from the ML side.
   → `/shop/manage` shows a clear "reconecta tu cuenta de Mercado Libre" prompt; no silent failure.
2. Reconnect, then open the sync activity log.
   → Recent imports/publishes/stock events show with outcomes; an earlier failure is legible.
3. As a **non-entitled** seller, try to enable ML sync.
   → You see the paid/promoter upsell; sync stays off.
4. Apply a promoter code to the ML-sync SKU and complete entitlement.
   → ML sync unlocks; the sale attributes to the promoter (promoter-program).
5. Flip the entitlement gate off.
   → Already-enabled testers keep working (fail-safe); no breakage.

If any step fails, note the step number + what you saw — that's the bug report.
**Money/auth path:** step 4 (entitlement purchase + promoter attribution) is owed to Daniel.
