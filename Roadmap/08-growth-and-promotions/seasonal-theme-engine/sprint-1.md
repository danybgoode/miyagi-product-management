# Sprint 1 - Theme Engine Foundation

Goal: create the safe theme foundation before any visible toggle ships.

Status: implemented 2026-06-05 on `feat/seasonal-theme-engine`.

Risk tier: Low - presentation-layer platform theming only; no commerce, checkout, auth, payments, or database migrations.

---

## US-1 - Manifest schema and per-field fallback

**As the** platform, **I want** a standardized seasonal theme manifest, **so that** collaborations can be configured without fragile code changes.

- [x] Manifest supports accent, logo treatment, tagline, spot illustrations, background pattern, active status, and optional sunset metadata.
- [x] Missing fields fall back to core values independently.
- [x] Malformed fields are ignored without breaking layout.
- [x] Active/sunset rules can disable the seasonal option cleanly.

## US-2 - Contrast and asset guardrails

**As a** visitor, **I want** themed accents and assets to remain readable and light, **so that** designer freedom never harms usability.

- [x] Accent colors are parsed and normalized before becoming CSS variables.
- [x] Unsafe or low-contrast accents fall back to the core accent or a corrected accessible variant.
- [x] Theme assets are restricted to lightweight local SVG/CSS-safe values.
- [x] Invalid asset paths do not render broken UI.

## US-3 - First-paint bootstrap

**As a** returning visitor, **I want** my saved theme to apply before the page visibly paints, **so that** page transitions do not flash the wrong theme.

- [x] A tiny pre-paint script reads saved preference and active theme status.
- [x] The script applies only safe attributes/classes/CSS vars.
- [x] If seasonal is inactive, expired, or unavailable, saved seasonal preference is ignored and core renders.
- [x] No server dependency is required before core content loads.

## QA / smoke

- [x] Unit-like checks in `e2e/platform-theme.spec.ts` validate manifest fallback and sunset behavior.
- [x] VM-backed bootstrap smoke confirms saved seasonal preference applies before paint on eligible routes and clears on excluded routes.
- [ ] Local browser click smoke for the toggle remains pending until Playwright browser binaries are installed or a preview is available.
