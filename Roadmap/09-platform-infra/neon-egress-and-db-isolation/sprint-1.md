# Neon egress reduction — Sprint 1: Measurement baseline + cache storefront reads

**Status:** 🏗️ In progress. Frontend (Vercel preview per PR). Risk: low–med (caching commerce reads must
respect price/stock freshness). Ship first — it establishes the egress baseline every later sprint reads against.
- Story 1.1 ✅ `scripts/neon-egress.mjs` + baseline recorded below (root `651a3fd`).
- Story 1.2 ✅ `lib/cache-policy.ts` SSOT + spec (app repo, on `feat/neon-egress-and-db-isolation`).

## Findings (Story 1.2 — VALIDATE-FIRST)
The storefront caching this sprint set out to add was **already largely in place** (prior epics:
discovery-polish, vercel-cost-reduction, homepage-polish-b):
- Every Neon-hitting storefront read in `lib/listings.ts` already flows through `unstable_cache` /
  `next:{revalidate}` (getListing 60s, getShop 120s, search/count 30s, curated/recent 60s, category 300s).
  These windows were **scattered magic numbers** → consolidated into one documented SSOT `lib/cache-policy.ts`
  (windows + a `storefrontCacheControl()` builder), behaviour-preserving. A spec pins them from drifting.
- The bot/agent read routes (`/api/ucp/catalog`, `/api/embed/shop`) were **already CDN-cached** (`s-maxage`);
  they now build that header from the same SSOT (dedupe).
- **Page-HTML edge caching of the homepage + shop is NOT reachable as-is** — both render dynamically because
  they personalize: `app/page.tsx` calls `currentUser()` (signed-in modules), `app/s/[slug]/page.tsx` reads
  `headers()` for custom-domain detection. A no-op `export const revalidate` would not make them static. The
  honest lever today is the **function-level cache** (already shielding Neon). **Follow-up (deferred):** split
  the signed-out shell static + hydrate personalization in a client island to make the bot/crawler homepage
  path edge-cacheable — a real but larger refactor, out of this sprint's low–med tier.
- **Net:** S1's frontend egress effect is expected to be **marginal** — the reads were already cached. The
  dominant cause (backend `minScale:1` cross-cloud loop) is **S2**. S1's durable value is the **measurement
  harness** (1.1) + a **single, guarded cache-policy SSOT** (1.2) so windows can't silently drift.

⚠️ **Vercel collapses a route handler's `Cache-Control` to client-facing `public`** (it consumes `s-maxage`
at the edge; the verdict shows in `x-vercel-cache`). So the live spec asserts the route is *publicly
edge-cacheable* (`public`, never `no-store`, with an `x-vercel-cache` verdict), not the raw `s-maxage`
string — the pure spec pins the exact window the app sends.

## Why
The validated dominant cause is backend reads, but every **uncached** storefront/Store-API read (incl. bot &
crawler traffic) cascades FE→Cloud Run→Neon and adds to it. Caching the hot read paths is the safe, free,
frontend-only lever — and we need a repeatable egress measurement before changing anything so each later lever's
delta is attributable. (Read-side mirror of the LEARNINGS visibility-gate / cron-cadence cost wins.)

## Stories

### Story 1.1 — A repeatable Neon egress measurement
**As** the platform, **I want** a one-command read of current Neon per-project egress + the org total, **so that**
every later lever's effect is measured against a known baseline (not guessed).
**Acceptance:**
- A small script/runbook reads `GET /projects/{id}` `data_transfer_bytes` for all three projects + computes the
  org total and % of 5 GB (the exact numbers the spike captured by hand). Output is copy-pasteable into a PR/sprint note.
- The baseline reading is recorded in this sprint doc before Story 1.2 merges.
- No secret committed (token from the local `neonctl` credentials / env, like the spike run).
**Risk:** low (read-only).

### Story 1.2 — Cache the storefront catalog/shop/PDP reads
**As** a visitor (or bot), **I want** repeat storefront reads served from cache, **so that** they don't each
cascade into a fresh Neon query and burn egress.
**Acceptance:**
- `app/s/[slug]/page.tsx`, `app/l/[id]/page.tsx`, and the `lib/medusa` Store-API catalog reads carry an explicit
  **revalidate window** (ISR / `s-maxage`) sized to respect price/stock freshness (document the chosen window +
  why; a few minutes is fine for a young catalog — confirm with Daniel if tighter is needed for price accuracy).
- Cache headers / ISR are observable on the storefront routes (response header assertion).
- No stale-data UX regression beyond the revalidate window; **money mutations (checkout, offers) are NOT cached.**
- After ~2–3 days live, the Story-1.1 reading shows a measurable egress drop attributable to fewer Neon reads
  (record the delta; if negligible, say so — the baseline bleed is background, attacked in S2).
**Risk:** med (caching commerce reads — freshness correctness; no money path mutated).

## Baseline (recorded by Story 1.1 — `node scripts/neon-egress.mjs`, 2026-06-21)
Org `org-fancy-pond-57061061` · cap 5 GB/mo (per-org, decimal GB):

| Project | Egress (MB) | Egress (GB) | % of 5 GB |
|---|--:|--:|--:|
| medusa-bonsai (commerce) | 4135.9 | 4.136 | 82.7% |
| panfleto-miniflux | 159.5 | 0.159 | 3.2% |
| justread | 0.2 | 0.000 | 0.0% |
| **ORG TOTAL** | **4295.6** | **4.296** | **85.9%** |

Headroom to cap: **0.704 GB (14.1% remaining)**. Matches the spike's hand-read 85.9% exactly — every later
sprint's egress delta is read against this. (medusa-bonsai is 96.3% of the org's own usage; the side-projects
are the S3 split target, not the egress driver.)

## Sprint QA
- **api spec(s):** `e2e/neon-egress-cache.spec.ts` — pure assertions pin the `lib/cache-policy.ts` windows +
  `storefrontCacheControl()` output (no network), plus a live check that `/api/ucp/catalog` is publicly
  edge-cacheable. The catalog data itself stays smoke-verified.
- **browser smoke owed:** no — header assertion + the egress delta reading cover it. The freshness eyeball
  (price/stock updates within the revalidate window) is a quick Daniel check, flagged below.
- **deterministic gate:** `tsc` + `next build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (preview URL while pre-merge)

1. Run the Story-1.1 egress script: `node scripts/neon-egress.mjs`
   → prints the per-project table + org total + % of 5 GB; matches the Neon console Usage page. (On a 401,
   run any `neonctl` command to refresh the OAuth token, or `export NEON_API_KEY=…`, then re-run.)
2. Confirm the agent/bot catalog route is publicly edge-cacheable (this is the real CDN lever — pages are
   dynamic-by-personalization, see Findings):
   `curl -sI "https://miyagisanchez.com/api/ucp/catalog?limit=1" | grep -iE "cache-control|x-vercel-cache"`
   → `cache-control: public` (never `private`/`no-store`) **and** an `x-vercel-cache:` verdict. Re-run twice;
   the second is typically `HIT` (timing/region-dependent — `MISS` then `HIT` both prove edge caching).
3. Open https://miyagisanchez.com/s/<test-shop> and a PDP https://miyagisanchez.com/l/<test-listing-id>.
   → both render correctly. (They render dynamically; their Neon reads are shielded by the function-level
   cache — `getShop` 120s / `getListing` 60s — so repeat loads inside the window don't re-query Neon.)
4. **(Owed to Daniel — freshness eyeball)** Change a test listing's price in the seller portal; reload the PDP
   after ~60 s (the `CACHE.LISTING` window).
   → the new price appears within roughly a minute (not instantly, not never).
5. Re-run the egress script after ~2–3 days.
   → org egress trend is flat-or-down vs the baseline (record the delta). **Expect it to be roughly flat** —
   the reads were already cached; the real reduction is S2's `minScale` lever. Record the number either way.

If any step fails, note the step number + what you saw — that's the bug report.
