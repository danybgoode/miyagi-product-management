# Sprint 2 — Pins render regardless of freshness

**Epic:** [Selección — make admin pins authoritative](README.md) · **Risk:** MED (backend read-filter) · **Repos:** `apps/backend` + `apps/miyagisanchez`.
**Branch:** continue `feat/seleccion-pins-authoritative`. **Deploy order: merge backend (S2.1) first**, verify, then the frontend union (S2.2).

Fixes the "nothing renders underneath" case (2026-06-25): pins older than the freshest-24 pool can't reach the
homepage today. Make the homepage read pins from Medusa explicitly and union them into the curated pool.

---

## S2.0 — Pre-flight · (no risk, investigation) — ✅ recorded 2026-06-25

1. **Filter convention** (`apps/backend/src/api/store/listings/route.ts`, Step 4): a flat sequence of
   `if (q.X) listings = listings.filter((l) => …l.metadata?.X…)` one-liners (`q.brand`, `q.transmission`,
   `q.year_from`, …) over the already-`toListingShape`d listings. S2.1 mirrors this with one new line.
2. **Metadata round-trip confirmed:** `toListingShape` (`_utils/listing.ts`) sets `metadata: meta` — the raw
   product metadata, untouched. So `metadata.featured` (boolean) + `metadata.featured_rank` (number) survive
   as real types; the frontend `isPinned` (`=== true`) and `featuredRank` (`typeof r === 'number'`) keep
   working on the unioned items.
3. **Union point chosen:** inside `getCuratedPool` (`lib/listings.ts`) — the single cached fetch that already
   feeds both `getFeaturedListing` and `getCuratedListings`, so the union lands in one place and both stay
   consistent. (Chosen over a sibling `getPinnedListings()` merged into each wrapper.)

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

> **✅ SHIPPED — PR [medusa-bonsai-backend#40](https://github.com/danybgoode/medusa-bonsai-backend/pull/40) squash `aaab981`.**
> Pure `isFeaturedPin` predicate in `_utils/listing.ts` (strict `metadata.featured === true`, mirrors the frontend
> `isPinned`) + the one-line `if (q.featured === 'true') listings = listings.filter(isFeaturedPin)` in the route +
> DB-free `featured-filter.unit.spec.ts`. Gate green: `npm run build` + `npx tsc --noEmit` + `npm run test:unit`
> (36 tests). Cross-review (codex) flagged one "blocking" item — **declined with rationale** (the route fetches
> *all* published products `take:2000` at Step 1, filters at Step 4, paginates at Step 6, so no pin is paginated
> off; the `take:2000` ceiling is a pre-existing route-wide limit, unchanged). **Deployed live** to Cloud Run
> revision `medusa-web-00112-2tc` (100% traffic) **before** S2.2 merged.

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

> **✅ SHIPPED — PR [miyagisanchezcommerce#126](https://github.com/danybgoode/miyagisanchezcommerce/pull/126) squash `8c4b6a7`.**
> Pure `unionById` in the next-free `lib/home-curation.ts` seam; `getCuratedPool` fetches freshest-24 +
> `?featured=true&limit=50` in parallel and unions (dedupe by `id`). `home-curation.spec.ts` gained a
> `pool union (S2.2)` describe (dedupe/non-mutating, graceful empty-fetch, old-pin-becomes-Destacado bridge) — 37
> `api` tests. Gate green: `tsc` + `next build` (**`/` stays `○`**, 1m revalidate) + `playwright … home-curation`.
> Cross-review (codex) caught a **real should-fix** — applied (`4bb484e`): `fetchListings` now degrades on a
> *throw* (network reject / malformed JSON, the deploy-lag case), not just `!res.ok`, so `Promise.all` can't reject
> the pool and the static build truly never throws. CI's "Playwright vs preview" first went red on the **sibling**
> `seller-acquisition-seo.spec.ts` (PR #125's `/vende` persona metadata landed on `main` after this branch's
> preview was built — a structural cross-branch mismatch, not this diff); cleared by `git merge origin/main` + push
> (rebuilding the preview). Green → merged.

---

## Sprint 2 — QA

Deterministic gate: backend `tsc`/build + the `featured=true` spec; frontend `tsc` + `next build` (keep `○ /`) +
`npm run test:e2e`. Cross-repo: **backend green + deployed before** the frontend merges.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com (backend on Cloud Run). **Admin steps owed to Daniel.**

1. (backend) ✅ deployed — hit `https://medusa-web-oehqqtyoia-uk.a.run.app/store/listings?featured=true` with the
   `x-publishable-api-key` header (prod publishable key, public — in the storefront bundle / Vercel env).
   → JSON returns **only** pinned products; a call without `?featured=true` returns the full freshest list.
   *(Authenticated curl + the admin pin steps below are owed to Daniel — the agent has no prod key/admin session.)*
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
