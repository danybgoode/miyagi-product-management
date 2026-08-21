---
title: "Imported-shop homepage integrity"
slug: imported-shop-homepage-integrity
status: scaffolded
area: "01"
type: bug
priority: null
appetite: S
underwritten_by: null
risk: low
epic: "01-discovery-and-shopping/imported-shop-homepage-integrity"
build_order: null
updated: 2026-08-21
---

# Imported-shop homepage integrity

## Ask and classification

Fixed-scope bug sweep after the latest claimable-shop import: attach representative photos to six
shop-level listings, make `/admin/seleccion` show the same pinned set the homepage consumes, and
investigate a reported transient broken-image state in “Recién llegado al barrio.” Appetite **S**;
bug fix + reversible catalog-data correction; no new feature flag.

## Reproduction and root cause

### Six image-less shop listings

The live Store API confirms `images: []` and `price_cents: null` for Piezas Únicas, Selección
Marsella, XOLO Vintage, Erre Vintage, Roma Vintage, and Goodbye Folk. They are generic
“Explora…” shop entries rather than concrete products, so inventing one product price would be
misleading. The existing authenticated `/api/supply/upload` and `/api/supply/listing-images`
`mode: replace` routes are the correct write path. Two or three attributable photos have been
located and visually checked for every shop (17 total); the resulting listing URLs must be first-party
R2 URLs rather than new hotlinks.

### Admin Selección and homepage disagree

Live reproduction on 2026-08-21:

- `/admin/seleccion` exposes only the freshest 50 candidates and reports 5 pinned entries.
- `GET /store/listings?featured=true` returns 28 pins. The other 23 are older than that candidate
  window, so the admin cannot display, reorder, or unpin them.
- The homepage correctly unions the explicit featured fetch into its freshest pool, so it renders
  those hidden old pins. Several stored `featured_rank` values are duplicated, compounding the
  apparent order mismatch.

This is the admin-side mirror of the shipped `seleccion-pins-authoritative` lesson: an authoritative
explicit subset must be unioned into a freshest-N pool. The backend featured filter and homepage
union are working; the admin candidate read never adopted the same rule.

### “Recién llegado” transient

No image failure reproduces for these six listings. The live page has no console error and renders no
`img` for them: the server checks `listing.images?.[0]` and emits the package empty-state in the static
HTML when absent. Real images in this below-the-fold rail are intentionally lazy-loaded, so a brief
blank while a real image decodes can be expected; a browser broken-image glyph is not. With no failed
URL, state transition, or reproducible request, there is no evidence-backed code patch in scope.

## Reuse-first scope

1. Upload the 17 verified files through `/api/supply/upload`, then replace each listing's image array
   through `/api/supply/listing-images`; verify Medusa and the Supabase mirror expose 2–3 R2 images.
2. Change the admin candidate pool to union freshest candidates with every `featured=true` listing,
   deduped by id and degraded per fetch, matching the existing homepage seam.
3. Add a deterministic regression spec: a pin outside the freshest candidate window remains visible
   to admin; reorder normalizes the complete pin set to unique contiguous ranks.
4. After deployment, remove the unwanted hidden pins and normalize ranks only after the product owner
   confirms which visible set is authoritative. Recommended default: preserve the five entries now
   visible under “Fijados” and unpin the 23 hidden older entries.
5. Make no “Recién llegado” code change without a captured failing URL or reproducible first-paint
   transition. The newly attached R2 images remove the empty state for the six named records anyway.

## Acceptance and QA

- Each named listing has 2–3 durable R2 images with shop-specific alt text; no source hotlinks remain.
- `/admin/seleccion` exposes all pins the homepage can consume, including pins outside the newest-50.
- The chosen pin set appears in the same rank order on admin and homepage; stored ranks are unique and
  contiguous.
- A deliberate implementation mutation makes the new admin-pool regression spec fail once before the
  final green gate.
- Frontend typecheck/build and the relevant specs pass; authenticated local or preview admin smoke and
  live homepage smoke verify the rendered result.

## Out of scope

Fabricated prices for generic shop entries; redesigning the homepage cards; a new image-loading system;
backend/schema/migration changes; automatic pin deletion without product-owner confirmation.

## Approval gate

Approve this scope and confirm whether the recommended cleanup is correct: keep the five pins currently
visible in admin and unpin the other 23 hidden old pins.
