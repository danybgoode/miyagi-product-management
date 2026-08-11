# US marketplace — Sprint 4: USD checkout

**Status:** ⬜ not started

## Outcome

A US buyer completes a purchase. Money moves from their card into the seller's own Stripe account
through a direct charge, the seller is merchant of record, and Miyagi takes no commission — the same
promise Mexico already makes. The order, its receipt, both emails and any refund are correct in USD.
Fulfillment is arranged delivery or manual carrier, which need no provider account; live carrier rates
are Sprint 6.

**This is the money sprint.** It is HIGH risk, it takes one cross-family review pass, and it contains
the epic's only real-money action.

## Build contract

Implement D13–D16. The project platform is MX/MXN with charges/payouts enabled; live has four MX
connected accounts and no US account. A same-platform test-mode proof created and closed a US Accounts v2
`merchant` with USD/en-US defaults, Stripe fee/loss responsibility, full Dashboard and hosted onboarding.
New US accounts use this backend-owned shape; existing MX v1 Express accounts remain untouched.

Create one pure market strategy and persist its discriminant/account/session/intent/charge/currency in
PaymentSession data. Every Stripe lifecycle call and both webhooks reconstruct and verify the connected
context; direct refunds do not use destination-charge reversal. Move readiness/currency/fulfillment
validation before authoritative checkout writes, converge web/UCP/MCP on `start-checkout`, and replace
client-trusted shipping money with server-owned delivery data. Add `manual_carrier` as addressed,
Stripe-payable, seller-funded $0 delivery with required carrier/tracking; `coord` stays manual-pay. Record
real processor fees/refunds and group profit by currency. Direct-charge/refund/fee behavior must be proven
in test mode before merge; the first live charge remains Daniel's explicit action.

## Stories

### Story 4.1 — Charge USD through Stripe Connect direct charges

**As a** US seller, **I want** card payments to land in my own Stripe account **so that** I am the
merchant of record and keep the full amount.

**Acceptance:** US checkout uses a **direct charge** on the seller's connected account, not the
destination-charge flow Mexico uses; the Mexico path is untouched and its specs stay green. One shared
checkout seam selects the strategy by market — there is no forked checkout. Currency is USD end to end;
USD and MXN never sum anywhere. The connected-account requirement is enforced server-side, so a shop
without a completed Stripe connection cannot take card payments, and the buyer sees an honest reason
rather than a failure. Webhooks resolve the correct account context. Every refusal is checked before the
first write; a partial failure is a non-2xx, never a green body with warnings.

**Risk:** high

### Story 4.2 — Fulfill a US order on arranged and manual-carrier delivery

**As a** US seller, **I want** to ship the order with my own carrier **so that** I can fulfill without
waiting on a platform shipping integration.

**Acceptance:** US checkout offers arranged delivery and manual carrier, reusing the shipped seams — no
new provider, no account, no funding. The seller marks the order shipped and enters their own tracking;
the buyer sees it on the order page, in the email and in the chat ledger. The existing rule that a
seller cannot ship before confirming payment holds for US orders. Nothing in the US flow claims a rate
or a label that does not exist.

**Risk:** high

### Story 4.3 — Make US orders, receipts, emails and refunds correct in USD

**As a** US buyer, **I want** my order, receipt and refund to be right **so that** I trust what I paid.

**Acceptance:** The pay-button total equals the order summary, including shipping. Order pages (buyer
and seller), both confirmation emails and the receipt render USD amounts in en-US formatting. Refunds
run through the direct-charge account and reflect the real processor fee. The profit ledger records US
orders with their actual processor fee and currency tag, and never aggregates USD with MXN. Agent
surfaces (UCP checkout session, MCP checkout options) quote the identical number the web checkout
charges.

**Risk:** high

## Sprint QA

- **api spec(s):** direct-charge vs destination-charge strategy selection by market; connected-account
  requirement matrix; a currency-mixing guard; refund path spec; total-parity spec across web, email and
  agent surfaces; a deliberate partial-failure spec.
- **browser smoke owed:** **yes, to Daniel by name** — the real card charge, the seller-session ship
  action and the refund. An automated smoke cannot cover these.
- **deterministic gate:** `tsc --noEmit` + lint + `npm run build` + Playwright `api` green before merge.
- **regression:** the full MX checkout and payment population — destination charges, MercadoPago, SPEI,
  cash, manual-payment lifecycle, two-sided off-platform refunds — all unchanged.
- **review:** **HIGH — one cross-family pass**, routed by
  `node scripts/review-route.mjs --builder <who> --tier high <PR#>`. Resolve or answer every finding.

## Sprint 4 — Smoke walkthrough (do these in order)

Env: Stripe **test mode** for steps 1–5, then production for step 6 · https://miyagisanchez.com

1. Connect a test Stripe account to a US shop, then remove it and try to check out.
   → Without a connection, card payment is refused with a clear reason. With it, card payment is offered.
2. Buy a US listing with a Stripe test card.
   → Payment succeeds; the charge appears on the **seller's** connected account, not the platform's.
3. Open the order as buyer and as seller.
   → Both show USD amounts in en-US formatting; the total matches what was charged, shipping included.
4. Check both confirmation emails.
   → USD, English, totals matching the order.
5. As the seller, mark it shipped with a tracking number, then refund it.
   → Buyer sees tracking; the refund lands back on the test card and the ledger shows the real fee.
6. (real money — owed to Daniel by name) Repeat steps 2–5 once in production with a real card and a
   disposable US test shop, for a small amount.
   → One real USD order paid, fulfilled, tracked and refunded. Clean up the test shop afterwards.
7. Go to https://miyagisanchez.com/mx and complete one Mexico checkout with a test card.
   → Unchanged. Pesos, destination charge, same behaviour as before this sprint.

If any step fails, note the step number + what you saw — that's the bug report.
