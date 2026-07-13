# CMS restore & polish — Sprint 3: the redesign — page-first IA, batched save, tokens (from Daniel's prototype)

**Status:** ✅ merged 2026-07-12 (PR #242, squash commit `32bcf7a`) — deterministic gate green
(CI + independent `pr-reviewer` pass + codex cross-agent advisory, one real finding fixed pre-merge).
**Live browser/visual smoke confirmed green by Daniel, 2026-07-13.**

Origin: Daniel's prototype `references/cms_redesign.tsx` (2026-07-12), reviewed + adapted at grooming.
**Adopted:** page/section sub-navigation, single floating batched save, status chips, sidebar grouping.
**Adapted:** raw Tailwind slate/emerald + lucide → our semantic tokens + Iconoir; its standalone
double-sidebar shell → keep AdminShell as the outer rail; batched save → the already-shipped bulk
upsert. **Dropped:** hand-curated label map (1,121 keys) → labels derived from the key path (Daniel,
2026-07-12); curate top namespaces later only if needed.

## Stories

### Story 3.1 — Page-first sub-navigation (the IA fix)
**As** Daniel, **I want** to pick a page/section (e.g. "Acerca · /acerca") and edit only its fields in
context, **so that** I stop paging through 57 pages of a flat key list.
**How:** a `contenido`-local nav column (inside the existing AdminShell rail, NOT a new shell) listing
namespace groups with their route labels — reuse Sprint 2's `lib/copy-overrides-routes.ts` mapping.
Field labels derived from the key path (pure `humanizeKeyPath()` in a next-free lib), original value
shown as context. Search + Editadas/Sin editar filters stay, scoped to the selected group.
**Acceptance:** selecting a group shows only its fields with derived labels + originals; URL reflects
the selection (deep-linkable); existing search/filter behaviour intact.
**Risk:** low
**✅ Done 2026-07-12** (commit `9b10691` on `feat/cms-contenido-restore-and-polish-s3`) —
`lib/copy-overrides-page-nav.ts` (`buildPageNavGroups`/`firstNavSelection`/`isValidNavSelection`),
`lib/copy-overrides-labels.ts` (`humanizeKeyPath`), `filterKeysBySection` + `section` param added to
`lib/copy-overrides-admin-view.ts`, new `ContenidoPageNav.tsx`, `page.tsx` now scopes to one group
(defaults to the first, alphabetically, on an invalid/missing selection), `ContenidoFilterBar.tsx`'s
namespace `<select>` dropped in favor of the nav column (namespace/section ride as hidden inputs so a
search/sort submit doesn't lose the active group). The field-card re-skin (`.card-panel`/`.btn`/
`.input`/`.badge-mono`) landed in this same commit since the file was being rewritten anyway — see the
note under Story 3.3.

### Story 3.2 — Batched save: dirty-state + floating "Guardar cambios" bar
**As** Daniel, **I want** one save action for everything I've edited on screen, **so that** I stop
clicking 1,121 per-field Guardar buttons.
**How:** client dirty-map + a sticky bottom action bar within the editor column (not the prototype's
brittle `fixed left-[calc(...)]`); save rides the **existing bulk upsert shape**
(`content-overrides/import/apply`'s `onConflict: 'namespace,key,locale'` upsert — thin batch handler
or direct reuse), one `revalidateTag` per batch. Per-field save removed; per-field «restaurar» stays.
**Acceptance:** edit 3 fields across 2 groups → one Guardar → all 3 persist (verifiable via GET) and
are live within ≤1 min; navigating away with unsaved changes warns; failure reports which keys failed.
**Risk:** low
**✅ Done 2026-07-12** (commit `44be16c`) — new pure `lib/copy-overrides-draft-batch.ts`
(`buildBatchApplyRows`/`removeAppliedDrafts`), the draft map now carries `namespace`/`key` explicitly
(not just locale values) so a draft survives navigating to a different page/section — batched save can
genuinely span multiple groups, as the acceptance requires. Saves POST directly to the existing
`POST /api/admin/content-overrides/import/apply` (zero new backend route). Unsaved-changes guard: a
`confirm()` on page-nav clicks + a `beforeunload` listener for tab close/refresh — **deliberately NOT**
wired onto filter/sort/pagination or the outer `AdminShell` rail (stated scope boundary, not a gap —
those are same-group/lower-risk actions).

### Story 3.3 — Token/Iconoir re-skin + AdminShell grouping & overflow fix (shared surface — ANNOUNCE)
**As** an admin user, **I want** the CMS and admin nav to look and behave like the rest of the product,
**so that** the admin stops being the un-designed corner.
**How:** re-skin `/admin/contenido` + `AdminShell` on semantic tokens (`--accent`, `--surface-muted`,
`.btn`, `.chip`, `.t-*`) and Iconoir (NO lucide, NO raw slate/emerald hex — the prototype's palette
maps to tokens). Group `ADMIN_SECTIONS` with section headers (General / Sitio / Administración — add a
`group` field to the registry). Fix the sticky rail: `max-height: calc(100vh - 32px)` + internal
`overflow-y: auto` (it's already `position: sticky`; it outgrew the viewport, which is why it "scrolls
with the page"). ⚠️ `AdminShell.tsx` wraps every `/admin/*` page — **announcing here**: this sprint
touches `AdminShell.tsx`'s desktop-rail sticky/overflow behavior and adds group headers; every other
`/admin/*` page's own content is untouched, only the shared rail chrome around it changed.
**Acceptance:** rail stays pinned with internal scroll on a short viewport; sections grouped; zero raw
hex / non-token colors in the touched files; mobile chip nav unchanged.
**Risk:** low
**✅ Done 2026-07-12** (commit `f8891b5`) — `lib/admin/sections.ts` gained `AdminSection.group`
(`'general' | 'sitio' | 'administracion'`) + `ADMIN_SECTION_GROUP_LABELS`; `AdminShell.tsx`'s desktop
rail now renders a header per group and gained `maxHeight`/`overflowY` on its sticky container; its
mobile nav moved off a bespoke `chipStyle` const onto the shared `.chip`/`.chip-rail` classes.
`ContenidoImportExportPanel.tsx` re-skinned onto `.card-panel`/`.input`/`.btn`/`.badge-mono` (its own
`buttonStyle`/`inputStyle` consts removed). **Note:** `ContenidoAdminClient.tsx`'s re-skin actually
landed in Story 3.1's commit, not here — that file was being fully rewritten there anyway for the IA
change, so doing the class conversion twice would have been pure churn. This story's real scope ended
up being `ContenidoImportExportPanel.tsx` + `AdminShell.tsx`; the acceptance criteria (zero raw hex,
grouped sections, fixed sticky rail) are still fully met across the sprint.

### Story 3.4 — Extend the design-token guard to the touched admin files
**As** the team, **I want** the re-skinned admin files under the raw-hex/token CI guard, **so that**
the redesign can't silently regress (Daniel, 2026-07-12: incremental extension approved).
**How:** add exactly the files this sprint touched (`AdminShell.tsx`, `contenido/*`) to the guard's
enforced list — the `enforcedSweptPaths` incremental-adoption shape from LEARNINGS; the guard scans
broadly, asserts hard only on the swept list. Other admin pages stay excluded until touched.
**Acceptance:** guard spec green on the sprint's files; deliberately adding a raw hex to a swept file
fails the spec (observed red once, then reverted).
**Risk:** low
**✅ Done 2026-07-12** (commit `30e4d94`) — discovered mid-story that `guardExcludedPrefixes` excludes
the WHOLE `app/(shell)/admin/` tree from the scan itself (not merely from enforcement), so
`enforcedSweptPaths` alone would have been a no-op for these 4 files. Added a new
`enforcedDespiteExcludedPrefix` Set, checked first in `isGuardExcluded`, that un-excludes exactly
`AdminShell.tsx` + the 3 touched `contenido/*` files; paired with adding the same 4 to
`enforcedSweptPaths` for the hard gate. Every other admin file stays fully excluded until touched — same
incremental shape as the existing sweep, just one layer earlier (scan coverage, not just enforcement).
Added a permanent negative-fixture test + a companion "still excluded" test for an untouched admin file.
**Mutation check performed as required:** temporarily disabled the new `enforcedDespiteExcludedPrefix`
check, ran the fixture — it failed exactly as expected (red), then reverted and re-confirmed green.

## Sprint QA
- **api spec(s) — all new, all green:**
  - `copy-overrides-labels.spec.ts` (5 cases, `humanizeKeyPath`)
  - `copy-overrides-page-nav.spec.ts` (8 cases, `buildPageNavGroups`/`firstNavSelection`/`isValidNavSelection`)
  - `copy-overrides-admin-view.spec.ts` extended (+3 cases: `filterKeysBySection`, `section` in `buildContenidoPageUrl`)
  - `copy-overrides-draft-batch.spec.ts` (12 cases, `buildBatchApplyRows`/`removeAppliedDrafts`/`updateDraftLocale`
    — the last of these added POST-review, see below; all mutation-checked)
  - `admin-sections.spec.ts` extended (+2 cases: the new `group` field — mutation-checked)
  - `design-token-foundation.spec.ts` extended (+2 cases: the guard-coverage override — mutation-checked)
- **Review — 3 layers, one real fix landed pre-merge:**
  - **CI (GitHub Actions):** `Type-check + build` + `Playwright vs preview` both green on the final commit.
  - **Independent `pr-reviewer` subagent** (fresh agent, not the builder): verified every S3.1–S3.4 claim
    against the actual diff, confirmed LOW risk tier defensible (AdminShell.tsx is presentational chrome,
    no auth/money/DB), approved cleanly — two minor non-blocking notes only (a PR-body wording nit on
    "4 files touched" vs the sprint's actual 6-file diff; an already-idempotent partial-failure edge case).
  - **Cross-agent advisory (codex, `node scripts/cross-review.mjs 242 --agent codex`):** found one real,
    worth-fixing issue — `dirtyPaths` counted every *touched* draft path, not actually-dirty ones, so
    editing a field then reverting it back to the live value still triggered the unsaved-changes warning,
    the batched-save bar, and a no-op re-write. **Fixed pre-merge** (commit `f28d091`): extracted a new
    pure `updateDraftLocale()` into `lib/copy-overrides-draft-batch.ts` so the "does this un-dirty the
    entry" decision is unit-tested (5 new cases) rather than inline component logic — mutation-checked
    (all 3 revert-path assertions observed red, then reverted). Antigravity was also attempted as a second
    cross-agent opinion but its CLI errored on this run (`Agent execution terminated due to error`) —
    codex's pass stood as the cross-agent signal.
- **browser smoke owed:** yes, to Daniel — the visual/aesthetic sign-off on the redesigned editor and
  the grouped rail (no money path). **Also owed:** this build session had no local Supabase/Clerk
  credentials available (`.env.local` absent from this worktree) and this epic's own Sprint 1/2 already
  established the same split (no authed round-trip attempted without a live admin session) — so the
  batched-save round-trip (edit → Guardar cambios → confirm via GET → live ≤1 min) and the
  unsaved-changes-warning UX were verified by code review + the pure-logic specs above, NOT by an actual
  browser session. This is explicitly flagged, not glossed.
- **deterministic gate:** ✅ green on the final merged commit — `tsc --noEmit` clean, `npm run build`
  clean, Playwright `api` green (a local re-run showed a fluctuating extra 2-3 failures across repeated
  runs — different specs each time, e.g. `own-shop-seo.spec.ts`/`static-shell-split.spec.ts`/
  `embed-shop.spec.ts` — all touching files unrelated to this PR and none stable across runs, consistent
  with live-data/environment flakiness rather than a regression; CI's own run on the PR's Vercel preview
  is the authoritative signal and was green). The stable, consistently-reproducing 3 specs
  (`launchpad-campaign-vote.spec.ts`, `launchpad-submission.spec.ts`, `not-found-shape.spec.ts`) match
  the same pre-existing gap Sprint 1/2 already documented.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (merged 2026-07-12, live once Cloud Run finishes deploying)

1. Go to https://miyagisanchez.com/admin/contenido (as admin, desktop).
   → A page/section list appears alongside the editor; pick "Acerca (plataforma)".
   → Only its fields show, with readable derived labels + the original text under each.
2. Edit two fields, scroll — a "Cambios sin guardar" bar appears pinned at the bottom of the editor.
   → Click «Guardar cambios» → success; both edits live on /acerca within ≤1 min.
3. Edit a field, try to navigate to another group without saving.
   → You get an unsaved-changes warning.
4. On any /admin page, shrink the browser window height.
   → The left rail stays pinned and scrolls internally; sections show General / Sitio / Administración
     headers; icons are Iconoir, colors match the product (no gray/emerald prototype palette).
5. On a phone, open /admin/contenido.
   → The horizontal chip nav still works; the editor is usable single-column.

If any step fails, note the step number + what you saw — that's the bug report.

**Confirmed green by Daniel, 2026-07-13** (steps 1–5 above).
