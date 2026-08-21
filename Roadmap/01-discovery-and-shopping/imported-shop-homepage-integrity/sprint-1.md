# Imported-shop homepage integrity — Sprint 1: Catalog repair and admin parity

**Status:** ✅ complete

## Stories
<!-- One block per story. Thinnest shippable slice first.
     Keep the heading shape `### Story 1.M — <title>` (this is what the status board counts).
     When a story ships, append ✅ + its commit ref to the heading, e.g.
       ### Story 1.1 — <title> ✅ `abc1234`
     Note: the epic README frontmatter `status:` is the AUTHORITATIVE epic status; this ✅ marker only
     feeds the cosmetic per-sprint progress count, so a format slip can't mis-state shipped/not-shipped. -->

### Story 1.1 — Repair the six imported shop image sets ✅ production catalog write, 2026-08-21

**As a** marketplace visitor, **I want** each newly imported claimable shop to have representative
photos, **so that** the homepage and listing page communicate what the shop is before it is claimed.

**Acceptance:** Piezas Únicas has 2 images and Selección Marsella, XOLO Vintage, Erre Vintage, Roma
Vintage, and Goodbye Folk each have 3; every stored URL is first-party R2; alt text names the shop and
scene; no generic shop listing receives a fabricated product price.

**Risk:** low

### Story 1.2 — Make the Selección admin pool authoritative ✅ `0eb9985` / [#415](https://github.com/danybgoode/miyagisanchezcommerce/pull/415)

**As a** product owner, **I want** `/admin/seleccion` to expose every pinned listing regardless of
freshness, **so that** the admin and homepage cannot disagree through invisible old pins.

**Acceptance:** the admin read unions newest candidates with `featured=true`, dedupes by id, and
degrades each fetch independently; a regression spec proves a pin outside the newest-50 remains
visible and the complete pinned set is ranked deterministically. Observe the regression red once by
mutating/removing the union before restoring the implementation.

**Risk:** low

### Story 1.3 — Apply and verify the approved pin cleanup ✅ production metadata write, 2026-08-21

**As a** product owner, **I want** the approved five visible pins to be the complete ranked set,
**so that** the public Selección reflects what the admin shows.

**Acceptance:** keep Chai, Stickers Cosmicalcomanías, Gargantilla Conejo, Espejo vitral chico, and
Broquel Ajolotes; unpin the other 23; normalize the retained set to unique contiguous ranks 1–5; live
admin and homepage agree. “Recién llegado” shows the new R2 photos for the repaired records; no
speculative image-loader change lands without a reproducible failed URL or state transition.

**Risk:** low

## Sprint QA
- **api spec(s):** Story 1.2 → a focused Selección candidate-pool spec beside the existing admin/home
  curation specs; Story 1.1/1.3 → live Store API assertions on images, pins, and ranks.
- **browser smoke owed:** authenticated `/admin/seleccion` plus anonymous `/mx`; Codex can run both in
  the existing signed-in browser session. No money/auth mutation beyond the approved admin metadata.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

**Observed:** the new candidate-pool regression was deliberately made red by removing the featured
union, then restored. Final gate: TypeScript and build green; focused regression/population guard 64
passed; full API suite 4,394 passed / 36 skipped; all PR checks green. Production Cloud Build
`ff5c637b-8868-4e95-aacb-ee51c74c2d68` succeeded and Cloud Run revision `miyagi-web-00131-qzf`
received 100% traffic. The final `/mx` live smoke returned 200 with zero console errors; a scrolled
image audit found no HTTP ≥400 image response and no loaded image with zero natural dimensions.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Go to https://miyagisanchez.com/admin/seleccion while signed in as admin.
   → “Fijados” contains exactly the approved five entries in order 1–5; no hidden old pin remains.
2. Go to https://miyagisanchez.com/mx and scroll to “Recién llegado al barrio.”
   → The repaired imported shops render their new photos without a package empty-state or broken image.
3. Continue to “Selección de la semana.”
   → The public cards follow the same approved order shown in admin.
4. Open each of the six repaired listing pages from the homepage or recent-listings catalog.
   → Piezas Únicas has 2 gallery images and each other shop has 3; images load from Miyagi storage.

If any step fails, note the step number + what you saw — that's the bug report.

**Completed walkthrough (2026-08-21):** steps 1–4 passed. The signed-in admin showed exactly five
pins in the approved order and exposed the six repaired imports as candidates. `/mx` showed the four
newest repaired shops with first-party photos and the same five-item Selección. Store API verification
confirmed 2 images for Piezas Únicas, 3 for each other named shop, all first-party R2, with price left
honestly at “consultar.”
