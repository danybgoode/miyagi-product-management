# Epic — Discovery Polish

> **Macro-section:** [01 · Discovery & Shopping](../README.md) · **BUILD-ORDER:** #3c · Epic A ·
> **Risk: LOW–MED** (presentational / read-only discovery — no commerce mutation). Reviewer may
> auto-merge per story on green CI **unless** a story touches shared layout.
> **Status: 📋 PLANNED — not started.** Scaffolded 2026-06-07 from the #3c groom. Scope doc:
> [`00-ideas/seeds/remaining-audit-polish.md`](../../00-ideas/seeds/remaining-audit-polish.md).
> Driven by the #3a refresh: [`results-refresh-2026-06/01-discovery-and-shopping.md`](../../00-ideas/audits/results-refresh-2026-06/01-discovery-and-shopping.md)
> (pinned frontend `origin/main@ed447bd` / backend `origin/main@0980253`).

## Why
The #3a re-audit confirmed three discovery gaps on current `main`. The product lists five listing
types (product / service / rental / digital / subscription) but a buyer **cannot filter by type** —
`lib/listings.ts:119` normalizes `listing_type` onto every listing, yet `buildQuery`'s allow-list
(`lib/listings.ts:21-26`) omits it, so the search query never forwards a type filter and `SearchBar`
exposes no type affordance. The mobile filter is a dense inline `<select>` form, not the bottom-sheet
layer Baymard 2026 recommends. And the PDP doesn't lead with a type-appropriate decision frame (seller
trust sits below payment/fulfillment on mobile). This epic closes all three — a genuinely-needs-build
set, but with a real head-start (the data is already normalized; only the filter plumbing + UI is new).

## Context

| Question | Answer |
|---|---|
| **Who** | Buyers browsing the marketplace (web + PWA) |
| **Job** | Find the right *kind* of thing fast, filter without friction on mobile, decide on a PDP framed for the listing type |
| **Outcome signal** | A buyer can filter to "servicios" (or any type) and see only those · the mobile filter is a real apply-gated layer with a live "Ver X resultados" CTA · the PDP leads with a type-appropriate frame, seller trust above the fold on mobile |
| **In v1** | Listing-type filter (data → query → UI) · mobile filter rebuild · PDP hierarchy reorder |
| **Out (deferred, P2)** | Query-type→filter semantic mapping · embedded AI catalog assistant (today `AIAgentButton` copies a prompt to an external agent) |
| **Risk tier** | LOW–MED (no money path); flag any story that touches shared layout |

## Medusa-first note
No new tables. `listing_type` already rides Medusa product type/metadata and is already normalized
(`lib/listings.ts:119`) and exposed in UCP (`lib/ucp/schema.ts:71,212`). The work is: forward the
filter through `buildQuery` + the backend `/store/listings` query, and render UI. Bilingual es-MX for
all new strings. **Agent surface:** type is already a UCP field — keep discovery and the agent catalog
reading the same normalized `listing_type` (no divergence). Clerk untouched; Supabase untouched.

## What already exists (reuse, don't rebuild)
- **`listing_type` is already normalized** onto every listing — `lib/listings.ts:119`
  (`p.type?.value ?? meta.listing_type ?? 'product'`). The data layer is done.
- **`buildQuery` allow-list** — `lib/listings.ts:21-26` is the single place filter keys are forwarded;
  add `listing_type` there (+ the backend `/store/listings` handler must accept it).
- **`CategoryChips`** — `app/components/CategoryChips.tsx` is the existing chip-row pattern to mirror
  for a type selector.
- **`SearchBar`** — `app/l/SearchBar.tsx` (the form to rebuild for mobile) + `SearchParams`/`SortOption`
  types in `lib/types.ts`.
- **Per-type PDP primitives** — `lib/ucp/schema.ts:157,181` already branches service/rental/digital;
  reuse those signals to drive the PDP decision frame, don't invent a new type model.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · Listing-type taxonomy (filterable)** | S1.1 Forward `listing_type` through `buildQuery` + the backend `/store/listings` query | LOW–MED |
| | S1.2 Type selector in `SearchBar` (chip/segment, mirror `CategoryChips`) | LOW–MED |
| | S1.3 Listing cards render a type affordance (badge/label) | LOW |
| **S2 · Mobile filter rebuild** | S2.1 Full-screen / bottom-sheet filter layer with a sticky "Filtrar y ordenar" trigger | LOW–MED |
| | S2.2 Deliberate apply + live "Ver X resultados" count (Baymard 2026) | LOW–MED |
| **S3 · PDP hierarchy** | S3.1 Lead the PDP with a type-specific decision frame (product vs service vs rental vs digital) | LOW–MED |
| | S3.2 Lift seller trust above payment/fulfillment on mobile | LOW–MED |

## Deploy order (two repos, async)
S1.1 spans backend (`/store/listings` accepts `listing_type`) + frontend (`buildQuery` forwards it).
**Merge backend first or together**; the frontend degrades gracefully (an unrecognized filter is just
ignored server-side) across the ~12-min Cloud Run window. S2/S3 are frontend-only.

## Epic Definition of Done
- [ ] All three sprints' stories merged + smoke-tested (gaps stated).
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough (real prod URLs once deployed).
- [ ] This README ✅ complete; every sprint status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] Product poster (`Roadmap/README.md`) updated — 01 line reflects type filtering + the mobile filter layer.
- [ ] Team memory + `LEARNINGS.md` updated with any durable learning.
- [ ] Branch deleted; PR(s) merged.
