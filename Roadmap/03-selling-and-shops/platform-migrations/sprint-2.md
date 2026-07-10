# Platform migrations — Sprint 2: Money path — `migration` SKU + quoted estimate

**Status:** ⬜ not started
**Risk:** HIGH (money — **Daniel merges** every story here). Dark launch by construction: an
unpriced SKU is unsellable, so the SKU is inert until admin config prices it — no second flag.

## Context
Pricing accepted at the gate (2026-07-09): white-glove **$999 MXN flat ≤150 listings**, commission
**50%**; above threshold **$999 + $3 MXN/listing beyond 150 + fixed adders per custom section**;
self-serve stays **free ≤500 listings**. Grooming verified `lib/promoter-pricing.ts` resolves
*fixed admin-set* per-SKU prices only — a per-merchant computed amount doesn't fit that seam, hence
the **quoted-estimate record** (decision locked at the gate): the platform computes AND stores the
quote; the close prices the SKU from the stored record; merchant and consultant see the identical
number; a close can never charge an amount that differs from the quote.

## Stories

### Story 2.1 — `migration` promoter SKU
**As a** consultant (promoter), **I want** to sell a white-glove migration on the spot at a
platform-set price, **so that** a cash-first merchant can say yes in one visit.
**Acceptance:**
- `'migration'` added to `PROMOTER_SKUS` + `DEFAULT_COMMISSION_RATES` (50%) + the admin SKU label —
  the one-line vocabulary extension, same shape as `ml_sync`.
- Admin config prices it at $999 MXN; the close flow offers it like any SKU — cash / card /
  net-remittance all work; commission accrues first-payment-only per the existing ledger.
- The merchant-visible price and the promoter-visible price are the same number (existing
  platform-set guarantee, unchanged).
**Risk:** high

### Story 2.2 — Estimate generator + quoted-estimate record
**As a** merchant with a big catalog, **I want** a platform-computed price I can see myself,
**so that** the consultant can't improvise a number.
**Acceptance:**
- A **pure, unit-tested estimator**: inputs (listing count, image count, source platform,
  custom-section flags — sourced from the S1 parity report where available) → deterministic tiered
  price ($999 base + $3 MXN/listing beyond 150 + fixed per-section adders). Same inputs ⇒ same
  number, every surface.
- The platform persists the quote as a **quoted-estimate record** (inputs + computed total +
  reference to the parity report); merchant-visible.
- The promoter close prices the `migration` SKU **from the stored record** — a close referencing a
  quote cannot charge a different amount (server-side; the UI is courtesy, the API is the
  guarantee). No quote ⇒ only the flat-fee ≤150 path is closeable.
**Risk:** high

### Story 2.3 — "Very custom" → route to Daniel
**As a** platform owner, **I want** genuinely custom shops routed to me with evidence, **so that**
no one is silently quoted for work we can't do.
**Acceptance:**
- When the parity report trips the "very custom" flag, no closeable price is generated; instead a
  notification reaches Daniel (existing Telegram/email rails) with the parity report attached.
- The merchant/consultant see an honest "necesita revisión" state, never a number.
**Risk:** med

## Sprint QA
- **api spec(s):** pure spec on the estimator (tier boundaries: 150/151 listings, section adders,
  determinism); api spec on close-from-quote **including the tamper case** (attempt to close at a
  different amount ⇒ rejected) and the no-quote-above-threshold refusal; api spec on the
  very-custom route (flag ⇒ notification, no price).
- **browser smoke owed:** yes, to Daniel — the full money path: estimate above threshold → SKU close
  as a promoter (cash + net-remittance variants). **(money path — owed to Daniel by name)**
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. As admin, price the `migration` SKU at $999 in the promoter admin config.
   → The SKU appears in the close flow's SKU picker with the price.
2. As a promoter at https://miyagisanchez.com/promotor/cerrar, close a migration for a test shop
   with ≤150 staged listings, paying cash.
   → Close succeeds at $999; commission ledger shows $499.50 accrued. **(money path — owed to Daniel)**
3. Generate an estimate for a batch with >150 listings.
   → A quote renders showing the itemized computation; the merchant-visible page shows the identical
   total.
4. Close the `migration` SKU against that quote.
   → The charged amount equals the stored quote exactly; attempting to alter the amount fails.
   **(money path — owed to Daniel)**
5. Trip the "very custom" flag on a parity report.
   → No price is offered; Daniel receives the notification with the report attached.

If any step fails, note the step number + what you saw — that's the bug report.
