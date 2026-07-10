# Panfleto — the first premium shop — Sprint 1: Rehome the printed edition to admin

**Status:** ⬜ not started

## Stories

### Story 1.1 — Placements sell through a platform-owned seller
**As a** platform admin, **I want** print-ad placements minted and sold under a platform-owned seller
(resolved from config, not a merchant-shop constant), **so that** the printed edition is an admin
feature that survives any merchant shop's rename, migration, or closure.
**Acceptance:** buying a placement (`/sell/print/[editionId]` and the promoter close path) produces an
order under the platform seller; the miyagiprints/panfleto storefront lists **no** placement products
(the `is_print_placement` leak guard still holds); `/admin/print` and the zine studio read paid
submissions exactly as before against a real edition.
**Risk:** high

### Story 1.2 — Old constant unreachable, history intact
**As a** developer, **I want** `getMiyagiprintsSellerId()` gone and every call site on the new
config-addressable resolver, **so that** two placement-owner paths can never coexist.
**Acceptance:** `grep -ri miyagiprints apps/miyagisanchez/lib apps/miyagisanchez/app --include='*.ts*'`
returns only content/copy references (no seller-resolution logic); existing placement orders, referral
print-ad credits, and prior editions render unchanged; a regression spec pins the new resolver.
**Risk:** high

## Sprint QA
- **api spec(s):** placement mint + storefront-leak guard → extend the existing print/listing-query
  specs; pure spec on the new placement-seller resolver.
- **browser smoke owed:** yes, to Daniel — the **money step**: buy one real placement post-rehoming.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/sell/print/[current-edition-id] and buy the cheapest placement
   (card, Stripe test → then one real MXN pass). **(money step — Daniel)**
   → Checkout completes; the order exists under the platform seller, not miyagiprints.
2. Open https://miyagisanchez.com/admin/print
   → The new submission appears in the queue like any pre-change submission.
3. Open the zine studio and pull paid submissions for the open edition.
   → The new placement is present; prior-edition placements unchanged.
4. Open https://miyagisanchez.com/s/miyagiprints
   → No placement products anywhere in the storefront or its collections.

If any step fails, note the step number + what you saw — that's the bug report.
