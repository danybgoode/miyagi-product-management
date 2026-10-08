---
epic: navigation-recovery-welcome-finishing
sprint: 1
title: "Navigation, recovery, and welcome finishing"
risk: low
phase: Shipped
stories_total: 3
stories:
  - id: S1.1
    title: "Cuenta menu aligns with its trigger"
    as_a: "signed-in buyer"
    i_want: "my account menu beside its trigger"
    so_that: "I can reach account actions where I opened it"
    risk: low
    status: done
  - id: S1.2
    title: "Missing and failed pages offer recovery"
    as_a: "visitor"
    i_want: "clear actions on a missing or failed page"
    so_that: "I can resume browsing"
    risk: low
    status: done
  - id: S1.3
    title: "MX shop-claimed welcome names the shop"
    as_a: "merchant claiming a shop in Mexico"
    i_want: "my confirmation to name my shop"
    so_that: "I recognize the email"
    risk: low
    status: done
---

# Navigation, recovery, and welcome finishing — Sprint 1

**Status:** ✅ shipped in frontend [PR #428](https://github.com/danybgoode/miyagisanchezcommerce/pull/428), with recovery-link follow-up [PR #429](https://github.com/danybgoode/miyagisanchezcommerce/pull/429).

## Build contract (locked before changes)

Follow D1–D3 in this epic's README. The existing claim branch supplies the Clerk webhook, first-transfer hook, and Resend send functions. This sprint adds no new email trigger, database change, or feature flag. The app code remains the send source; Dashboard templates remain unpublished review copies.

## Stories

### Story 1.1 — Cuenta menu aligns with its trigger ✅ [PR #428](https://github.com/danybgoode/miyagisanchezcommerce/pull/428)

**As** a signed-in buyer, **I want** the Cuenta menu to open beside its trigger, **so that** I can reach account actions where I opened it.

**Acceptance:** On desktop Favoritos, opening Cuenta places the menu near the top-right trigger without clipping. Native Popover dismissal and fallback behavior remain. **QA:** `cuenta-menu-native.spec.ts`, Chromium before/after geometry, owner visual check against `references/favourites-art-display.png`.

### Story 1.2 — Missing and failed pages offer recovery ✅ [PR #428](https://github.com/danybgoode/miyagisanchezcommerce/pull/428) · [PR #429](https://github.com/danybgoode/miyagisanchezcommerce/pull/429)

**As** a visitor, **I want** useful actions on a missing or failed page, **so that** I can resume browsing.

**Acceptance:** 404 offers Explore, Home and contact; runtime and root-layout failures also offer Retry. Colors, typography, focus state and mobile layout match the marketplace. The Explore action reaches the platform even from a merchant domain. **QA:** `contact-address.spec.ts`, Next production build, local 404 browser screenshot and link smoke; owner visual check.

### Story 1.3 — MX shop-claimed welcome names the shop ✅ [PR #428](https://github.com/danybgoode/miyagisanchezcommerce/pull/428)

**As** a merchant claiming a shop in Mexico, **I want** my confirmation to name my shop, **so that** I recognize it.

**Acceptance:** The MX code-rendered headline is `<SHOP_NAME> ya es tuya en Miyagi Sánchez`, safely escaped. The unpublished MX Resend review draft uses its `SHOP_NAME` variable and is read back after the edit. Its subject and the entire New account welcome draft remain unchanged. The prior webhook and claim send paths are reviewed and reported honestly. **QA:** code and draft readback; sample send in `/admin/comunicaciones` after deploy.

## Sprint QA

- **Shipped evidence (2026-10-08):** PR #428 CI and both related Cloud Builds passed. A production Chromium screenshot showed the designed 404 with Explore, Home and contact. The generic `live-smoke --path` exits nonzero for an intentional 404 status; the screenshot was inspected and the 404 is correct. PR #429 fixed the browse action to preserve the market.
- **Owner-only gaps:** Daniel still needs to inspect the signed-in Cuenta placement and receive the unchanged account welcome plus one actual MX claim email. These are recorded as smoke steps, not claimed complete.

- **Deterministic gate:** frontend `tsc --noEmit`, ESLint, `npm run build`, and the Playwright API suite.
- **Browser smoke:** local 404 screenshot plus a Cuenta menu position check; Daniel owns the signed-in production check and the two real welcome email receipts after the claim branch deploys.
- **Email scope:** no invitation, broadcast, US shop-claimed, or other transaction template edits.

## Sprint 1 — Smoke walkthrough

1. Open `https://miyagisanchez.com/esta-pagina-no-existe` after deploy.
   → A styled 404 offers Explorar anuncios, Ir al inicio, and the human contact address.
2. Choose **Explorar anuncios** from that page.
   → The browser reaches `https://miyagisanchez.com/mx/l`.
3. Sign in and open `https://miyagisanchez.com/account/favorites`; select **Cuenta** in the desktop header.
   → The menu opens beside its top-right trigger and closes on Escape.
4. In `https://miyagisanchez.com/admin/comunicaciones`, send the **New account welcome** sample to an inbox Daniel controls.
   → The approved bilingual message arrives unchanged.
5. Claim a disposable MX shop using the existing claim journey, then inspect the confirmed account inbox.
   → The MX claim email names that shop in its headline, once. This auth/claim step is owed to Daniel after the backend and frontend claim branches deploy.

If a step fails, record the step number and observed result.
