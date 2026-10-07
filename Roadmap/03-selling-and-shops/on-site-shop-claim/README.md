---
status: shipped
slug: on-site-shop-claim
title: On-site claim from a shop-specific email link
area: 03-selling-and-shops
risk: high
type: bug
phase: Shipped
sprints_total: 1
stories_total: 2
---

# On-site shop claim

> **Area:** 03-selling-and-shops · **Risk:** HIGH (shop ownership and auth) · **Class:** Bug
> **Shipped:** 2026-10-07 · Backend [#201](https://github.com/danybgoode/medusa-bonsai-backend/pull/201) · Storefront [#424](https://github.com/danybgoode/miyagisanchezcommerce/pull/424) · Root [#199](https://github.com/danybgoode/miyagi-product-management/pull/199)

The production claim email linked to `/onboarding/claim` on miyagisanchez.com,
which returned 404. The old sender built the URL from `DESPACHOBONSAI_URL`,
deployed with the storefront as its value. A public form also trusted the
submitted shop name and identifier when signing the link.

## Decisions

- **D1 · One destination:** both personal outreach and public email requests use
  a signed, shop-specific `/claim?token=…` URL on miyagisanchez.com. Old 24-hour
  links to `/onboarding/claim` redirect to it while still valid.
- **D2 · Account freedom:** possession of the link is the claim capability.
  Registration or sign-in may use any email or Google account. No business
  ownership documents or matching contact email are required.
- **D3 · Canonical transfer:** the server checks the live Medusa shop and assigns
  its `clerk_user_id` once, then maintains the Supabase mirror and sends the
  claimer to `/shop/manage`. The link is bound to shop ID and slug.
- **D4 · Manual outreach:** the admin prepares preview and claim links but the
  product owner writes and sends the outreach email personally. The public
  claim page continues to accept any email and sends its own 24-hour link.
- **D5 · Remove the legacy destination:** move public email, promoter WhatsApp,
  and merchant close-receipt links to `/claim`; then remove
  `DESPACHOBONSAI_URL` from the deploy script and live Cloud Run service.

## Scope

See [Sprint 1](sprint-1.md) for the user journey, acceptance checks, and deploy
order. No new feature flag or schema is needed.

## Definition of Done (epic)

- The backend and storefront pass their deterministic gates and deploy in that
  order; the root-repo change passes its gate and merges.
- A shop-specific email link shows the right shop before sign-up; an account
  with a different email can claim it and open `/shop/manage`.
- The legacy email route resolves, incorrect shop data cannot mint a link,
  and a second account cannot take an already claimed shop.
- The live Cloud Run service no longer has `DESPACHOBONSAI_URL`.

## Production verification

- Backend Cloud Build succeeded; `medusa-web-00090-g2l` is ready and `/health` returned 200.
- Storefront Cloud Build succeeded; `miyagi-web-00144-gdl` served the new claim routes.
  Removing the legacy setting deployed `miyagi-web-00145-ksd`, ready on 100% of traffic.
- `/onboarding/claim?token=invalid` changed from 404 to a 307 redirect to `/claim`;
  `/claim?token=invalid` rendered its recovery state without browser console errors.
  The Dharana Movement preview rendered at `/mx/s/dharana-movement` with its
  unclaimed badge. A forged shop ID on `/api/claim/send` returned 409.
- The live service's environment no longer contains `DESPACHOBONSAI_URL`.
- **Owed to Daniel:** the first real production claim with a fresh link and a
  separately chosen account, including the authenticated `/shop/manage` arrival.
  The headless production harness cannot sign in through production Clerk, and
  the reported 24-hour token had expired before this deployment.
