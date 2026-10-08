---
epic: shop-created-welcome
sprint: 1
title: "S1 Market-aware shop welcome"
risk: low
phase: Shipped
stories_total: 1
stories:
  - id: S1.1
    title: "Welcome a new owner in the shop market's language"
    as_a: "new shop owner"
    i_want: "a practical welcome in my shop market's language"
    so_that: "I can set up and share my shop"
    risk: low
    status: done
---
# Shop-created welcome by market — Sprint 1: S1 Market-aware shop welcome

**Status:** ✅ shipped in frontend [PR #428](https://github.com/danybgoode/miyagisanchezcommerce/pull/428); owner receipt smoke remains.

## Stories
### Story 1.1 — Welcome a new owner in the shop market's language ✅ [PR #428](https://github.com/danybgoode/miyagisanchezcommerce/pull/428)
**As a** new shop owner, **I want** a practical welcome in my shop market's language, **so that** I can set up and share my shop.
**Acceptance:** A newly created MX shop sends Spanish and a US shop sends English, naming the shop and linking the public page and dashboard. Neither an existing shop nor a promoter-created unclaimed listing sends this message. Both variants are visible as unpublished Resend drafts.
**Risk:** low

## Sprint QA
- **Shipped evidence (2026-10-08):** PR #428 CI passed, production Cloud Build succeeded, and read-only production checks found both welcome delivery tables.
- **api spec(s):** `e2e/shop-created-welcome.spec.ts` checks the persisted-market decision and unavailable states; it was observed red under a deliberate US-market break and green after restoring the implementation.
- **browser smoke owed:** A controlled production send after deployment for MX and US account owners; no money path.
- **deterministic gate:** `tsc --noEmit`, targeted ESLint, `npm run build`, and focused Playwright API specs before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: preview, then production · https://miyagisanchez.com

1. Open the [MX review draft](https://resend.com/templates/bd1f402a-24e2-4518-8e98-b76f506d2fbb).
   → Spanish copy names the shop and links its public page and dashboard.
2. Open the [US review draft](https://resend.com/templates/52262a09-62b2-486d-9b7f-5f62d6be3c62).
   → English copy offers the same actions.
3. Sign in with a fresh controlled owner account at https://miyagisanchez.com/mx/vende and create a shop.
   → Exactly one Spanish shop-created welcome reaches that account's inbox.
4. Repeat from https://miyagisanchez.com/us/sell with a separate controlled owner account.
   → Exactly one English shop-created welcome reaches that account's inbox.

<!-- Delete whichever pre-filled steps don't apply to this sprint; add more using the same shape
     (real clickable URL + one observable result). Flag any money/auth/checkout step by name —
     those are owed to your project's product owner (an automated browser smoke can't fully cover
     them). -->

If any step fails, note the step number + what you saw — that's the bug report.
