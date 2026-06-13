# Epic: Homepage Polish — Dirección B «Catálogo limpio»

> **Macro-section:** [01 · Discovery & Shopping](../README.md) · **Risk: LOW overall** (presentational,
> read-only discovery) with **one HIGH story** (S4.4 Supabase migration → Daniel merges) and two
> shared-surface stories to announce (S1.1 `lib/types.ts`, S3.2 `layout.tsx`).
> **Status: 🏗️ IN PROGRESS — S1 ✅ shipped (PR #84 `14fd880`); S2 🏗️ built (draft PR #85 `2a38f93`, gate green); S3–S4 pending.** Signed off by Daniel 2026-06-12. Scope doc / gate:
> [`00-ideas/seeds/homepage-polish-b.md`](../../00-ideas/seeds/homepage-polish-b.md). Visual source of
> truth: `handoff/mockups-directions.html` (Dirección B). Spec: `handoff/HANDOFF.md`. Reasoning:
> `handoff/audit.html`. Validated against app **`origin/main`** (working tree is on a stale `feat/inventory`).

## Why
The current homepage is category chips + a Vecindario banner + a recency dump. Dirección B replaces it
with a purposeful module stack that orients, merchandises, and converts — one page, two states.
**Signed-out:** orient in a line, surface a curated "Selección" and live categories, recruit sellers, end
on a CTA. **Signed-in:** recognise the user — a "Retoma donde te quedaste" rail and an actionable offer
alert lead instead of the ribbon. Plus a site-wide switch from emoji to a single Iconoir icon language.
Closes audit findings A1–A6, B1–B4, C1–C3.

## Context

| Question | Answer |
|---|---|
| **Who** | Buyers on the marketplace homepage (web + PWA), signed-out and signed-in; sellers recruited via the CTA |
| **Job** | Land, understand the place in one line, see something worth buying immediately, and (signed-in) pick up where they left off |
| **Outcome signal** | Signed-out: ribbon + curated grid + live categories, price is the loudest thing, no emoji, no >48h timestamps. Signed-in: ribbon gone, retoma rail first, offer alert only when actionable |
| **In v1** | Full Dirección B stack (both states) · Iconoir migration · Vecindario live-strip enhancement · `price_cents_at_save` column (data only) |
| **Out (deferred)** | Rendered `↓ Bajó $X` price-drop badge (until the column has values) · recently-viewed `localStorage` rail · changes to the `/vecindario` feed page itself · `mascotas` icon stays provisional (`fish`) |
| **Risk tier** | LOW overall; S4.4 HIGH (DB migration); flag S1.1 + S3.2 as shared-surface |

## Medusa-first note
No new commerce model. All listing/category/seller reads stay on the **Medusa Store API via
`lib/listings.ts`** (AGENTS rule #1) — the only net-new code is three read helpers (`getCuratedListings`,
`getFeaturedListing`, `getCategoryCounts`), and `getCategoryCounts` builds on the existing `countListings`
+ `unstable_cache` pattern. Favorites / offers / neighborhood-pulse stay on **Supabase** (rule #2); the
`price_cents_at_save` column is an additive non-commerce migration. es-MX only — the homepage is **not** on
the bilingual allow-list (rule #5). The new read helpers must read the same normalized data UCP's
`/api/ucp/catalog` exposes — no divergence (rule #3). Clerk `currentUser()` branching only (rule #4).

## What already exists (reuse, don't rebuild)
- **`lib/listings.ts`** (Medusa) — `searchListings`, `countListings`, `getRecentListings`, `formatPrice`,
  `conditionLabel`, `getShop(slug)` + `getShopListings` (both `unstable_cache`'d, `/store/sellers/*`). Add
  only `getCuratedListings(n)`, `getFeaturedListing()`, `getCategoryCounts()`.
- **Supabase** — `marketplace_favorites` (already joined on the current `app/page.tsx`), `marketplace_offers`
  (`lib/offer-state.ts`, `lib/active-deal.ts`). Migrations live in `apps/miyagisanchez/supabase/*.sql`.
- **Neighborhood pulse (LIVE on `main`)** — `isNeighborhoodPulseSocialItem` + `NEIGHBORHOOD_PULSE_COPY`
  (`lib/neighborhood-pulse.ts`), same approved/web-visible source as `/vecindario`. Keep
  `data-testid="vecindario-feed-entry"`.
- **Header (`app/layout.tsx`)** — existing signed-out `/vende` destination (bare `iconoir-plus-circle` today),
  `AIAgentButton` (incl. `variant="affordance"`), `.btn btn-primary btn-sm` pill pattern.
- **Cards / tokens** — `FavoriteButton`, `CategoryChips`, design-system v2 tokens (`card-tile`, `chip`,
  `badge`, `t-price`, `btn-primary`, Iconoir via CDN). Prefer existing tokens over new CSS.
- **Icon migration target** — `CATEGORIES[].icon` emoji in `lib/types.ts`; renderers `CategoryChips.tsx` +
  filters; mapping + verified-glyph notes in `handoff/HANDOFF.md` §3.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · Icon language migration** ✅ *(PR #84 `14fd880`)* | S1.1 `CATEGORIES` emoji → Iconoir + renderers; ✓ glyphs → `iconoir-badge-check`; buyer-surface emoji swept (homepage+discovery scope) | LOW *(shared `lib/types.ts` — announced)* |
| **S2 · Signed-out merchandising core** 🏗️ *(PR #85 `2a38f93`, gate green, pending merge)* | S2.1 Curated "Selección" — `getCuratedListings`/`getFeaturedListing` + curation rule + featured card + 4-grid hierarchy (price loudest) + <48h timestamp gating | LOW |
| | S2.2 Categorías with life — `getCategoryCounts` (~5-min cache) + list module, only categories ≥1 active listing | LOW |
| **S3 · Chrome & community** | S3.1 Value-prop ribbon (signed-out only) → "Cómo funciona" `/acerca` | LOW |
| | S3.2 Header — "Vende" pill (→`/vende`) + in-search `iconoir-sparks` agent affordance (reuse `AIAgentButton`) | LOW *(shared `layout.tsx` — announce)* |
| | S3.3 Terminal CTA + footer visible on mobile + empty-marketplace CTAs | LOW |
| | S3.4 Vecindario **live strip** — real approved pulse items; keep `vecindario-feed-entry`; banner = empty fallback | LOW |
| **S4 · Signed-in modules** | S4.1 "Retoma donde te quedaste" rail (newest 3 favorites; **no badge**) | LOW |
| | S4.2 Pending-offer alert (buyer pending + seller-side; render nothing when not actionable; max 2) | LOW |
| | S4.3 Seller snapshot (swap seller block when user has a shop; reuse `getShop`) | LOW |
| | S4.4 `price_cents_at_save` column + backfill-on-next-favorite (data only; badge deferred) | **HIGH** *(DB migration → Daniel merges)* |

## Deploy order
S1–S3 are **frontend-only** (Vercel preview per branch). S4.1–S4.3 are frontend-only and must **degrade
gracefully** (`?? []`, null-safe) so they ship independent of S4.4. S4.4 is a **Supabase migration** —
apply it (additive column, non-commerce table), then backfill-on-next-favorite; no Cloud Run involved.
Branch `feat/homepage-polish-b` off the latest **`origin/main`**, not the stale working tree.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated — 01 line reflects the homepage rebuild
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted; seed frontmatter `status: shipped`
