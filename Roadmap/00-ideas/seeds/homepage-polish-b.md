---
title: "Homepage Polish — Dirección B «Catálogo limpio»"
slug: homepage-polish-b
status: shipped
area: "01"
type: feature
priority: null
risk: low
epic: "01-discovery-and-shopping/homepage-polish-b"
build_order: null
updated: 2026-06-13
---

# Scope — Homepage Polish, Dirección B «Catálogo limpio» (domain 01)

> **Status: ✅ SIGNED OFF (Daniel, 2026-06-12).** Gate passed; scaffolded under
> `01-discovery-and-shopping/homepage-polish-b/` (README + sprint-1…4 + RETROSPECTIVE); kickoff prompts
> emitted. Groomed 2026-06-12 in Cowork from a design audit run on
> `claude.ai/design` against the marketplace homepage; the handoff (`handoff/HANDOFF.md`) ships a
> signed-off redesign + the visual source of truth (`handoff/mockups-directions.html`, "Dirección B"
> frames) + the reasoning (`handoff/audit.html`). Re-validated this pass against **`origin/main`** of the
> app repo (every finding below was re-read from `origin/main`).
>
> **Class:** Feature → epic (domain 01 — Discovery & Shopping). **Stage-2.5 bucket:** a mix —
> the homepage *rebuild* is **genuinely new** layout work, but several modules are **light enhancements
> over data/features that already ship** (favorites, offers, neighborhood pulse, listing cards, the full
> design-token system). No net-new commerce primitive. **Risk: LOW overall** (presentational, read-only
> discovery) with two surfaces to announce (shared `layout.tsx`, site-wide `lib/types.ts`) and **one HIGH
> story** (a Supabase migration in S4 → Daniel merges).

## The ask (mirrored back)
*You want to replace the current homepage — category chips + a Vecindario banner + a recency dump — with
the Dirección B module stack: one page, two states. **Signed-out** orients in a line, merchandises
immediately (curated "Selección", live categories), recruits sellers, and ends on a CTA. **Signed-in**
recognises the user — a "Retoma donde te quedaste" rail and an actionable offer alert replace the ribbon.
Plus a site-wide switch from emoji to a single Iconoir icon language. All built by reusing existing data
and design tokens, es-MX only, matching the signed-off mockup. Right?*

## Daniel's decisions this groom (2026-06-12)
1. **Vecindario (Module 6) is IN, as a light enhancement — not a new build.** The audit assumed
   `/vecindario` + a pulse source as if greenfield; in fact the **Neighborhood Pulse feature is already
   live on `origin/main`** (`app/vecindario/page.tsx`, `lib/neighborhood-pulse.ts` with
   `isNeighborhoodPulseSocialItem` + `NEIGHBORHOOD_PULSE_COPY`, `lib/neighborhood-rank.ts`, passing e2e).
   The homepage already renders the `/vecindario` entry with `data-testid="vecindario-feed-entry"`. So
   the slice is: **swap the static banner for a live strip over the same approved pulse source**, keep
   the testid, keep the current banner as the empty fallback.
2. **Signed-in modules ship in v1; the price-drop badge is deferred.** Build the retoma rail, the
   pending-offer alert, and the seller snapshot — but ship the rail **without** the `↓ Bajó $X` badge.
   Add the `price_cents_at_save` Supabase column (+ backfill-on-next-favorite) as **its own story** so
   the data starts accruing and the badge is a cheap follow-up once values exist.
3. **The ribbon's "Cómo funciona" link points to `/acerca`** (both `/acerca` and `/vende` exist on
   `origin/main`; `/acerca` is the natural buyer-facing "how it works" destination).
4. **Cowork-first is the way going forward.** This audit → groom in Cowork → approved scope → scaffold →
   per-sprint Claude Code kickoffs is our documented loop ("Planning in Cowork; building in Claude Code").
   The handoff's paste-prompt would have had Claude Code self-plan, skipping this gate — and would have
   hit the stale-branch reality gap mid-build. Route every audit through groom.

## Docs drift flagged this groom (separate ask — fix in a short doc-closeout pass)
The Neighborhood Pulse epic **shipped to `main` but its close-out was never finished** — same pattern
LEARNINGS records from the #6 epic ("a merged build with stale docs taxes the next groom"; it taxed this
one). To reconcile, *not part of this epic*:
- `01-discovery-and-shopping/neighborhood-pulse/README.md` — DoD checklist still all `- [ ]`, README not
  marked ✅, no sprint commit refs.
- `seeds/neighborhood-pulse.md` frontmatter `status: scaffolded` → should be `shipped`.
- Macro `01-discovery-and-shopping/README.md` doesn't list the epic; community discovery still reads as backlog.
- Main poster `Roadmap/README.md` has no feature-map / highlights line for it (only an incidental nav-reorg mention).
- `00-ideas/BUILD-ORDER.md` never mentions it.
- `socialnextdoorbutnotquite.md` still sits in `2. readyforscope/` though its v1 slice shipped.

## What already exists — reuse, don't rebuild (Medusa-first reframe, read from `origin/main`)
- **Commerce reads stay on the Medusa Store API via `lib/listings.ts`** (AGENTS rule #1). Present:
  `searchListings`, `countListings`, `getRecentListings`, `formatPrice`, `conditionLabel`, `getShop(slug)`
  + `getShopListings` (both `unstable_cache`'d, `/store/sellers/*`). **New helpers only:**
  `getCuratedListings(n)`, `getFeaturedListing()`, `getCategoryCounts()` — and `getCategoryCounts` can
  build on the existing `countListings` + the `unstable_cache` revalidate pattern for the ~5-min cache.
- **Non-commerce reads stay on Supabase** (AGENTS rule #2): `marketplace_favorites` (already joined on the
  current `app/page.tsx`), `marketplace_offers` (`lib/offer-state.ts`, `lib/active-deal.ts`), and the
  neighborhood-pulse source. Migrations live in `apps/miyagisanchez/supabase/*.sql` — the new
  `price_cents_at_save` column is an **additive, non-commerce** migration there.
- **Vecindario strip:** reuse `isNeighborhoodPulseSocialItem` + `NEIGHBORHOOD_PULSE_COPY`
  (`lib/neighborhood-pulse.ts`), same approved/web-visible source as `/vecindario`. Keep `vecindario-feed-entry`.
- **Header (`app/layout.tsx`):** already has the signed-out `/vende` destination (today a bare
  `iconoir-plus-circle`, line ~260) and the `AIAgentButton` (incl. `variant="affordance"`, line ~357), and
  the `.btn btn-primary btn-sm` pill pattern (lines ~380/404). A4 = relabel to a "Vende" pill; B4 = add the
  in-search `iconoir-sparks` affordance reusing the same agent surface.
- **Cards/tokens:** `FavoriteButton`, `CategoryChips`, and the full token system (`card-tile`, `chip`,
  `badge`, `t-price`, `btn-primary`, Iconoir via CDN) are live (design-system v2). **Prefer existing
  tokens/classes over any new CSS.**
- **Icon migration target:** `CATEGORIES[].icon` in `lib/types.ts` is still emoji; renderers are
  `CategoryChips.tsx` + listing filters. The mapping + the verified-glyph notes are in `handoff/HANDOFF.md` §3.
- **Architecture:** single `app/page.tsx`, server-rendered, `currentUser()` (Clerk) branching; extract
  `app/components/home/*` per module. es-MX only — homepage is **not** on the bilingual allow-list (rule #5).
  UCP: the new read helpers must stay consistent with `/api/ucp/catalog`'s normalized data — no divergence.

## Scope — stories by sprint
Skateboard → car. Each story is independently shippable, type-checked, built, and Playwright-smoked; pure
helpers get a free `lib/`-seam spec.

| Sprint | Story | Risk | QA stage |
|---|---|---|---|
| **S1 · Icon language migration** *(ship first, independent)* | S1.1 `CATEGORIES` emoji → Iconoir in `lib/types.ts` + update renderers (`CategoryChips`, filters, any `cat.icon`); ✓ glyphs → `iconoir-badge-check`; sweep + replace remaining buyer-surface emoji | LOW *(cross-cutting `lib/types.ts` — announce per LEARNINGS)* | `api` spec: no emoji in `CATEGORIES`/home SSR; anon browser smoke |
| **S2 · Signed-out merchandising core** | S2.1 `getCuratedListings`/`getFeaturedListing` + curation rule (image+price, fresh-first, 14-day, `metadata.featured` pin) + featured card + 4-grid hierarchy (price loudest) + <48h timestamp gating | LOW | pure-logic spec on curation seam; `api` spec; anon browser smoke (price loudest, no >48h, heart overlay) |
| | S2.2 `getCategoryCounts` (over `countListings`, ~5-min cache) + Categorías list module (only categories ≥1 active listing, live counts) | LOW | pure-logic spec on count/filter seam; anon browser smoke (empty categories absent) |
| **S3 · Chrome & community** | S3.1 Value-prop ribbon (signed-out only) → "Cómo funciona" `/acerca` | LOW | `api` spec: ribbon present signed-out, absent signed-in (SSR) |
| | S3.2 Header: labeled "Vende" pill (→`/vende`) + in-search `iconoir-sparks` agent affordance (reuse `AIAgentButton`) | LOW *(shared `layout.tsx` — announce)* | anon browser smoke (pill + sparks render) |
| | S3.3 Terminal CTA + footer visible on mobile + empty-marketplace CTAs | LOW | `api` spec: footer links in mobile SSR |
| | S3.4 Vecindario **live strip** — 1–2 real approved pulse items (reuse `isNeighborhoodPulseSocialItem`/`NEIGHBORHOOD_PULSE_COPY`); keep `vecindario-feed-entry`; current banner = empty fallback | LOW | `api` spec: `vecindario-feed-entry` intact; anon browser smoke |
| **S4 · Signed-in modules** | S4.1 "Retoma donde te quedaste" rail — newest 3 from `marketplace_favorites` joined to listings; **no price-drop badge** | LOW | anon-skip browser smoke (authed, owed to Daniel) |
| | S4.2 Pending-offer alert — `marketplace_offers` where buyer + pending (and seller-side if shop); render nothing when not actionable; max 2 | LOW | authed browser smoke (owed to Daniel) |
| | S4.3 Seller snapshot — swap seller block to a "Tu tienda esta semana" snapshot when the user has a shop (reuse `getShop`) | LOW | authed browser smoke (owed to Daniel) |
| | S4.4 `price_cents_at_save` column (Supabase migration) + backfill-on-next-favorite — data only, badge deferred | **HIGH** *(DB migration → Daniel merges)* | migration applied + verified; no UI change |

## In v1 / Out of v1
**In:** the full Dirección B module stack (signed-out + signed-in), the Iconoir migration, the Vecindario
live-strip enhancement, the `price_cents_at_save` column (data only). Fixes audit findings A1–A6, B1–B4,
C1–C3.
**Out (deferred):** the rendered `↓ Bajó $X` price-drop badge (ships once the column has values);
recently-viewed via `localStorage` (optional, can be a fast-follow story); any change to the
`/vecindario` feed page itself; the `mascotas` icon stays provisional (`fish`) per the handoff's verified
Iconoir set.

## Acceptance criteria (Daniel-testable)
- Price is the loudest element on every listing card (16px+ semibold accent); max ONE meta line per grid card.
- No emoji anywhere on the homepage — a single Iconoir language; ✓ glyphs replaced.
- No timestamps older than 48h on home; empty categories never render; counts accurate.
- Signed-out: ribbon visible (→`/acerca`), no personalization. Signed-in: ribbon gone, retoma rail first;
  offer alert appears only when actionable.
- Footer + terminal CTA visible in a mobile browser (not just the PWA tab bar).
- Dark mode + calm mode render correctly (tokens only, no hardcoded hex — the raw-color guard stays green).
- `vecindario-feed-entry` testid still present; the live strip shows real approved pulse items, falling
  back to the current banner when none.

## Open risks
- **Shared-surface stories** (S1.1 `lib/types.ts`, S3.2 `layout.tsx`) can break sibling PRs — announce per
  LEARNINGS "announce cross-cutting changes"; merge latest `main` before opening the PR.
- **S4.4 is the only HIGH** (DB migration) → Daniel merges; FE reads must degrade gracefully (`?? []`) so
  the rail ships before/independent of the column existing.
- **Curation cold-start:** `metadata.featured` pinning is a new admin convention; until an admin pins,
  featured = newest qualifying listing (handoff §2.5) — confirm an admin can set product metadata.
- Claude Code must branch `feat/homepage-polish-b` off the latest **`origin/main`**, not whatever branch
  happens to be checked out.

## References
- Handoff spec: `handoff/HANDOFF.md` · visual source of truth: `handoff/mockups-directions.html` (Dirección
  B, signed-out + signed-in) · reasoning: `handoff/audit.html`.
- Sibling completed epic (house format + token discipline): `01-discovery-and-shopping/discovery-polish/`.
