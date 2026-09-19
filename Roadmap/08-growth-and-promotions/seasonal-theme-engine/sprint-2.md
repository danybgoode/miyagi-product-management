---
epic: seasonal-theme-engine
sprint: 2
title: Platform Toggle and Scope
risk: high
phase: Shipped
stories_total: 3
stories:
  - id: S2.1
    title: Header theme toggle
    as_a: a visitor
    i_want: a clear Core/Designer toggle in platform chrome
    so_that: I can choose the experience I prefer
    risk: high
    status: done
  - id: S2.2
    title: Preference persistence
    as_a: a returning visitor
    i_want: my selection remembered
    so_that: I do not need to reselect the theme on each visit
    risk: high
    status: done
  - id: S2.3
    title: Strict platform scope
    as_a: a seller
    i_want: my storefront and management tools unaffected
    so_that: my brand and operational workflows remain stable
    risk: high
    status: done
---
# Sprint 2 - Platform Toggle and Scope

Goal: expose theme switching to visitors while keeping merchant and operational surfaces untouched.

**Status:** ✅ SHIPPED 2026-06-05 — merged to `main` (commit `b979976`, as `platform-theme`).

Risk tier: Low - public platform UI only; no checkout, payment, auth, or seller data changes.

---

## US-4 - Header theme toggle

**As a** visitor, **I want** a clear Core/Designer toggle in platform chrome, **so that** I can choose the experience I prefer.

- [x] Toggle is visible on the main platform experience.
- [x] Toggle uses existing icon/button patterns and fits desktop and mobile chrome.
- [x] Toggle copy is present in both locale files.
- [x] The control is keyboard-accessible and announces state.

## US-5 - Preference persistence

**As a** returning visitor, **I want** my selection remembered, **so that** I do not need to reselect the theme on each visit.

- [x] Selection persists across navigation and reloads.
- [x] Core selection always wins if the user explicitly chooses it.
- [x] Seasonal selection is automatically ignored when the campaign is sunset.

## US-6 - Strict platform scope

**As a** seller, **I want** my storefront and management tools unaffected, **so that** my brand and operational workflows remain stable.

- [x] Seasonal theme does not apply to custom-domain channel requests.
- [x] Seasonal theme does not apply to embedded shop iframe requests.
- [x] Seasonal toggle is hidden on dashboards, admin, account, auth, checkout, and seller-management routes.
- [x] Checkout and payment pages keep the core visual language.

## QA / smoke

- [x] Playwright spec checks manifest, scope samples, eligible toggle markup, and bootstrap exclusions.
- [ ] Full browser click smoke remains pending until Playwright browser binaries are installed or a preview is available.
