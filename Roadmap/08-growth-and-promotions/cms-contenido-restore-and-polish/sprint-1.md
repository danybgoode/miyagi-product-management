# CMS restore & polish — Sprint 1: Restore the save path + editor polish

**Status:** ⬜ not started

## Stories

### Story 1.1 — Apply the `platform_copy_overrides` migration to prod
**As** Daniel (admin), **I want** the overrides table to actually exist in prod, **so that** my
`/admin/contenido` edits persist instead of erroring.
**How:** apply `apps/miyagisanchez/supabase/migrations/20260708150000_platform_copy_overrides.sql`
to the shared Supabase project (`xljxqymsuyhlnorfrnno` — verify `SUPABASE_URL` first; local IS prod,
per LEARNINGS). Idempotent (`CREATE TABLE IF NOT EXISTS` + RLS). Pre-authorized by Daniel 2026-07-11.
**Acceptance:** save an override in `/admin/contenido` → success toast; the edited copy is live on
the target page within ≤1 min; the row is visible via the admin GET route.
**Risk:** high (prod DB DDL on shared infra — announce before applying; no code change)

### Story 1.2 — Regression spec + actionable "store unavailable" error
**As** an admin, **I want** a clear message when the override store is unreachable/missing, **so
that** an inert store can never again hide behind a generic error for two days.
**Acceptance:** api spec covers the save round-trip contract (POST → GET reflects the row → DELETE
restores); when the table is missing/unreachable the API returns a distinct error and the editor
shows *"El almacén de overrides no está disponible"* (es-MX) instead of the generic save error.
Pure error-classification logic in a next-free lib module (Playwright-loadable — LEARNINGS).
**Risk:** low

### Story 1.3 — Editor polish + live before/after preview
**As** Daniel, **I want** to see the copy as it will render before saving, **so that** editing feels
like a real CMS, not a key-value form.
**Acceptance:** selecting a key shows current (compile-time or overridden) vs draft value rendered
side-by-side using the same pure merge shape (`lib/copy-overrides-merge.ts`); save/restore states are
unambiguous; es-MX microcopy pass. Explicitly NOT a visual page-builder (CMS-eval trigger — out).
**Risk:** low

## Sprint QA
- **api spec(s):** save round-trip + error-classification spec (1.2, e2e/api); preview merge-shape
  unit spec on the pure lib (1.3).
- **browser smoke owed:** yes, to Daniel — the live prod save (1.1) is admin/auth-gated; an automated
  smoke can't own the shared-Supabase step.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Go to https://miyagisanchez.com/admin/contenido (as admin).
   → The editor loads with the key list; no "almacén no disponible" banner.
2. Edit a low-stakes marketing key (e.g. a `/vende` hero line) and save.
   → Success state, no "No se pudo guardar el override."
3. Open the page that key renders on in a private window.
   → The edited copy is live within ≤1 min.
4. Back in the editor, use "restaurar" on that key.
   → The compile-time copy returns on the page within ≤1 min.
5. (1.3) Select any key.
   → Before/after preview renders the current vs draft value side-by-side.

If any step fails, note the step number + what you saw — that's the bug report.
