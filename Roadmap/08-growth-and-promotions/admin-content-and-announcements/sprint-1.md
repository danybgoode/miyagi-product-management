# Admin content & announcements — Sprint 1: Copy override layer + admin editor + bulk round-trip

**Status:** 🚧 in progress — S1.1 merged to branch

> The skateboard: after this sprint, every ALREADY-KEYED marketing surface (`sellerAcquisition` → the
> `/vende` family) is runtime-editable, per key and in bulk, with no deploy. Uncovered surfaces
> (homepage, `/acerca`) come in Sprint 2. Flag: `content.overrides_enabled` (kill-switch, default ON).

## Stories

### Story 1.1 — Override store + pure merge seam ✅ (`a452a37`, branch `feat/admin-content-and-announcements`)
**As** the platform admin, **I want** a `platform_copy_overrides` Supabase table (namespace, key,
locale, value, updated_at/by) and a pure, flag-gated, fail-open merge seam
`applyCopyOverrides(dict, overrides)` layered onto `getDictionary()`, **so that** any keyed surface can
render edited copy with no deploy — and a Supabase outage can never break a page.
**Acceptance:** override a `sellerAcquisition` key in the table directly → `/vende` shows it within
~1 min; Supabase unreachable ⇒ compile-time copy, page renders fine; flag OFF ⇒ compile-time copy;
`next build` route table unchanged (`/` stays `○`). Unit specs on the merge seam (override wins,
fallback on missing/unknown, locale handling).
**Risk:** low

### Story 1.2 — `/admin/contenido` per-key editor
**As** the platform admin, **I want** an admin section listing pages → sections → keys (grouped by
namespace path) with inline editing — the compile-time default always visible, «restaurar» per key
(deletes the override), `en` fields shown ONLY on bilingual-allow-listed namespaces — and save triggering
on-demand revalidation, **so that** I can hand-edit any keyed string and see it live in ≤1 min.
**Acceptance:** edit + save a key → live page updates ≤1 min; restore returns the compile-time value;
non-allow-listed namespaces show no `en` field; orphaned overrides (key no longer in the dictionary) are
flagged in the list.
**Risk:** low

### Story 1.3 — Bulk export/import with diff preview
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
  Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/admin/contenido
   → You see pages → sections → keys, with current values and compile-time defaults.
2. Edit `sellerAcquisition.anchor.heroTitle` (any visible change) and save.
   → Within ~1 min, https://miyagisanchez.com/vende shows the new title.
3. Click «restaurar» on that key.
   → /vende returns to the original title within ~1 min.
4. Export the `sellerAcquisition.anchor` section as XLSX; change 3 values in a spreadsheet; import the file.
   → The diff preview lists exactly your 3 changes (plus any unknown keys as skipped); apply → all 3 live.
5. Open a `terms`-namespace key (allow-listed) and a `sellerAcquisition` key side by side.
   → The first shows es + en fields; the second es only.
6. Flip `content.overrides_enabled` OFF in /admin/flags, wait ~1 min, reload /vende.
   → Pure compile-time copy renders; nothing errors. Flip back ON.

If any step fails, note the step number + what you saw — that's the bug report.
