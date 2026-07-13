---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: cms-contenido-restore-and-polish
---

# Epic: CMS restore & polish — /admin/contenido saves again, then gets previews

> **Area:** 08-growth-and-promotions · **Risk:** high · **Archetype:** Maintainer · **Scope seed:**
> [`00-ideas/seeds/cms-contenido-restore-and-polish.md`](../../00-ideas/seeds/cms-contenido-restore-and-polish.md)
> (approved by Daniel 2026-07-11).

## Why
Daniel edits runtime copy in `/admin/contenido` and every save fails with a generic
*"No se pudo guardar el override."* Root cause (code-verified): the `platform_copy_overrides`
migration was never applied to prod — the feature shipped 2026-07-09 born-inert (recorded in the
admin-content RETROSPECTIVE as owed). This epic restores the save path, makes an inert store loud
instead of silent, and gives the editor the previews/polish Daniel asked for. The "move to Payload"
reframe was **re-declined** (2026-07-11): the 2026-07-05 in-house eval stands, revisit trigger
unchanged (composable page-building) — see the seed for the full re-eval with citations.

## Medusa-first note
No commerce concern (rule #1 n/a). Runtime copy is non-commerce → the existing Supabase
`platform_copy_overrides` pattern is correct (rule #2). Admin-only surface, Clerk `withAdmin`
untouched (rule #4). Editor microcopy es-MX (rule #5). No agent surface (admin tool).

## What already exists (reuse, don't rebuild)
- `apps/miyagisanchez/supabase/migrations/20260708150000_platform_copy_overrides.sql` — the fix IS
  this file; written + reviewed in admin-content S1, never applied to prod.
- `app/api/admin/content-overrides/*` — save/restore/export/import routes (Clerk-gated, audited,
  `revalidateTag('copy-overrides')`). Unchanged for the fix; 1.2 adds error differentiation only.
- `lib/copy-overrides.ts` + `lib/copy-overrides-merge.ts` — pure merge seam
  (`getOverriddenDictionary`); the preview story renders before/after client-side from it.
- `/admin/contenido` editor (`ContenidoAdminClient.tsx`) + orphan-override flagging + bulk import/export.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1.1 Apply the migration to prod + verify the save round-trip live | high |
| 1 | US-1.2 Regression spec + actionable "store unavailable" error (no more silent generic 500) | low |
| 1 | US-1.3 Editor polish + live before/after preview via the pure merge seam | low |
| 2 | US-2.1 Search/filter/sort/pagination for the key list + show which page/URL each key belongs to (Daniel fast-follow, 2026-07-12) | low |
| 2 | US-2.2 Bulk export/import scope inputs become predefined dropdowns with a default + plain-language "what this produces" label (Daniel fast-follow, 2026-07-12) | low |
| 3 | US-3.1 Page-first sub-navigation — namespace groups w/ route labels, derived field labels (from Daniel's `references/cms_redesign.tsx` prototype, adapted at grooming 2026-07-12) | low |
| 3 | US-3.2 Batched save — dirty-map + floating «Guardar cambios» riding the existing bulk upsert | low |
| 3 | US-3.3 Token/Iconoir re-skin + AdminShell grouping & sticky-overflow fix (shared surface — announce) | low |
| 3 | US-3.4 Extend the design-token guard to the touched admin files (incremental sweep list) | low |
| 4 | US-4.1 Fix the routing map — real per-section destinations (sweepstakes/events seller vs public vs email) + honest no-page labels (Daniel fast-follow, 2026-07-13) | low |
| 4 | US-4.2 Nav: distinct section names + real destinations shown inline, no two siblings look alike | low |
| 4 | US-4.3 Per-field destination context next to the before/after preview + sticky page header | low |

## Deploy order
US-1.1 is an ops action on the shared Supabase project, applied by the build agent —
**pre-authorized by Daniel 2026-07-11, scoped to this one idempotent migration; announce before
running** (⚠️ LEARNINGS: Supabase has NO dev-scoped credential — local IS prod; verify which project
the URL points at first).
Additive `CREATE TABLE IF NOT EXISTS` + RLS; reads are already fail-open so the site is safe
throughout. US-1.2/1.3 are frontend-only, normal PR flow. Kill-switch: carve-out (DB migration —
fail-open reads ARE the rollback; see seed Stage 6b).

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested — **all 4 sprints' live smokes confirmed green by
      Daniel, 2026-07-13**
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated — feature-map line + Recent Highlights entry
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** n/a — carve-out recorded at grooming (Stage 6b: migration, fail-open reads)
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
