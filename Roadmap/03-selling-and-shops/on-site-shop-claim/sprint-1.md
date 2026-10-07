---
epic: on-site-shop-claim
sprint: 1
title: Claim an imported shop on Miyagi
risk: high
phase: Building
stories_total: 2
stories:
  - id: S1.1
    title: Shop-specific invitation and context
    as_a: prospective shop owner
    i_want: to see my shop before creating an account
    so_that: I know what the link will claim
    risk: high
    status: in-progress
  - id: S1.2
    title: Account creation and automatic ownership transfer
    as_a: prospective shop owner
    i_want: to use my preferred account and reach my shop manager
    so_that: I can run the shop I claimed
    risk: high
    status: in-progress
---

# Sprint 1 · Claim an imported shop on Miyagi

**Status:** Building

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
   Medusa read and refuses mismatched client details.
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
- After frontend production deploy, confirm Cloud Build and remove the live
  `DESPACHOBONSAI_URL` Cloud Run setting. Verify both routes and the setting.
