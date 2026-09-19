---
epic: support-widget
sprint: 3
title: Guest Support Checkout
risk: high
phase: Shipped
stories_total: 2
stories:
  - id: S3.1
    title: Guest support checkout
    as_a: a supporter
    i_want: to pay without a Miyagi account
    so_that: casual support stays frictionless
    risk: high
    status: done
  - id: S3.2
    title: Seller payment routing
    as_a: a seller
    i_want: support payments routed to my connected Stripe or Mercado Pago account
    so_that: support settles like the rest of my sales
    risk: high
    status: done
---
# Sprint 3 - Guest Support Checkout

Goal: turn the support form into a guest-first payment handoff using the seller's existing Stripe Connect or
Mercado Pago rails.

Status: ✅ shipped to production · real transaction smoke pending.

## US-5 - Guest support checkout ✅ · Risk: HIGH
**As a** supporter, **I want** to pay without a Miyagi account, **so that** casual support stays frictionless.

Acceptance:
- [x] No Clerk redirect is required.
- [x] Email is collected for receipt.
- [x] Checkout is stamped `channel=embed`.
- [x] Provider metadata identifies the payment as support.

## US-6 - Seller payment routing ✅ · Risk: HIGH
**As a** seller, **I want** support payments routed to my connected Stripe or Mercado Pago account, **so that**
support settles like the rest of my sales.

Acceptance:
- [x] Stripe Connect uses the seller account.
- [x] Mercado Pago uses the seller token path, not the platform token fallback.
- [x] Sellers without supported payment setup get a clear disabled state.

## QA
- [x] API/static specs cover fail-closed checkout and shared payload validation.
- [x] Backend checkout path validates support amount/currency/product/settings server-side and stamps support metadata.
- [x] Backend Cloud Build `04cb012` succeeded and Cloud Run `medusa-web-00084-tlv` serves production traffic.
- [ ] Daniel owns real money-path smoke for Stripe/Mercado Pago in production.
