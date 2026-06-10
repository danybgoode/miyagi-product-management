# Shop Settings refactor — Sprint 1: Foundation seam + first extraction

**Status:** 🏗️ BUILT 2026-06-10 — draft [PR #68](https://github.com/danybgoode/miyagisanchezcommerce/pull/68), risk **LOW**, awaiting CI + review.
Stories: **1.1 ✅** `ff59097` · **1.2 ✅** `78b0e66` · **1.3 ✅** `e2cab1e`.
Gate green locally: `tsc` ✅ · `next build` ✅ · Playwright `api` `shop-settings-taxonomy.spec.ts` 11/11 ✅.
Owed to Daniel: the authed Devoluciones **save round-trip** (see walkthrough step 3).

> The skateboard: the thinnest end-to-end slice that ships and proves the whole extraction pattern on
> the safest section. Everything here is behavior-preserving.

## Stories

### Story 1.1 — Shared `lib/shop-settings/` foundation ✅ `ff59097`
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

### Story 1.2 — `useSettingsSave()` hook ✅ `78b0e66`
**As a** developer, **I want** one hook wrapping `PATCH /api/sell/shop` + the Toast, **so that** every
section saves identically without re-touching persistence.
**Acceptance:** the hook posts to the **existing** endpoint with the same payload shape; Toast
success/error behavior is byte-for-byte what the monolith does today. No change to `/api/sell/shop`.
**Risk:** LOW

### Story 1.3 — Extract Devoluciones + the dynamic-import registry (monolith fallback) ✅ `e2cab1e`
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
- **api spec (the gate):** `e2e/shop-settings-taxonomy.spec.ts` — pure-logic, 11 tests: map completeness
  (every slug resolves, manual flags, the non-identity + identity `sectionIdsFor` fan-out, politicas
  card-vs-page label) + helper behavior (`parseLocation`/`detectSchedulingService`/`generateHex32`/`PRESETS`).
- **browser spec:** `e2e/shop-settings-returns.browser.spec.ts` — renders `politicas`, asserts the field
  set + conditional condition/flete reveal. **Skips without `MS_TEST_*`** (authed seller page); a real
  fixture lights it up and replaces the manual render-check below.
- **browser smoke owed to Daniel:** the authed **save round-trip** for Devoluciones (he holds the seller
  session). No money path in S1.
- **deterministic gate:** `tsc --noEmit` ✅ + `next build` ✅ + Playwright `api` ✅ — green before merge;
  CI re-runs the full `api` suite against the branch preview (the authoritative pre-merge signal).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the PR #68 **Vercel preview** while testing pre-merge · https://miyagisanchez.com once merged.
(Substitute the preview origin for the host below until merge.)

1. Sign in as a test seller and go to `/shop/manage/settings`.
   → The settings index renders with the same section cards, order, ✓/Pendiente badges, and progress bar
     as before (it now derives from the canonical taxonomy — visually unchanged).
2. Click the **Devoluciones** card (or go to `/shop/manage/settings/politicas`).
   → The returns-policy section renders identically to before: the 4 window options (14/30/7 días, Sin
     devoluciones), and once a positive window is picked, the Condición + Flete grids + the live preview.
3. Change the returns window (e.g. 14 días → 30 días), click **Guardar cambios**, then reload the page.
   → The new value persisted and is shown — identical behavior to pre-refactor, and the success toast
     reads "Cambios guardados correctamente." **(authed save — owed to Daniel)**
4. With DevTools → Network open, hard-reload `/shop/manage/settings/politicas` and scan the loaded JS.
   → The small Devoluciones chunk loads; the 4k-line `ShopSettings` monolith chunk does **not** (the
     `next/dynamic` registry only pulls the extracted component on this route).
5. Open a not-yet-extracted section, e.g. `/shop/manage/settings/perfil`.
   → It still renders correctly via the monolith fallback (and saving there still works as before).
6. Edit another section's value there (e.g. profile tagline) and save; then reopen `/settings/politicas`.
   → Both sections' values are intact — a partial section save never clobbers siblings (the route
     deep-merges the settings tree).

If any step fails, note the step number + what you saw — that's the bug report.
