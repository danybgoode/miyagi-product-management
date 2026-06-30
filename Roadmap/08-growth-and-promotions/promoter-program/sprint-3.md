# Promoter Program — Sprint 3: Commission ledger (% per item, first-payment only)

**Status:** 🟦 READY — not started. Additive on S1–S2. **Settlement is offline (no in-app payout).**

| Story | Status | Commit |
|---|---|---|
| US-7 — Per-SKU commission % config (admin) | ⬜ | |
| US-8 — Commission accrual (paid + attributed, first-payment only) + dashboard | ⬜ | |
| US-9 — Admin settlement view (mark paid, offline) | ⬜ | |
| api spec (`e2e/promoter-commission.spec.ts`) | ⬜ | |

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
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

1. In the admin promoter console, set the custom-domain commission to a test % (e.g. 15%).
   → The value saves and shows on reload.
2. Complete a paid+attributed one-time custom-domain sale (Sprint 2 flow) under promoter "PROMO-TEST".
   → The promoter dashboard shows a commission line = 15% × the sale, status **pending**.
3. (first-payment-only) Simulate a renewal on a recurring sale for the same promoter.
   → **No new commission** accrues for the renewal.
4. (self-referral guard) Attribute a sale where the buyer is the promoter's own shop.
   → **No commission** accrues.
5. In the admin settlement view, mark PROMO-TEST's pending commission **paid** (ref "cash-001").
   → It moves to **paid** with a timestamp; pending total drops to zero.

If any step fails, note the step number + what you saw — that's the bug report.
**Note:** no in-app money moves here (offline settlement) → no live money-path smoke owed; the money path
remains the Sprint 2 / Sprint 4 checkout.
