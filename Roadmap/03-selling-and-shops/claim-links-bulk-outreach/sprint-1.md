---
epic: claim-links-bulk-outreach
sprint: 1
title: "S1 Bulk outreach export"
risk: low
phase: Shipped
stories_total: 1
stories:
  - id: S1.1
    title: "Prepare and export links for ready shops"
    as_a: "platform admin"
    i_want: "to generate claim links for selected ready shops and export their contacts and links"
    so_that: "I can write personalized invitations without copying each row"
    risk: low
    status: done
---

# Bulk claim links — Sprint 1

**Status:** ✅ shipped in frontend [PR #430](https://github.com/danybgoode/miyagisanchezcommerce/pull/430); owner-session export smoke remains.

### Story 1.1 — Prepare and export links for ready shops ✅ [PR #430](https://github.com/danybgoode/miyagisanchezcommerce/pull/430)

**As a** platform admin, **I want** to generate claim links for selected ready shops and export their contacts and links, **so that** I can write personalized invitations without copying each row.

**Acceptance:** Select all covers every ready shop across pages. The admin can bulk generate after fresh canonical checks and export exactly Name, Email, Link1, Link2. Failed or stale sellers prevent an incomplete export. Unknown email and hidden public previews leave their cells blank. The route sends no invitations.

## Verification

- Frontend [PR #430](https://github.com/danybgoode/miyagisanchezcommerce/pull/430): local typecheck, lint, and build passed. The final local API suite passed 4,439 tests with 37 skipped; typecheck, lint, CodeQL, and four preview API shards passed in CI.
- Production Cloud Build `53a262cb-56f9-431b-afa1-789094d6e901` succeeded; Cloud Run revision `miyagi-web-00152-2f7` serves the merged PR image at 100% traffic.
- The CSV, researched email ID, and partial-batch specs were each observed red under deliberate implementation breaks, then green after restoration. The focused suite passed 9 tests.
- Independent review raised the inherent bearer-token property of the requested CSV; the page now warns the admin to protect it and verify recipients.

## Production smoke walkthrough

1. Sign in as the platform admin and open https://miyagisanchez.com/admin/claim-links.
   → The page lists ready shops and offers “Seleccionar las … listas para invitar.”
2. Select all and generate links.
   → The prepared count matches the selected count; any stale or unavailable shop is named as a failure and export stays disabled.
3. Export the CSV and open it locally.
   → Headers are exactly Name, Email, Link1, Link2. A known ready shop has its own direct public and claim links. A hidden preview or unknown email has a blank corresponding cell.
4. Do not send the CSV as an attachment; use individual links only after checking the recipient.

The signed-in production walkthrough is owed to Daniel because the headless smoke runner has no production admin session.
