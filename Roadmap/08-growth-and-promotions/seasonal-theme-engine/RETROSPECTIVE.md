# Seasonal Theme Engine — Retrospective

_Closed: 2026-06-05_

**Area:** 08 · Growth & Promotions · **Risk:** low · 3 sprints. Frontend-only (Vercel); no backend, no
migration, no commerce/auth/checkout touched. **Shipped to `main` as commit `b979976`** ("feat: add
seasonal platform theme engine") — the feature is named **`platform-theme`** in code.

## What shipped
A safe, rotating brand-collaboration layer for the **main marketplace** presentation only. A visitor can
toggle between the Core look and the active seasonal designer collaboration with zero layout shift, and the
preference persists across navigations and visits.

- **S1 — manifest schema, validation, first-paint bootstrap, sunset fallback** (`lib/platform-theme.ts`,
  `app/api/platform-theme/route.ts`, `app/components/PlatformThemeScript.tsx`). A standardized manifest for
  the active collaboration (accent, logo treatment, tagline, background pattern, reserved spot-art slots),
  with guardrails for malformed colors, unsafe asset paths, expired campaigns, and missing fields. A saved
  seasonal preference **sunsets back to Core** when no active collaboration exists.
- **S2 — platform toggle, persistence, route/channel scope** (`app/components/PlatformThemeToggle.tsx`).
  A visible Core-vs-collaboration toggle, remembered across visits. **Scope is deliberately narrow:** the
  theme excludes custom domains, embed shops, dashboards, admin, checkout, account, and seller-management
  surfaces — it reuses the same channel/route signals `app/layout.tsx` already uses to drop platform chrome.
- **S3 — collaboration visual placements, async assets, smoke coverage.** Decorative spot-art placements
  that load async (no layout shift, no heavy blocking assets), plus `e2e/platform-theme.spec.ts` covering
  manifest fallback/sunset, bootstrap execution, route-scope samples, API payload safety, and the
  eligible-page boot queue.

## What went well
- **Restraint by construction.** Themes can only touch accent / logo / tagline / background / reserved
  spot-art — never navigation, commerce, seller storefronts, dashboards, checkout, or embedded surfaces.
  Overriding a *small theme layer over the existing semantic design-system tokens* (rather than replacing
  the design system) kept blast radius near-zero.
- **Zero-flash first paint.** The saved theme is applied by an inline bootstrap script **before** visible
  paint, so there's no Core→seasonal flash on load; an invalid/expired manifest falls back to Core safely.
- **One channel-scope source of truth.** Eligibility reuses the layout's existing channel/route detection
  instead of a parallel allow-list, so white-label / embed / checkout stay provably outside the theme.

## What we learned
- **A presentation-layer theme must reuse the SAME channel/route signals the layout already uses to drop
  chrome — don't invent a parallel scope list.** A second list drifts; reusing `app/layout.tsx`'s existing
  embed/custom-domain detection guarantees the white-label shell and checkout never inherit the theme.
  → promoted to `LEARNINGS.md`.
- **Apply a persisted theme before first paint via an inline bootstrap, with a safe fallback.** Reading the
  saved preference in React effects flashes Core first; an inline pre-paint script keyed off a validated
  manifest avoids it and degrades to Core when the manifest is invalid/expired. → promoted to `LEARNINGS.md`.
- **Sibling worktree reusing the same package name breaks npm workspace resolution** (the build hit this via
  `apps/miyagisanchez-seasonal-theme`). Already captured in `LEARNINGS.md → Tooling gotchas`; reconfirmed.

## Gaps / follow-ups
- **Live click-through smoke owed:** the e2e spec + in-app DOM/geometry smoke (`/agent`, `/terminos` at
  desktop/mobile) passed; the full Playwright **browser** click-through remained pending on local browser
  binaries / preview QA at close. Stated, not papered over.
- **Out of scope (v1), as designed:** designer submission portal, runtime remote theme editing, theming
  seller storefronts/dashboards, re-skinning checkout/auth/UCP, and PWA icon/splash/manifest assets — see
  the deferred **designer-collaboration-portal** seed (`00-ideas/seeds/designer-collaboration-portal.md`).
