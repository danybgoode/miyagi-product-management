---
title: "CMS restore & polish — apply the missing overrides migration, then make /admin/contenido pleasant"
slug: cms-contenido-restore-and-polish
status: scaffolded
area: "08"                           # extends admin-content-and-announcements (08 Growth)
type: bug                            # bug (inert save) + a small polish story riding along
priority: tbd
risk: high                           # one DB migration on the SHARED Supabase project — Daniel applies/merges; everything else low
epic: "08-growth-and-promotions/cms-contenido-restore-and-polish"
build_order: null
updated: 2026-07-11
---

# CMS restore & polish — `/admin/contenido` saves again, then gets previews

**Origin:** Daniel's ask 2026-07-11 — "our internal CMS is not saving content (`No se pudo guardar el
override.`), maybe deploy a standalone Payload CMS on Vercel instead; also the UI isn't the best,
I want previews and a polished experience."

## Stage-2.5 bucket — **already possible today** (bucket 1), plus a light enhancement (bucket 2)
The in-house CMS shipped 2026-07-09 (admin-content-and-announcements) and works — it is silently
inert in prod because of one missing migration. The "move to Payload" reframe was declined at
grooming (see eval below, confirmed by Daniel 2026-07-11); the UX want becomes one small story.

## Bug path — reproduction + root cause (code-verified 2026-07-11)
- **Reproduction:** edit any field in `/admin/contenido` → save → generic error
  *"No se pudo guardar el override."* Every edit is accepted by the UI but has nowhere live to land.
- **Root cause:** `POST /api/admin/content-overrides` (route.ts) returns exactly that string when the
  Supabase upsert to `platform_copy_overrides` errors — and that table **does not exist in prod**:
  migration `apps/miyagisanchez/supabase/migrations/20260708150000_platform_copy_overrides.sql` was
  never applied. Already recorded in the epic's RETROSPECTIVE as *"Owed to Daniel — separately, and
  higher priority."* **Not** caused by the Vercel→Cloud Run migration (2026-07-10) — the feature was
  born inert on 2026-07-09.
- **Promise vs regression:** an unfinished ship step, not a regression. Reads are fail-open
  (`lib/copy-overrides.ts`), so the site is unaffected; only admin writes fail.

## CMS eval — Payload revisited and re-declined (2026-07-11)
The 2026-07-05 eval (approved by Daniel) chose in-house, with a written revisit trigger:
**composable page-building**. This ask (broken save + editor polish + previews) does not hit it.
Research (web-verified 2026-07-11): Payload 3 is Next.js-native, installs into an app folder,
one-click serverless deploy on Vercel, live preview — genuinely capable
([payloadcms.com/posts/blog/payload-30…](https://payloadcms.com/posts/blog/payload-30-the-first-cms-that-installs-directly-into-any-nextjs-app),
[Vercel template](https://vercel.com/templates/next.js/payload-website-starter)). Declined anyway because:
1. Our content layer is **key-value overrides on code-owned layouts** (dictionary = SSOT of shape);
   Payload's model presumes it owns the content — we'd sync a second content model into
   `platform_copy_overrides` or replace the merge seam.
2. Second auth domain next to Clerk (AGENTS rule #4 tension) + separate hosting/billing.
3. A new prod app on Vercel one day after prod moved OFF Vercel (frontend-vercel-to-cloudrun,
   shipped 2026-07-10) reverses the direction of travel.
The revisit trigger stands unchanged: composable page-building → re-run the eval, that's where
Payload-class tools earn their keep.

## What already exists (reuse, don't rebuild)
- `app/api/admin/content-overrides/*` — save/restore/export/import routes, Clerk `withAdmin`,
  audit-logged, `revalidateTag('copy-overrides')`. Nothing to change for the fix.
- `lib/copy-overrides.ts` + `lib/copy-overrides-merge.ts` — **pure** merge seam
  (`getOverriddenDictionary`) → the preview story renders before/after client-side for free.
- `/admin/contenido` editor (`ContenidoAdminClient.tsx`), orphan-override flagging, bulk CSV/XLSX+JSON.
- The migration file itself — `20260708150000_platform_copy_overrides.sql` (CREATE TABLE IF NOT
  EXISTS + RLS), written and reviewed in Sprint 1; it just never ran against prod.

## Stories (one sprint)
| # | Story | Risk |
|---|---|---|
| 1.0 | **Apply the migration to prod** — Daniel (or Daniel-supervised) applies `20260708150000_platform_copy_overrides.sql` to the shared Supabase project. ⚠️ LEARNINGS: Supabase has NO dev-scoped credential — "local" IS prod; apply deliberately, never from a build session. Acceptance: a save in `/admin/contenido` persists; the edited copy is live on the target page within ≤1 min. | high |
| 1.1 | **Regression spec + actionable failure** — api spec asserting the save round-trip against the route's contract, and the route distinguishes "table missing / store unreachable" from generic failure so an inert store is loud in the admin UI (banner: "el almacén de overrides no está disponible"), never a silent generic error again. | low |
| 1.2 | **Editor polish + live preview** — before/after preview of the affected surface rendered client-side via the pure merge seam (`getOverriddenDictionary` shape), clearer save/restore states, es-MX microcopy pass. No new deps, no visual page-builder (out of scope — that's the CMS-eval trigger). | low |
| 1.3 | **Smoke walkthrough** — real-URL walkthrough in sprint-1.md; save + preview + restore path owed to Daniel. | low |

## Kill-switch decision (risk: high — Stage 6b)
**Carve-out, no flag:** the high-risk item is a DB migration (additive `CREATE TABLE IF NOT EXISTS`
+ RLS) — it can't sit behind a runtime flag; reads are already fail-open to compile-time copy, which
IS the rollback behaviour (drop/ignore the table → site unaffected).

## Scope boundary
**In (v1):** migration applied · regression spec · actionable store-down error · preview + polish on
the existing editor.
**Out:** Payload / any external CMS (trigger unchanged) · visual page-building · new placements ·
media management · anything on Vercel prod.

## Open risks
- The migration touches the shared Supabase project — mitigated by Daniel applying it deliberately
  (story 1.0), the exact discipline LEARNINGS prescribes.
- Preview fidelity: client-side preview approximates the server render; acceptance is "copy shown =
  copy that ships," not pixel parity.
