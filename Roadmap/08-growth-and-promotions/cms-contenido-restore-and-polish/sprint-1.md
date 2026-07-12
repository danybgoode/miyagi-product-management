# CMS restore & polish — Sprint 1: Restore the save path + editor polish

**Status:** 🚧 in progress — all 3 stories built + deterministic gate green (2026-07-12); PR open, awaiting Daniel's merge + smoke

## Stories

### Story 1.1 — Apply the `platform_copy_overrides` migration to prod
**As** Daniel (admin), **I want** the overrides table to actually exist in prod, **so that** my
`/admin/contenido` edits persist instead of erroring.
**How:** the **build agent applies** `apps/miyagisanchez/supabase/migrations/20260708150000_platform_copy_overrides.sql`
to the shared Supabase project (`xljxqymsuyhlnorfrnno` — verify `SUPABASE_URL` first; local IS prod,
per LEARNINGS). Idempotent (`CREATE TABLE IF NOT EXISTS` + RLS; flag insert is `ON CONFLICT DO
NOTHING`). **Pre-authorized by Daniel 2026-07-11 — scoped to this one migration**; announce in-chat
before running (LEARNINGS: name the specific prod-mutation category, don't lean on broad authorization).
**Acceptance:** save an override in `/admin/contenido` → success toast; the edited copy is live on
the target page within ≤1 min; the row is visible via the admin GET route.
**Risk:** high (prod DB DDL on shared infra — no code change)
**✅ Done 2026-07-12** — applied via `mcp__plugin_supabase_supabase__apply_migration` against
`xljxqymsuyhlnorfrnno` (verified `SUPABASE_URL` first); confirmed live: `to_regclass('public.platform_copy_overrides')`
resolves, RLS enabled, `content.overrides_enabled` = `true`, tracked in `list_migrations` as
`20260712060556`. The admin-UI save/live-render round-trip is Clerk-gated — **owed to Daniel** (see
Sprint QA below), not verifiable by the build agent.

### Story 1.2 — Regression spec + actionable "store unavailable" error
**As** an admin, **I want** a clear message when the override store is unreachable/missing, **so
that** an inert store can never again hide behind a generic error for two days.
**Acceptance:** api spec covers the save round-trip contract (POST → GET reflects the row → DELETE
restores); when the table is missing/unreachable the API returns a distinct error and the editor
shows *"El almacén de overrides no está disponible"* (es-MX) instead of the generic save error.
Pure error-classification logic in a next-free lib module (Playwright-loadable — LEARNINGS).
**Risk:** low
**✅ Done 2026-07-12** (commit `4bdc088`, `feat/cms-contenido-restore-and-polish`) — `lib/copy-overrides-errors.ts`'s
`classifyOverrideStoreError()` distinguishes a missing/unreachable table (Postgres `42P01`, PostgREST
`PGRST205`/`PGRST106`, or a `relation ... does not exist` message) from any other failure; GET/POST/DELETE
now return 503 + *"El almacén de overrides no está disponible."* instead of the prior generic 500 for
that case. 7-case Playwright `api` spec (`e2e/copy-overrides-errors.spec.ts`) on the pure classifier. The
authed POST→GET→DELETE round-trip stays Clerk-gated — not testable anonymously (see `e2e/admin-content-overrides-api.spec.ts`,
unchanged, still 4/4 green) — folded into the Sprint QA smoke walkthrough below instead.

### Story 1.3 — Editor polish + live before/after preview
**As** Daniel, **I want** to see the copy as it will render before saving, **so that** editing feels
like a real CMS, not a key-value form.
**Acceptance:** selecting a key shows current (compile-time or overridden) vs draft value rendered
side-by-side using the same pure merge shape (`lib/copy-overrides-merge.ts`); save/restore states are
unambiguous; es-MX microcopy pass. Explicitly NOT a visual page-builder (CMS-eval trigger — out).
**Risk:** low
**✅ Done 2026-07-12** (commit `90950e6`, `feat/cms-contenido-restore-and-polish`) — `lib/copy-overrides-preview.ts`'s
`previewOverrideValue()` reuses `applyCopyOverrides` + `copy-tree`'s `unflattenRows`/`getAtPath` (the SAME
merge shape `getOverriddenDictionary()` reads through live) to resolve a draft's before/after value.
`ContenidoAdminClient` shows an "● Cambios sin guardar" indicator + an "Antes / Después (borrador)" panel
per locale while a draft differs from the saved value; es-MX intro-copy pass. 4-case Playwright `api` spec
(`e2e/copy-overrides-preview.spec.ts`) on the pure resolver.

## Sprint QA
- **api spec(s):** `e2e/copy-overrides-errors.spec.ts` (7 cases, 1.2 error-classification), `e2e/copy-overrides-preview.spec.ts`
  (4 cases, 1.3 preview merge-shape), both pure/next-free. `e2e/admin-content-overrides-api.spec.ts` (pre-existing,
  4 cases) reconfirmed unchanged.
- **browser smoke owed:** yes, to Daniel — the live prod save (1.1) is admin/auth-gated; an automated
  smoke can't own the shared-Supabase step or drive Clerk.
- **deterministic gate:** ✅ green 2026-07-12 — `tsc --noEmit` clean, `npm run build` clean, Playwright
  `api` 2080 passed / 6 failed. The 6 failures (`launchpad-campaign-vote.spec.ts`, `launchpad-submission.spec.ts`,
  `not-found-shape.spec.ts`) have **zero file overlap** with this sprint's diff (confirmed via `git diff --stat`
  against every file those specs touch) — pre-existing, unrelated to this branch.

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
5. (1.3) Back in the editor, start typing a different value into any key's textarea (don't save yet).
   → A "● Cambios sin guardar" line appears with an "Antes" / "Después (borrador)" panel below it,
   showing the current value vs. your in-progress draft. Clear the draft (retype the original value)
   to make the panel disappear before moving on — nothing is written until you click "Guardar".

If any step fails, note the step number + what you saw — that's the bug report.

## Owed to Daniel
- Steps 1–5 above (the full admin-UI round-trip is Clerk-gated; the build agent applied and verified
  the migration at the DB level only — see Story 1.1).
- A live check that Story 1.2's error path never actually needs to fire (it's a pure-logic spec, not a
  live-triggered one — there's no safe way to make prod's `platform_copy_overrides` table disappear to
  test it against the real API).
