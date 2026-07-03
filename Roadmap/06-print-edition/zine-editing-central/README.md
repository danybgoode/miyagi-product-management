---
status: in-progress  # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Sprint 1 shipped (PR #161 merged 5583bf9). Sprint 2 shipped — 2.1/2.2/2.3 committed in apps/zine; 2.3's backend PR #164 merged (squash 55bdce9) after 7 rounds of cross-review fixes. Sprint 3: apps/zine S3.2 committed to its local main (f43967e, no further deploy step); apps/miyagisanchez S3.1 built + locally verified (e97627d on feat/zine-editing-central-s3) but PR not yet opened/merged — retires a shipped admin surface, so this flips to `shipped` only after Daniel confirms and the PR merges (Vercel deploy), per WAYS-OF-WORKING/LEARNINGS on not asserting a status flip ahead of the actual deploy.
slug: zine-editing-central
---

# Epic · Zine = the editing central — integrate the zine studio with the marketplace print pipeline

> **Area:** 06 · Print Edition · **Risk:** HIGH (one story) / LOW (rest) · **Archetype:** Builder
> Scoped 2026-07-02 from [`00-ideas/2. readyforscope/zine-editing-central.md`](../../00-ideas/2.%20readyforscope/zine-editing-central.md) (approved by Daniel 2026-07-02).
> **Status:** 🚧 S1+S2 shipped · S1 [#161](https://github.com/danybgoode/miyagisanchezcommerce/pull/161) ·
> S2 [#164](https://github.com/danybgoode/miyagisanchezcommerce/pull/164). S3 built + locally verified
> 2026-07-03 — apps/zine commit `f43967e` (merchant-ad style guardrails, committed to its own local
> `main`); apps/miyagisanchez commit `e97627d` (Maqueta retired, branch `feat/zine-editing-central-s3`,
> **PR [#169](https://github.com/danybgoode/miyagisanchezcommerce/pull/169) open** — Daniel confirmed
> the retirement in conversation; merging once CI is green). Flips to ✅ SHIPPED once that PR merges. **Owed:** physical PDF fold-check at a non-12pp size +
> the admin-surface click-through smoke of the retired builder route.

## Why
The real editorial + design of the printed magazine lives in the standalone **zine studio**
(`references/zine` → moving to `apps/zine`), but zine has no marketplace connection — every ad and
social post is hand-typed JSON. Meanwhile `/admin/print`'s Maqueta can pull paid ads, listings, and
social posts but can't produce the real magazine design. This epic bridges them: zine pulls paid ad
submissions (merchant designs rendered verbatim), live catalog listings, and approved social posts;
the booklet's sheet count becomes variable; and the duplicate Maqueta layout builder retires. One
builder, truthful advertiser status, no drift.

## Context
| | |
|---|---|
| **Role** | Daniel, as the magazine's editor (admin) |
| **Macro-section** | 06 · Print Edition |
| **Class / archetype** | Feature / Builder |
| **Risk** | HIGH overall — new machine-auth surface + advertiser-facing status write-back (S1.2); everything else LOW |
| **Decisions** | monorepo `apps/zine` · local-only runtime · deprecate Maqueta layout builder · read + `placed` write-back |

## Medusa-first note (AGENTS rule #1)
**Zero new Medusa work, zero new Supabase tables.** Placements are already Medusa products; the
editorial layer is already Supabase (`print_ad_submissions`, `print_social_submissions`); `placed`
already exists in the status enum. Zine's layout state stays in its local files (it's a local-only
editor tool). The print-studio API is admin-internal (same agent-exposure posture as the shipped
Maqueta epic — not a UCP surface; rule #3 noted, not violated). Clerk untouched (the token guard
mirrors the documented `withSupplyAdmin` machine path). Internal tool: es-MX, not on the bilingual
allow-list (rule #5).

## What already exists (reuse, don't rebuild)
- **Print domain types + status enums** — `apps/miyagisanchez/lib/print.ts` (the wire contract).
- **Admin read routes** — `app/api/admin/print/{submissions,social,catalog}` (catalog is Medusa
  `searchListings`); the write-back is the existing submissions `[id]` PATCH transition.
- **Machine-auth precedent** — `lib/admin/guard.ts` `withSupplyAdmin` (Clerk admin OR shared secret)
  → new `withPrintStudio` with a dedicated `PRINT_STUDIO_TOKEN`.
- **Ad-block render + style vocabulary** — `lib/print-layout.ts` (`PrintBlockStyle`, content
  snapshot + `source.ref_id` pattern) and the builder/print components' merchant-ad templates.
- **QR + short links** — `lib/print-qr.ts`, auto-minted `mschz.org` codes per listing.
- **The zine studio itself** — editor, geometry/imposition, pdf-lib export, zod schema, vitest suite.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Move zine into the monorepo as `apps/zine`, behavior-identical | LOW |
| 1 | 1.2 Print-studio API: token-gated reads + `placed` write-back (`withPrintStudio`) | **HIGH** |
| 1 | 1.3 "Anuncios pagados" drawer in zine: browse, place verbatim, write-back | LOW |
| 2 | 2.1 Variable booklet sheets (pliegos of 4; editorial sections pinned; imposition + PDF generalize) | LOW |
| 2 | 2.2 Catalog pull: live listings as house-ads with auto QR + short link | LOW |
| 2 | 2.3 Social pull: approved community submissions into the social section | LOW |
| 3 | 3.1 Deprecate the Maqueta layout builder (announce — shipped admin surface) | LOW |
| 3 | 3.2 Fine-tune guardrails: style overrides only on merchant-ad blocks, content locked | LOW |
| 3 | 3.3 Epic close: poster, retro, LEARNINGS, `build-order.mjs` regen | LOW |

## Deploy order
Frontend-only repo work (`apps/miyagisanchez` routes + `apps/zine` local app). S1.2's routes merge
first (dark — nothing calls them until zine's drawer exists); `PRINT_STUDIO_TOKEN` must be set in
Vercel prod env **before** S1.3 is usable, and in zine's local `.env`. No backend (Cloud Run)
changes. Maqueta deprecation (S3.1) merges last, only after Daniel has produced a real placement
via zine (don't remove the old tool before the new one is proven).

## Definition of Done (epic)
- [~] All sprints merged to `main` + smoke-tested (gaps stated) — S1/S2 merged + prod round-trip
      confirmed live 2026-07-02. S3.2 (apps/zine) committed to its local `main`. **S3.1
      (apps/miyagisanchez) built + verified locally but not yet merged** (tsc/build/vitest/Playwright
      green, lock UI + redirect live-checked in browser) — pending Daniel's merge confirmation;
      admin-surface click-through also owed to him once live.
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs) — `sprint-3.md` rewritten with actual
      verified results before close.
- [~] This README marked 🚧 pending S3.1's merge (see status line above); every sprint status ticked
      with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated (06 section: Maqueta line → zine central)
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted (apps/miyagisanchez `feat/zine-editing-central-s3`) — **pending: PR not
      yet opened/merged.** Story 3.1 retires a shipped admin surface Daniel uses daily; per this
      epic's own sprint doc, that merge needs an explicit announce-and-confirm, not just a green CI
      auto-merge. apps/zine's S3.2 is already committed to its own local `main` (no further deploy
      step exists for that repo). **This README's frontmatter stays `status: in-progress`** until
      that PR merges (the frontend deploy) — flip to `shipped` + regenerate
      `node scripts/build-order.mjs` in that same landing commit, not before.
