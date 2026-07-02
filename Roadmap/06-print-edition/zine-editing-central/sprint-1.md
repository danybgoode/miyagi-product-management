# Zine editing central — Sprint 1: the bridge (a real paid ad lands in zine)

**Status:** ✅ all 3 stories built + verified; PR #161 (Story 1.2) awaiting Daniel's merge (HIGH risk)

## Stories

### Story 1.1 — Move zine into the monorepo as `apps/zine` ✅
**As** Daniel (editor), **I want** the zine studio living at `apps/zine` with identical behavior,
**so that** it can share the repo's print templates and integrate without copy-paste drift.
**Acceptance:** `cd apps/zine && npm run dev` serves the studio exactly as before (trifold + booklet
editions open, edit, export PDF); its vitest suite is green; existing `data/editions/*.json` load.
**Guardrails:** unique package name (LEARNINGS: a sibling package reusing a name breaks root npm
workspace resolution); zine is NOT added to the frontend Playwright gate; `references/zine` removed
(or left as a frozen pointer) in the same change so there's one copy.
**Risk:** LOW
**Done:** `apps/zine` is its own local-only git repo (no GitHub remote, no CI — matches the epic's
"local-only runtime" decision), commits `23f6c92` (move) + `1396e99` (Turbopack workspace-root pin,
fixed a lockfile-conflict warning). `npm run dev`, `vitest run` (4 files/9 tests), and `tsc --noEmit`
all verified green locally; all 3 existing editions (`el-barrio-issue-03`, `mx26-issue-01`,
`mexico-26-las-joyas-escondidas-copia`) confirmed loading via `/api/editions`. Gotcha hit + fixed:
apps/zine needs its own **standalone** `npm install` (not the root workspace hoist) — the
root-hoisted `vite` (5.4.21, from another workspace member) is incompatible with vitest 4 /
`@vitejs/plugin-react` 6; a scoped install gives it the matching local `vite` (8.x) it needs.

### Story 1.2 — Print-studio API: token-gated reads + `placed` write-back ✅ (PR open, unmerged)
**As** the zine studio (a headless machine client with no Clerk session), **I want** a
`withPrintStudio` guard (Clerk admin OR `PRINT_STUDIO_TOKEN` Bearer) over: list open editions, list
an edition's paid/approved ad submissions, list approved social submissions, catalog search, and a
write endpoint flipping a submission `approved ⇄ placed`, **so that** zine can read real marketplace
data and keep advertiser status truthful.
**Acceptance:** without the token every route 401s; with it, Daniel can `curl` an edition's paid ads
and see the same submissions `/admin/print` shows; flipping to `placed` shows in the admin
submissions queue (and reverts). Mutations limited to that one transition — nothing money-touching.
**Risk:** **HIGH** (new auth surface + advertiser-facing status mutation) — **Daniel merges.**
**Done:** commit `d3113c8` on `feat/zine-editing-central` (`apps/miyagisanchez`), built in an isolated
worktree (the shared checkout was on a sibling epic's branch). **PR #161** (draft):
https://github.com/danybgoode/miyagisanchezcommerce/pull/161 — CI green (`Type-check + build` pass,
`Playwright vs preview` pass, Vercel preview deployed). **Awaiting Daniel's merge** per risk tier.

### Story 1.3 — "Anuncios pagados" drawer in zine ✅
**As** Daniel (editor), **I want** to browse the current edition's paid ads inside zine and place
one into a booklet ad slot, rendered with the merchant's template + content verbatim (photos from
their R2 URLs), **so that** sold ads land in the real magazine without retyping.
**Acceptance:** the drawer lists paid/approved submissions with tier + merchant name; placing one
fills the slot pixel-true to the merchant's ad-builder design; the placement snapshots content +
keeps `source.ref_id`; placing/un-placing flips `placed` via 1.2; PDF export embeds the remote
photos at print resolution.
**Risk:** LOW (zine-side; depends on 1.2)
**Done:** commit `e8978da` in `apps/zine`. `components/editor/PaidAdsDrawer.tsx` + the token-authed
proxy (`lib/print-studio-client.ts`) + a pure, content-lossless `submissionToAdSlot` mapping
(`lib/print-studio-mapping.ts`, 14 vitest cases). The photo download route
(`/api/print-studio/photo`) reuses the **existing** local-asset + PDF-export pipeline verbatim — no
export code changed. Verified locally end-to-end against a running Story 1.2 dev server: the
editions/submissions read-proxy round-trips real data (0 open editions right now, so the list came
back empty — correct behavior, not a bug), a status-flip on a bogus id correctly propagates a 404
through the whole chain, and the photo-download path saved a real downloaded test image as a local
edition asset (then reverted — no test cruft left in the sample data). The full
place-a-real-ad-into-a-real-slot run needs a real **open** edition with a real **approved**
submission, which don't exist in prod right now — genuinely owed to Daniel, not skipped.

## Sprint QA
- **api spec(s):** 1.2 → `e2e/print-studio-api.spec.ts` (401 without token; shape + status-flip
  round-trip with it, against a disposable submission).
- **unit:** 1.1 zine vitest green post-move; 1.3 submission→block mapping is content-lossless
  (vitest in `apps/zine`).
- **browser smoke owed:** yes, to Daniel — local zine run + prod status flip (his sessions/token).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge
  (frontend repo); `apps/zine` vitest + tsc green.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local `apps/zine` + PR #161's preview (pre-merge) or production (post-merge)

**Before you start (one-time, owed):**
- Merge or don't — either way, set `PRINT_STUDIO_TOKEN` (pick any long random string) as a
  **Vercel Preview + Production** env var on the `miyagisanchez` project (a fresh secret — do not
  reuse `ADMIN_SECRET`).
- In `apps/zine/.env.local`, set the same `PRINT_STUDIO_TOKEN` and point `PRINT_STUDIO_API_BASE` at
  either `https://miyagisanchez-git-feat-zine-editing-5480a3-danybgoodes-projects.vercel.app`
  (PR #161's live preview — works pre-merge, but Vercel preview auth may block a plain server-side
  `fetch` from zine; if so use production instead) or `https://miyagisanchez.com` (post-merge).
- In the admin console (`/admin/print`), make sure at least one edition has **status = open** and
  at least one ad submission on it has **status = approved** — the studio drawer only lists open
  editions and paid/approved/placed submissions, so an empty list at step 2 usually just means this
  step was skipped, not a bug.

1. `cd apps/zine && npm run dev` → open http://localhost:3000
   → The studio opens; existing editions listed unchanged (`el-barrio-issue-03`, `mx26-issue-01`,
   `mexico-26-las-joyas-escondidas-copia`).
2. Open the `el-barrio-issue-03` booklet edition → scroll to "Anuncios pagados" in the left rail.
   → The drawer shows the open marketplace edition's paid/approved ads (same submissions
   `/admin/print` shows for that edition, tier + headline visible).
3. Pick a slot from the dropdown (e.g. "Cuarto de plana · p.8") → click **Colocar**.
   → The slot's headline/body/photo update to the merchant's real content within ~1s
   (autosave fires 700ms after any edit); the submission's row now reads "placed".
4. Check the admin console at `/admin/print` → submissions for that edition.
   → That submission now reads **placed**. Back in zine, click **Quitar** on the same row.
   → It reverts to **approved** in both places.
5. Export the PDF (Descargar PDF button, top bar).
   → The merchant's photo is crisp in the exported PDF (downloaded via `/api/print-studio/photo`
   into the same local-asset pipeline every other image uses); QR codes still scan correctly.

If any step fails, note the step number + what you saw — that's the bug report.
