---
status: in-progress
slug: on-site-shop-claim
title: On-site claim from a shop-specific email link
area: 03-selling-and-shops
risk: high
type: bug
phase: Building
sprints_total: 1
stories_total: 2
---

# On-site shop claim

> **Area:** 03-selling-and-shops · **Risk:** HIGH (shop ownership and auth) · **Class:** Bug

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
- **D5 · Remove the legacy destination:** remove `DESPACHOBONSAI_URL` from the
  deploy script and from the live Cloud Run service after the new sender deploys.

## Scope

See [Sprint 1](sprint-1.md) for the user journey, acceptance checks, and deploy
order. No new feature flag or schema is needed.

## Definition of Done (epic)

- The backend, storefront and root-repo changes pass their deterministic gates
  and reach production in that order.
- A shop-specific email link shows the right shop before sign-up; an account
  with a different email can claim it and open `/shop/manage`.
- The legacy email route resolves, incorrect shop data cannot mint a link,
  and a second account cannot take an already claimed shop.
- The live Cloud Run service no longer has `DESPACHOBONSAI_URL`.
