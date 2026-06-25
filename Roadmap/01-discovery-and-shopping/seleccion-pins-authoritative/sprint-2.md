# Sprint 2 — Pins render regardless of freshness

**Epic:** [Selección — make admin pins authoritative](README.md) · **Risk:** MED (backend read-filter) · **Repos:** `apps/backend` + `apps/miyagisanchez`.
**Branch:** continue `feat/seleccion-pins-authoritative`. **Deploy order: merge backend (S2.1) first**, verify, then the frontend union (S2.2).

Fixes the "nothing renders underneath" case (2026-06-25): pins older than the freshest-24 pool can't reach the
homepage today. Make the homepage read pins from Medusa explicitly and union them into the curated pool.

---

## S2.0 — Pre-flight · (no risk, investigation)

Before building, confirm and record in this doc:
- The exact filter convention in `apps/backend/src/api/store/listings/route.ts` (the `q.brand` / `q.year_from` /
  `q.transmission` block) — mirror it for `q.featured`.
- That `metadata.featured` (boolean) + `metadata.featured_rank` (number) survive `toListingShape` round-trip as
  real types (so `isPinned` / `featuredRank` keep working on the unioned items). *(Backend write already stores real
  types — confirm the read shape.)*
- The cleanest union point on the frontend: inside `getCuratedPool` (one place feeds both featured + grid) vs a
  sibling `getPinnedListings()` merged in the wrappers. Decide and note it.

## S2.1 — Backend `/store/listings?featured=true` read-filter · MED

**As the** homepage, **I want** to fetch only pinned products from Medusa, **so that** a pin renders no matter how
old it is.

- Add `if (q.featured === 'true') listings = listings.filter(l => l.metadata?.featured === true)` to the filter
  block in `apps/backend/src/api/store/listings/route.ts`, mirroring the existing metadata filters. Additive —
  absent param = today's behaviour, byte-for-byte.

**Acceptance:** `GET /store/listings?featured=true` returns only products with `metadata.featured === true`; without
the param the response is unchanged.

**QA:** a backend api spec / curl check — `?featured=true` returns only pins; absent param unchanged. **MED** (shared
catalog route) — reviewer may auto-merge on green CI, or Daniel merges.

## S2.2 — Frontend unions pins into the pool · LOW

**As an** admin, **I want** my pin shown even if the product is older than the freshest listings, **so that** my
hand-curation always wins.

- `lib/listings.ts`: fetch `?featured=true` (cached, tag `listings`, a sane `limit`) and **union** (dedupe by `id`)
  into `getCuratedPool` before `pickFeatured` / `curateGrid` run. The per-window shuffle still only touches the
  **unpinned** remainder, so pins stay fixed and the page stays static.
- Degrade gracefully: if the `featured=true` fetch fails or returns nothing (e.g. backend not yet deployed), fall
  back to today's freshest-24 pool — never throw (the homepage prerenders at build).

**Acceptance:** pin a product that is **not** among the ~24 newest → within ~1 min it appears as the Destacado (if
rank 1) and in the grid (by rank). Editing the pin still reflects within the ISR window.

**QA:** extend the curation spec for the union (a pinned old listing is present in the pool → becomes Destacado /
leads the grid); smoke per the walkthrough. The old-pin path is **owed to Daniel** (needs admin session + real data).

---

## Sprint 2 — QA

Deterministic gate: backend `tsc`/build + the `featured=true` spec; frontend `tsc` + `next build` (keep `○ /`) +
`npm run test:e2e`. Cross-repo: **backend green + deployed before** the frontend merges.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com (backend on Cloud Run). **Admin steps owed to Daniel.**

1. (backend) After the backend deploys, hit `https://<backend-host>/store/listings?featured=true` (with the
   publishable-key header).
   → JSON returns **only** pinned products; a call without `?featured=true` returns the full freshest list.
2. Sign in as admin → https://miyagisanchez.com/admin/seleccion → pin a product you know is **old** (far down the
   Candidatos list), set it rank 1.
   → It sits at rank 1, badged **Destacado**, in admin.
3. Wait ~1 min → open https://miyagisanchez.com in a private window.
   → The old product is now the big **Destacado** card. *(Pre-S2 it would have been skipped.)*
4. Pin a second old product at rank 2, reload after ~1 min.
   → It appears directly under the Destacado, in rank order.
5. Unpin both, reload.
   → The Selección returns to the freshest auto-curated set — no stale pin lingers.

If any step fails, note the step number + what you saw — that's the bug report.
