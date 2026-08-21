---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: imported-shop-homepage-integrity
---

# Epic: Imported-shop homepage integrity

> **Area:** 01-discovery-and-shopping · **Risk:** low · **Class:** Bug · **Scope seed:** [`00-ideas/seeds/imported-shop-homepage-integrity.md`](../../00-ideas/seeds/imported-shop-homepage-integrity.md)
<!-- Class (above) is the Stage-2 classification: Feature, Spike, Bug, or Chore — see SKILL.md's
     Stage 2 table; sourced from scaffold-epic.mjs's --type flag (a fixed 4-value enum, not free
     text — a longer description belongs in ## Why, not here).
     Optional: if this epic was ALSO tagged with an archetype at grooming (see spike-role-archetypes.md),
     append " · **Archetype:** <Prototyper|Builder|Sweeper|Grower|Maintainer>" after Class. Omit entirely
     for the Builder default — untagged is fine.
     Scope-seed link: always points at seeds/ — lifecycle lives in the seed's `status:` frontmatter, not
     in a folder path (see 00-ideas/README.md). If this epic was scaffolded from a doc that has no seeds/
     entry, link that doc instead and migrate it to seeds/ when convenient — don't fabricate a seeds/ file
     that doesn't exist. -->

## Why

Six newly imported claimable shops should look intentional on the homepage, and the product owner
should be able to trust that `/admin/seleccion` controls the same set the public homepage renders.
This bug sweep repairs the six catalog records and removes the admin's hidden-pin blind spot without
inventing shop prices or redesigning homepage cards.

## Platform-first note

Medusa already owns listing images and `metadata.featured` / `featured_rank`. Existing authenticated
frontend supply routes upload files to first-party R2 and replace Medusa images, then mirror them to
Supabase. No schema, backend write path, or secondary source of truth is added.

## What already exists (reuse, don't rebuild)

- `app/api/supply/upload/route.ts` — authenticated, size/type-validated R2 upload.
- `app/api/supply/listing-images/route.ts` — replace Medusa images, mirror, and revalidate.
- `lib/listings.ts` — `getSeleccionCandidates`, `getCuratedPool`, and `unionById` fetch seams.
- `app/api/admin/seleccion/route.ts` + `lib/admin/featured.ts` — current admin read/write rails.
- `e2e/home-curation.spec.ts` / `e2e/admin-featured.spec.ts` — nearby deterministic coverage.
- `/store/listings?featured=true` — shipped backend filter that returns all pins before pagination.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Repair six shop image sets through the existing supply rail | low |
| 1 | 1.2 Make the admin candidate pool authoritative over freshness | low |
| 1 | 1.3 Normalize the approved five-pin set and verify homepage behavior | low |

## Deploy order

Upload the catalog images first (existing production route), then ship the frontend admin read fix.
The backend is unchanged. After the frontend deploy, keep the approved five pins, remove the 23 hidden
old pins, normalize their ranks, and verify admin + homepage live. Every read degrades per fetch so a
featured-filter failure cannot break the admin page.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (only if one was planned at grooming — Stage 6b):** the flag slice shipped + the flag
      exists **in this project's own flag provider, in every env**, with the stated polarity (this
      project's AGENTS.md / WAYS-OF-WORKING names the mechanism — a flag is invisible until it's
      created there). *Verify-only — not a new gate; whether a high-risk epic needs one is decided at
      grooming, not here.*
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
