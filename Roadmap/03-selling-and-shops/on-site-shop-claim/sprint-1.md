---
epic: on-site-shop-claim
sprint: 1
title: Claim an imported shop on Miyagi
risk: high
phase: Shipped
stories_total: 2
stories:
  - id: S1.1
    title: Shop-specific invitation and context
    as_a: prospective shop owner
    i_want: to see my shop before creating an account
    so_that: I know what the link will claim
    risk: high
    status: done
  - id: S1.2
    title: Account creation and automatic ownership transfer
    as_a: prospective shop owner
    i_want: to use my preferred account and reach my shop manager
    so_that: I can run the shop I claimed
    risk: high
    status: done
---

# Sprint 1 · Claim an imported shop on Miyagi

**Status:** ✅ Shipped 2026-10-07 — backend [#201](https://github.com/danybgoode/medusa-bonsai-backend/pull/201), storefront [#424](https://github.com/danybgoode/miyagisanchezcommerce/pull/424), root [#199](https://github.com/danybgoode/miyagi-product-management/pull/199)

**Risk:** HIGH · **Repos:** backend, storefront, root toolchain

## Build contract

D1–D5 in the [epic README](README.md) are the locked decisions. The public
shop page still has an email form; the merchant's account email is independent
of that form and of the product owner's personally addressed outreach.

## Journey and acceptance

1. Admin selects an active, unclaimed shop and copies its public preview URL
   and a signed claim URL. Admin sends nothing; Daniel inserts both in his own
   email.
2. A visitor may instead enter any email on the shop claim page and receive
   a shop-specific claim URL. The server derives shop identity from a fresh
   Medusa read, checks active status, and refuses mismatched client details.
3. Clicking either link opens `/claim` and shows the shop name, a preview link,
   and the account action. Old `/onboarding/claim` emails reach the same page
   while their tokens remain valid.
4. Sign-up or sign-in with any account returns to the claim. The server verifies
   the token, shop identity, market, active status and current ownership; Medusa
   assigns the account once. The buyer actions become available and the claimer
   lands on `/shop/manage`.
5. Invalid or expired links show a recovery message; a shop owned by someone
   else cannot transfer.

## Verification and deployment

- Observe each new claim spec fail under a deliberate implementation break,
  then pass; run typecheck, lint, build and the relevant API suite.
- Backend claim serialization deploys before the storefront claim UI.
- Verify a preview with headless HTTP and a disposable authenticated claim.
- Confirm public, promoter WhatsApp, and merchant close-receipt senders all
  produce on-site claim links. After frontend production deploy, remove the live
  `DESPACHOBONSAI_URL` Cloud Run setting. Verify both routes and the setting.

## Result and smoke walkthrough

- Backend: 1,223 unit tests, build, money-path integration, lint and CodeQL
  passed. The ID-fallback status regression failed under a deliberate guard
  removal (expected 404, got 200) and passed after restoration.
- Storefront: build, lint, CodeQL, all four preview API shards and preview
  browser smoke passed. The generated flag inventory and promoter receipt
  fixtures passed 8/8 after the on-site URL change.
- Root: 1,272 script tests, build-order, doc-format and shell syntax passed.
- Production: open `https://miyagisanchez.com/mx/s/dharana-movement` to see the
  unclaimed shop; open `/mx/s/dharana-movement/claim` for its public email form.
  A fresh admin-generated claim URL from `/admin/claim-links` opens `/claim`,
  shows that shop and its preview link, then returns from account creation to
  transfer ownership and open `/shop/manage`. The first authenticated production
  pass through these last steps is **owed to Daniel**, using a real intended
  claim; the scripted production smoke supports unauthed pages only.
- An invalid `/onboarding/claim?token=invalid` now redirects to `/claim`, whose
  recovery page rendered without console errors. A mismatched shop ID sent to
  `/api/claim/send` returned 409 without sending mail. Cloud Run revision
  `miyagi-web-00145-ksd` is ready and has no `DESPACHOBONSAI_URL`.
