# Promoter Program — Sprint 3: Commission ledger (% per item, first-payment only)

**Status:** ✅ MERGED 2026-06-30 — PR [#141](https://github.com/danybgoode/miyagisanchezcommerce/pull/141) squash `fff04ca` (HIGH: DB migration; Daniel-authorized merge). Additive on S1–S2. **Settlement is offline (no in-app payout).** Migration applied to prod Supabase; `promoter.enabled` flipped **on**.

| Story | Status | Commit |
|---|---|---|
| US-7 — Per-SKU commission % config (admin) | ✅ | squash `fff04ca` (#141) |
| US-8 — Commission accrual (paid + attributed, first-payment only) + dashboard | ✅ | squash `fff04ca` (#141) |
| US-9 — Admin settlement view (mark paid, offline) | ✅ | squash `fff04ca` (#141) |
| api spec (`e2e/promoter-commission.spec.ts`) | ✅ | squash `fff04ca` (#141) |

> **Build notes.** Gate green: `tsc` ✓ · `build` ✓ · Playwright `api` vs preview ✓ (incl. 401/404 route guards).
> Accrual is a pure seam (`lib/promoter-commission.ts`) hooked into `markAttributionPaid`
> (eager, idempotent via `UNIQUE(attribution_id)`); SKU vocabulary lives in `lib/promoter-skus.ts`
> (no import cycle). Migrations applied to prod: `promoter_commission_s3` (tables +
> `promoters.clerk_user_id` for the self-referral guard) + `promoter_commission_s3_checks`
> (rate 0–100 / cents ≥ 0 / `status IN ('accrued','paid')`).
> **Cross-review (codex):** import cycle → extracted `promoter-skus.ts`; migration CHECKs added;
> `no_gross` reason split from `no_rate`. **Owed to Daniel:** the browser render smoke below.
>
> ⚠️ **Learning (kill-switch ↔ preview tests):** flipping `promoter.enabled` ON in the shared Flagsmith
> env also flipped the **preview's** eval, breaking the S1 "feature hidden (flag off) → 404" Playwright
> assertions (validate-code → 200 invalid-code; attribute → 401). Fixed by asserting the flag-gated
> guards in **both** states (`[200,404]` / `[401,404]`) so the gate never couples to the live flag value.

> Goal: turn attributed sales (S1) into a **commission ledger**. Per-SKU %, accrued on a **paid +
> attributed** sale, **first-payment/first-year only**. No money moves in-app — admin marks paid offline.

## Stories

### US-7 — Per-SKU commission % config (admin)
**As** admin, **I want** to set a commission % per SKU, **so that** I can tune the economics without a
deploy (mirrors the referral-settings admin pattern). One % per SKU (custom domain, subdomain when it
exists, printed ad, future ML add-on).
**Acceptance:** admin sets/edits a % per SKU; values persist; bad input (negative / >100) rejected.
**Risk:** low

### US-8 — Commission accrual + promoter dashboard
**As a** promoter, **I want** to see commission earned/pending on my paid, attributed sales, **so that** I
know what I'm owed. On an order that is **paid AND attributed** (S1 row exists), accrue commission =
SKU % × eligible amount. **First-payment/first-year only:** a recurring subscription accrues on the
initial payment **only** (no accrual on renewals); a one-time sale accrues once. **Self-referral guard:**
do not accrue when the promoter is the buyer/owner of the shop. Promoter dashboard shows earned /
pending / paid.
**Acceptance:** a paid+attributed one-time sale accrues exactly once at the right amount; a recurring
sale accrues only on the first payment (a simulated renewal accrues nothing); a self-attributed sale
accrues nothing; the dashboard totals match.
**Risk:** med (ledger logic; no money mutation)

### US-9 — Admin settlement view (mark paid, offline)
**As** admin, **I want** to mark commissions paid after settling in cash/transfer, **so that** the ledger
reflects reality. A settlement view lists accrued/pending per promoter; marking paid stamps paid-at +
optional reference. **No Stripe transfer** in v1.
**Acceptance:** admin marks a promoter's pending commissions paid; they move to "paid" with timestamp;
totals reconcile; the action is idempotent.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/promoter-commission.spec.ts` (api) — % config validation (US-7); accrual amount +
  exactly-once + first-payment-only + self-referral-guard (US-8); settlement state transition + idempotency
  (US-9). Prefer a pure `lib/` accrual seam for free coverage.
- **browser smoke owed:** to Daniel — confirm the promoter dashboard + admin settlement view render with
  real attributed data from an S1/S2 test sale.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge).
**Pre-req (owed to Daniel):** the migration `20260630120000_promoter_commission.sql` is applied to
the shared Supabase, and `promoter.enabled` is flipped **on** (Flagsmith). Use a test promoter `PRM-TEST…`.

1. Open `/admin/promoter` → section **"Comisión por SKU"**. Set **Dominio propio** to `15` and press **Guardar**.
   → Shows "Comisión guardada."; the value persists on reload. *(Try `-1` or `150` → "Datos inválidos.".)*
2. Complete a paid+attributed one-time custom-domain sale (the Sprint 2 flow) attributed to the test promoter.
   → Open `/promotor/PRM-TEST…` → a commission line **Dominio propio · 15% de $X** shows status **Pendiente**;
     the **Ganado** and **Pendiente** totals equal 15% × the sale.
3. *(first-payment-only)* Re-fire the same sale's webhook (or a simulated renewal of the same attribution).
   → **No new commission** line appears (exactly-once on `attribution_id`); totals unchanged.
4. *(self-referral guard)* Attribute a sale where the promoter's own Clerk account owns the enrolled shop
   (set `marketplace_promoters.clerk_user_id` = that shop's owner).
   → **No commission** accrues for that sale.
5. Back in `/admin/promoter` → section **"Liquidación de comisiones"**: type a reference (`cash-001`) on the
   pending line and press **Marcar pagada**.
   → It disappears from pending ("Comisión marcada como pagada."); on `/promotor/PRM-TEST…` the line is now
     **Pagada** and **Pendiente** drops by that amount. *(Pressing it again is a harmless no-op.)*

If any step fails, note the step number + what you saw — that's the bug report.
**Note:** no in-app money moves here (offline settlement) → no live money-path smoke owed; the money path
remains the Sprint 2 / Sprint 4 checkout. Steps 1 & 5 (admin) and 2–4 (real attributed data) are the
browser render smoke **owed to Daniel** — they need the flag on + a real S1/S2 sale.
