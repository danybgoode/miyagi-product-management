# Shop Settings refactor — Sprint 1: Foundation seam + first extraction

**Status:** ⬜ not started

> The skateboard: the thinnest end-to-end slice that ships and proves the whole extraction pattern on
> the safest section. Everything here is behavior-preserving.

## Stories

### Story 1.1 — Shared `lib/shop-settings/` foundation
**As a** developer, **I want** the settings-tree types, one canonical section taxonomy, and the pure
helpers in a next-free `lib/shop-settings/`, **so that** every section reads one source of truth instead
of redefining shape and keys inline.
**Acceptance:**
- Types are **derived from** `lib/apply-shop-settings.ts` + `lib/settings-import.ts` (no parallel shape).
- One canonical section map (key → label, icon, group, field-set) replaces the dual taxonomy; the index
  `page.tsx` keys and the internal nav keys now reference the *same* map.
- Pure helpers `parseLocation`, `detectSchedulingService`, `generateHex32`, `PRESETS` moved here.
- A pure-logic `api` spec passes: taxonomy-map completeness (every index key resolves) + helper unit checks.
**Risk:** LOW

### Story 1.2 — `useSettingsSave()` hook
**As a** developer, **I want** one hook wrapping `PATCH /api/sell/shop` + the Toast, **so that** every
section saves identically without re-touching persistence.
**Acceptance:** the hook posts to the **existing** endpoint with the same payload shape; Toast
success/error behavior is byte-for-byte what the monolith does today. No change to `/api/sell/shop`.
**Risk:** LOW

### Story 1.3 — Extract Devoluciones + the dynamic-import registry (monolith fallback)
**As a** seller, **I want** the Devoluciones (returns policy) settings to look and behave exactly as
before, **so that** nothing regresses while the surface is being restructured.
**Acceptance:**
- `politicas` renders from its own `settings/_sections/Devoluciones.tsx`, consuming `useSettingsSave()`.
- `[section]/page.tsx` routes via a registry: extracted keys → `next/dynamic` component; everything else
  → the existing monolith (graceful coexistence). Only the Devoluciones chunk loads for `/settings/politicas`.
- A return-policy edit saves and reloads identically to today.
- One characterization spec (renders the section + asserts the policy field set) passes.
**Risk:** LOW

## Sprint QA
- **api spec(s):** Story 1.1 → `e2e/shop-settings-taxonomy.spec.ts` (pure-logic: map + helpers). Story 1.3
  → a `*.browser.spec.ts` that renders `politicas` and asserts the field set (skips without `MS_TEST_*`).
- **browser smoke owed:** yes, to Daniel — the authed render + **save round-trip** for Devoluciones (he
  holds the seller session). No money path in S1.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Sign in as a test seller and go to https://miyagisanchez.com/shop/manage/settings
   → The settings index renders with the same section cards as before.
2. Click the **Devoluciones** card (or go to https://miyagisanchez.com/shop/manage/settings/politicas)
   → The returns-policy section renders identically to before.
3. Change the returns window, click save, reload the page.
   → The new value persisted and is shown — identical behavior to pre-refactor. **(authed save — owed to Daniel)**
4. Open the browser network tab on `/settings/politicas` and check the loaded JS chunks.
   → Only the Devoluciones section's chunk loads — not all 17 sections.
5. Open another, not-yet-extracted section (e.g. https://miyagisanchez.com/shop/manage/settings/perfil)
   → It still renders correctly via the monolith fallback.

If any step fails, note the step number + what you saw — that's the bug report.
