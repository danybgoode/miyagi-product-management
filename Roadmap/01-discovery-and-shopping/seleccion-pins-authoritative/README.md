---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: seleccion-pins-authoritative
---

# Epic — Selección: make admin pins authoritative

**Macro-section:** 01 · Discovery & Shopping.
**Class:** Follow-up **bug fix + light enhancement** on the shipped `homepage-seleccion-curation` epic.
**Scope doc:** [`Roadmap/00-ideas/2. readyforscope/seleccion-pins-authoritative.md`](../../00-ideas/2.%20readyforscope/seleccion-pins-authoritative.md) — **APPROVED 2026-06-23/25**.

## Why

The admin `/admin/seleccion` screen promises *"el de menor orden es el Destacado."* In testing it doesn't hold:
the homepage Destacado is the lowest-rank **priced** pin, not the lowest-rank pin — and when the rank-1 pin *is*
priced and recent, **nothing renders underneath it**. Two gaps in the read/curation path, both making the admin's
hand-curation non-authoritative:

1. A pin overrides the 14-day freshness cutoff but **not** the price gate, so every "Sin precio" pin (events /
   agenda / art) is silently dropped — the Destacado jumps to the first priced pin.
2. The homepage builds the whole Selección from the **freshest 24** listings, but the admin pins from the freshest
   **50** — so a pinned product older than the 24-newest window can't render (Destacado *or* grid). Observed
   2026-06-25: 5 priced pins, Destacado correct, grid empty (pins 2–5 outside the pool).

Daniel is configuring it correctly. These are half-built promises in `lib/home-curation.ts` + the curation pool.

## Context

| | |
|---|---|
| **What it is** | Pins become authoritative: shown regardless of price (S1.1) and regardless of freshness (S2), and the grid grows to show all of them (S1.2). |
| **Repos touched** | `apps/miyagisanchez` (S1 + S2.2). `apps/backend` for the S2.1 `/store/listings?featured=true` read-filter. |
| **Output** | Lowest-rank pin is always the Destacado · every pin renders under it in rank order · auto-curation fills only leftover slots. |
| **SSOT** | `lib/home-curation.ts` (`isQualifying`, `curateGrid`, `pickFeatured`) · `lib/listings.ts` (`getCuratedPool`) · `apps/backend/src/api/store/listings/route.ts` (the new `featured` filter). |

## Decisions (grooming, 2026-06-25)

1. **Pins override the price gate only** — a pin always shows regardless of price, but still must be
   active/published with **≥1 image** (no broken Destacado).
2. **Pins render regardless of freshness** — add a Medusa `featured=true` read-filter and union the pinned set
   into the curated pool. (Promoted from "deferred" — Daniel is hitting it.)
3. **Grid grows to all pins** — Destacado + every remaining qualifying pin in `featured_rank` order, then auto-fill
   to a minimum of `GRID_SIZE`, **capped at 11** grid cards (Destacado + grid ≤ 12) as a runaway guard.
4. **Packaging:** S1 (frontend pure-logic) ships first as the quick win; S2 (backend filter + frontend union)
   follows, **backend merged first**.

## Medusa-first note (AGENTS five-rule check)

- **Rule 1 (Medusa owns commerce):** the pin stays Medusa product metadata (`metadata.featured` /
  `metadata.featured_rank`) — **no write change**. S2.1 adds a *read* filter to the existing Medusa store route
  `/store/listings`, mirroring its brand/year/transmission metadata-filter pattern. Frontend reads pins from
  Medusa, never Supabase.
- **Rule 2 (Supabase):** untouched. **Rule 3 (UCP/MCP):** `featured` already flows through catalog metadata.
  **Rule 4 (Clerk):** untouched. **Rule 5 (es-MX):** no new copy; cards already render "Sin precio".

## What already exists (reuse, don't rebuild)

- **`lib/home-curation.ts`** — `isQualifying`, `isPinned`, `pickFeatured`, `curateGrid`, `byPinnedThenFresh`,
  `featuredRank`. S1 is a few lines here. Next-free seam → free pure-logic coverage.
- **`e2e/home-curation.spec.ts`** — already covers *"a PINNED listing qualifies past the 14-day cutoff"* and
  *"no image or no price disqualifies"*; extend for the pinned-no-price-qualifies split + grow-to-all-pins.
- **`lib/listings.ts`** — `getCuratedPool` (one cached fetch, `limit=24`, tag `listings`), `getFeaturedListing`,
  `getCuratedListings`. The grid-size change + the union land here.
- **`apps/backend/src/api/store/listings/route.ts`** — the existing metadata-filter block (`q.brand`, `q.year_*`,
  `q.transmission`, …) is the exact pattern S2.1 mirrors for `q.featured`.
- **The Destacado / grid card components** already render `price_cents == null` as **"Sin precio" / "Precio a
  consultar"** — no UI change for priceless cards.

## Scope — sprints, stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **[S1](sprint-1.md)** | S1.1 Pins authoritative over price (`isQualifying` exempts pins from `hasPrice`; keep image+active) | LOW |
| **[S1](sprint-1.md)** | S1.2 Grid grows to all qualifying pins + auto-fill, capped at 11 | LOW |
| **[S2](sprint-2.md)** | S2.0 Pre-flight: confirm `/store/listings` filter shape + metadata round-trip | — |
| **[S2](sprint-2.md)** | S2.1 Backend `/store/listings?featured=true` read-filter | MED |
| **[S2](sprint-2.md)** | S2.2 Frontend unions pinned set into the curated pool | LOW |

> **Out of scope:** the admin candidate **search box** (widening what's *pinnable* past freshest-50) · per-visitor
> shuffle · admin "won't show" warnings · any write-path/metadata change · unpinned price/image gates.

## Deploy order & dependencies

- Branch `feat/seleccion-pins-authoritative` off latest `main`.
- **S1 first** — frontend-only, LOW, independently shippable (fixes the price-gate Destacado bug immediately for
  pins inside the freshest-24 pool). Keep `next build` emitting `○ /`.
- **S2 after S1.** **Merge backend (S2.1) first** (Cloud Run ~12 min, no preview), verify `?featured=true`, then
  merge the frontend union (S2.2). Frontend degrades gracefully (falls back to freshest-24) if the filter lags.
- **Risk tiers:** S2.1 is **MED** (shared catalog route, additive read-filter); everything else LOW. No
  payments/checkout/fulfillment/auth/DB-migration.

## Definition of Done (epic)

- [ ] The lowest-rank pin is **always** the Destacado, regardless of price. (S1.1, `home-curation.spec.ts`)
- [ ] Every qualifying pin renders under the Destacado in `featured_rank` order; auto-curation fills only leftover
      slots; grid capped at 11. (S1.2)
- [ ] A pin **older than the freshest-24** still renders (Destacado + grid); `/store/listings?featured=true`
      returns only pins; frontend unions + still busts on `listings`. (S2.1/S2.2)
- [ ] `next build` keeps `/` at `○` (static shell) across all stories.
- [ ] Each `sprint-N.md` has its smoke walkthrough; admin pin/reorder → homepage steps flagged **owed to Daniel**.
- [ ] This `README.md` marked ✅ (`status: shipped`); `RETROSPECTIVE.md` written; durable learnings promoted to
      `Roadmap/LEARNINGS.md`; poster (`Roadmap/README.md`) + `BUILD-ORDER.md` updated.
- [ ] Kill-switch check: none expected (additive read path, no money/auth) — confirm at close.
