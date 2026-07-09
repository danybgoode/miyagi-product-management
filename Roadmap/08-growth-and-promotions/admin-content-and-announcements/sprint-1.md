# Admin content & announcements — Sprint 1: Copy override layer + admin editor + bulk round-trip

**Status:** ✅ merged + live — PR #197 squash `c7e32d2` on `main`. **Owed before this sprint's stories
actually work in prod:** the Supabase migration (`supabase/migrations/20260708150000_platform_copy_overrides.sql`)
must be applied manually (per its own header comment) — it's additive/idempotent and the fail-open reader
degrades gracefully (empty overrides ⇒ pure compile-time copy) if it's not yet applied, so this is safe to
defer but blocks the smoke walkthrough below from actually showing an override taking effect. Also owed:
Daniel's `/admin/contenido` browser click-through (no money path — not a merge blocker).

> The skateboard: after this sprint, every ALREADY-KEYED marketing surface (`sellerAcquisition` → the
> `/vende` family) is runtime-editable, per key and in bulk, with no deploy. Uncovered surfaces
> (homepage, `/acerca`) come in Sprint 2. Flag: `content.overrides_enabled` (kill-switch, default ON).

## Stories

### Story 1.1 — Override store + pure merge seam ✅ (squashed into PR #197 `c7e32d2` on `main`)
**As** the platform admin, **I want** a `platform_copy_overrides` Supabase table (namespace, key,
locale, value, updated_at/by) and a pure, flag-gated, fail-open merge seam
`applyCopyOverrides(dict, overrides)` layered onto `getDictionary()`, **so that** any keyed surface can
render edited copy with no deploy — and a Supabase outage can never break a page.
**Acceptance:** override a `sellerAcquisition` key in the table directly → `/vende` shows it within
~1 min; Supabase unreachable ⇒ compile-time copy, page renders fine; flag OFF ⇒ compile-time copy;
`next build` route table unchanged (`/` stays `○`). Unit specs on the merge seam (override wins,
fallback on missing/unknown, locale handling).
**Risk:** low

### Story 1.2 — `/admin/contenido` per-key editor ✅ (squashed into PR #197 `c7e32d2` on `main`)
**As** the platform admin, **I want** an admin section listing pages → sections → keys (grouped by
namespace path) with inline editing — the compile-time default always visible, «restaurar» per key
(deletes the override), `en` fields shown ONLY on bilingual-allow-listed namespaces — and save triggering
on-demand revalidation, **so that** I can hand-edit any keyed string and see it live in ≤1 min.
**Acceptance:** edit + save a key → live page updates ≤1 min; restore returns the compile-time value;
non-allow-listed namespaces show no `en` field; orphaned overrides (key no longer in the dictionary) are
flagged in the list.
**Risk:** low

### Story 1.3 — Bulk export/import with diff preview ✅ (squashed into PR #197 `c7e32d2` on `main`)
**As** the platform admin, **I want** to export a page/section/namespace as CSV/XLSX (flattened key
paths) or JSON (structure-true), work the copy externally, and import either format back through a
**diff preview** (added/changed/skipped-unknown) before a scoped apply, **so that** I can do copywriting
in bulk and apply it in one pass — bulk or scoped.
**Acceptance:** round-trip: export → edit 3 keys externally → import shows exactly those 3 as changes →
apply → live. Unknown keys are listed + skipped, never created (the dictionary defines the universe).
Import parser unit-specced (both formats, flattening round-trip).
**Risk:** low

## Sprint QA
- **api spec(s):** merge-seam unit specs; import/diff parser unit specs; one `api` Playwright spec on the
  admin save→rendered-override path + one asserting the flag-OFF fallback.
- **browser smoke owed:** yes, to Daniel — the admin editor click-through (edit, restore, bulk round-trip).
- **deterministic gate:** `tsc --noEmit` + `npm run build` (route table asserted: `/` still `○`) +
  Playwright `api` green before merge. All green on PR #197 (CI: type-check+build, Playwright vs preview,
  Vercel deploy).
- **Cross-agent review (Codex, advisory):** caught 1 real blocking issue pre-merge — `lib/copy-overrides-import.ts`
  had 4 literal NUL bytes embedded in a template literal (a write-tool artifact), making the file show as a
  binary diff; fixed to plain UTF-8. Also caught a Rule #5 slip (hardcoded English "Locale" table header →
  "Idioma") and 3 should-fix items, all applied: bulk-apply now deletes an override (instead of freezing a
  copy of today's text) when the imported value equals the current compile-time default; a raw-upload size
  guard before parsing; the per-key editor now refreshes after a bulk apply. A fresh Claude reviewer then
  independently verified all fixes + the five AGENTS rules + the static-`/` invariant — approved clean.
- **Non-blocking note for Daniel:** `xlsx@0.18.5` (SheetJS, added this sprint) carries known npm-registry
  CVEs (prototype pollution, ReDoS) from before SheetJS moved distribution off npm. The parse path is
  Clerk-admin-gated (not public), so exploitation requires an already-authenticated platform admin — low
  practical risk, not blocking at LOW tier — but worth knowing a flagged package entered `package.json`. A
  future follow-up could pin SheetJS from their own CDN tarball instead of npm.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/admin/contenido
   → You see namespaces (e.g. `sellerAcquisition`, `terms`) → sections (e.g. `anchor`) → keys, each
   showing "Original:" (the compile-time default) plus an editable field. Use the search box to jump
   straight to a key by path or text.
2. Edit `sellerAcquisition.anchor.heroTitle` (any visible change) and click «Guardar».
   → https://miyagisanchez.com/vende shows the new title on reload — the save calls on-demand
   revalidation, so it's near-instant (the ≤1 min acceptance is the outer bound, not the typical case).
3. Click «Restaurar» on that key.
   → /vende returns to the original title on reload (also near-instant).
4. In the "Exportar / importar en bloque" panel, type `sellerAcquisition` in the Página field and
   `anchor` in the Sección field, then click «Exportar XLSX». Open the file, change 3 `value` cells,
   save, and upload it back via the file picker.
   → The diff preview grid lists exactly your 3 rows as «cambiado» (any row you didn't touch that
   matches the current value is omitted — only real deviations appear); check the 3 rows and click
   «Confirmar e importar» → all 3 live on `/vende` on reload.
5. Open a `terms`-namespace key (allow-listed) and a `sellerAcquisition` key side by side in `/admin/contenido`.
   → The `terms` key shows an es field AND an "EN" field below it; the `sellerAcquisition` key shows
   only the es field.
6. Flip `content.overrides_enabled` OFF in /admin/flags, wait ~1 min (the flag read has no on-demand
   revalidation — it's the same 60s in-process cache TTL every other flag uses), reload /vende.
   → Pure compile-time copy renders (your Step 2 edit, if not yet restored, is invisible); nothing
   errors. Flip back ON, wait ~1 min, reload — overrides resume.

If any step fails, note the step number + what you saw — that's the bug report.
