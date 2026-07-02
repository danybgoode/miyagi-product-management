---
status: scaffolded
slug: zine-editing-central
---

# Epic · Zine = the editing central — integrate the zine studio with the marketplace print pipeline

> **Area:** 06 · Print Edition · **Risk:** HIGH (one story) / LOW (rest) · **Archetype:** Builder
> Scoped 2026-07-02 from [`00-ideas/2. readyforscope/zine-editing-central.md`](../../00-ideas/2.%20readyforscope/zine-editing-central.md) (approved by Daniel 2026-07-02).

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
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated (06 section: Maqueta line → zine central)
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
