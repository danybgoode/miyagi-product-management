# Panfleto — the first premium shop — Sprint 4: Premium theme presets

**Status:** ⬜ not started · Independent after Sprint 2 (can run parallel to Sprint 3)

## Stories

### Story 4.1 — Two-to-three new premium presets
**As a** premium-shop owner, **I want** a wider set of curated theme presets — including a
dark/editorial look built for panfleto — **so that** a premium shop can pick a distinct identity and
then customize, instead of every shop wearing the same defaults.
**Acceptance:** 2–3 new presets land in `lib/shop-settings/theme-presets.ts` +
`[data-shop-preset]` CSS-variable blocks in `globals.css` (raw-color CI guard applies); each passes
the existing `e2e/theme-preset-contrast.spec.ts` assertions; selectable in shop settings and via
Storefront-as-Code/MCP like the existing presets; panfleto switches to the editorial preset.
**Risk:** low

## Sprint QA
- **api spec(s):** the contrast spec extends to the new preset keys (free coverage — it iterates presets).
- **browser smoke owed:** yes, to Daniel — aesthetic eyeball of each preset on a real shop, phone + desktop.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/shop/manage/settings (any test shop) → theme section.
   → The new presets appear with previews alongside the existing ones.
2. Apply each new preset; view the storefront at /s/[shop] and on its subdomain.
   → Colors/typography switch; text stays legible everywhere (contrast guard held).
3. Open https://panfleto.miyagisanchez.com
   → The editorial preset is live on the flagship.

If any step fails, note the step number + what you saw — that's the bug report.
