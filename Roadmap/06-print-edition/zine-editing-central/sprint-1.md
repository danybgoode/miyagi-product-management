# Zine editing central — Sprint 1: the bridge (a real paid ad lands in zine)

**Status:** ⬜ not started

## Stories

### Story 1.1 — Move zine into the monorepo as `apps/zine`
**As** Daniel (editor), **I want** the zine studio living at `apps/zine` with identical behavior,
**so that** it can share the repo's print templates and integrate without copy-paste drift.
**Acceptance:** `cd apps/zine && npm run dev` serves the studio exactly as before (trifold + booklet
editions open, edit, export PDF); its vitest suite is green; existing `data/editions/*.json` load.
**Guardrails:** unique package name (LEARNINGS: a sibling package reusing a name breaks root npm
workspace resolution); zine is NOT added to the frontend Playwright gate; `references/zine` removed
(or left as a frozen pointer) in the same change so there's one copy.
**Risk:** LOW

### Story 1.2 — Print-studio API: token-gated reads + `placed` write-back
**As** the zine studio (a headless machine client with no Clerk session), **I want** a
`withPrintStudio` guard (Clerk admin OR `PRINT_STUDIO_TOKEN` Bearer) over: list open editions, list
an edition's paid/approved ad submissions, list approved social submissions, catalog search, and a
write endpoint flipping a submission `approved ⇄ placed`, **so that** zine can read real marketplace
data and keep advertiser status truthful.
**Acceptance:** without the token every route 401s; with it, Daniel can `curl` an edition's paid ads
and see the same submissions `/admin/print` shows; flipping to `placed` shows in the admin
submissions queue (and reverts). Mutations limited to that one transition — nothing money-touching.
**Risk:** **HIGH** (new auth surface + advertiser-facing status mutation) — **Daniel merges.**

### Story 1.3 — "Anuncios pagados" drawer in zine
**As** Daniel (editor), **I want** to browse the current edition's paid ads inside zine and place
one into a booklet ad slot, rendered with the merchant's template + content verbatim (photos from
their R2 URLs), **so that** sold ads land in the real magazine without retyping.
**Acceptance:** the drawer lists paid/approved submissions with tier + merchant name; placing one
fills the slot pixel-true to the merchant's ad-builder design; the placement snapshots content +
keeps `source.ref_id`; placing/un-placing flips `placed` via 1.2; PDF export embeds the remote
photos at print resolution.
**Risk:** LOW (zine-side; depends on 1.2)

## Sprint QA
- **api spec(s):** 1.2 → `e2e/print-studio-api.spec.ts` (401 without token; shape + status-flip
  round-trip with it, against a disposable submission).
- **unit:** 1.1 zine vitest green post-move; 1.3 submission→block mapping is content-lossless
  (vitest in `apps/zine`).
- **browser smoke owed:** yes, to Daniel — local zine run + prod status flip (his sessions/token).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge
  (frontend repo); `apps/zine` vitest + tsc green.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local zine + production marketplace · fill real URLs when built

1. `cd apps/zine && npm run dev` → open http://localhost:3000
   → The studio opens; existing editions listed unchanged.
2. Open a booklet edition → open the "Anuncios pagados" drawer.
   → The paid ads of the current open marketplace edition appear (same list as
   https://miyagisanchez.com/admin/print → submissions, status paid/approved).
3. Place one ad into an ad slot.
   → It renders exactly as the merchant built it (template, copy, photos); content fields locked.
4. (write-back — auth path, owed to Daniel) Check https://miyagisanchez.com/admin/print submissions.
   → That submission now reads "placed". Un-place in zine → it reverts to "approved".
5. Export the PDF.
   → The merchant's photos are crisp (fetched from R2 at export), QR scans to the right target.

If any step fails, note the step number + what you saw — that's the bug report.
