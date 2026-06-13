# Epic - Seasonal Theme Engine

> **✅ EPIC COMPLETE — all 3 sprints shipped to prod 2026-06-05** (merged to `main` as commit `b979976`,
> "feat: add seasonal platform theme engine"; the feature is named **`platform-theme`** in code:
> `lib/platform-theme.ts`, `app/api/platform-theme/route.ts`, `app/components/PlatformTheme*`, covered by
> `e2e/platform-theme.spec.ts`). See [RETROSPECTIVE.md](RETROSPECTIVE.md). Builds a safe rotating
> brand-collaboration layer for the main Miyagi Sanchez platform experience. **Live browser click-through
> smoke owed** (the e2e + DOM/geometry smoke passed; full Playwright browser run pending binaries/preview).

**For visitors and buyers on the main marketplace.** A visitor can switch between the core platform look and the active seasonal designer collaboration without losing layout stability, readability, or performance.

The core promise is restraint: collaboration themes can change accent, logo treatment, tagline, background pattern, and reserved spot-art placements, but they cannot alter navigation, commerce behavior, seller storefronts, dashboards, checkout, or embedded surfaces.

## Why this matters

Brand collaborations are high-leverage growth moments, but they can easily damage usability if treated as a full-page repaint. This engine keeps the collaboration expressive at the presentation layer while preserving the marketplace's operational muscle: buyers still find the same controls, sellers keep their own brand, and agent/checkout paths remain unchanged.

## What a visitor gets

- A visible platform toggle for Core vs. active seasonal collaboration.
- Theme preference remembered across navigations and future visits.
- A zero-flash experience: the saved theme applies before visible paint.
- Accessible accent colors and fallback behavior if a theme field is invalid.

## What the platform gets

- A standardized manifest for the active collaboration.
- Guardrails for malformed colors, unsafe asset paths, expired campaigns, and missing fields.
- A clean sunset path that reverts saved seasonal users back to the core theme when no active collaboration exists.
- A scoped implementation that excludes custom domains, embedded shops, dashboards, admin, checkout, account, and seller management surfaces.

## Out of scope (v1)

- A designer submission portal.
- Runtime remote theme editing by external designers.
- Theming seller storefronts or seller dashboards.
- Re-skinning checkout, payments, auth, or UCP/MCP APIs.
- Replacing PWA icons, splash screens, or system-level app manifest assets.

## Sprints

- [sprint-1.md](sprint-1.md) - manifest schema, validation, first-paint bootstrap, sunset fallback.
- [sprint-2.md](sprint-2.md) - platform toggle, persistence, route/channel scope.
- [sprint-3.md](sprint-3.md) - collaboration visual placements, async assets, smoke coverage.

## Audit notes

- `app/globals.css` already has semantic design-system tokens, so the engine should override a small theme layer instead of replacing the design system.
- `app/layout.tsx` owns the main platform header/footer and already drops platform chrome for embed and custom-domain requests.
- `app/s/[slug]/ChannelLayout.tsx` is the white-label shell and must remain outside the seasonal theme.
- Header logo swapping should be component-level. PWA icons, splash screens, and manifest colors remain core-brand in v1.

## QA / smoke

- Passing: `npx tsc --noEmit`, focused touched-file lint, `npm run build`, and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 npx playwright test e2e/platform-theme.spec.ts`.
- Added `e2e/platform-theme.spec.ts` for manifest fallback/sunset behavior, bootstrap execution, route scope samples, API payload safety, and eligible-page boot queue.
- Full `npm run lint` remains blocked by existing baseline errors outside this epic.
- In-app browser DOM/geometry smoke covered `/agent` and `/terminos` at desktop and mobile widths; full click-through smoke remains pending until local Playwright browser binaries are installed or preview QA is available.
