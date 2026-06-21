# Neon egress reduction — Sprint 1: Measurement baseline + cache storefront reads

**Status:** ⬜ Not started. Frontend (Vercel preview per PR). Risk: low–med (caching commerce reads must
respect price/stock freshness). Ship first — it establishes the egress baseline every later sprint reads against.

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

## Sprint QA
- **api spec(s):** one asserting the cache/revalidate headers on the storefront read routes (pure where a
  cache-policy helper is extracted to `lib/`). The catalog data itself stays smoke-verified.
- **browser smoke owed:** no — header assertion + the egress delta reading cover it. The freshness eyeball
  (price/stock updates within the revalidate window) is a quick Daniel check, flagged below.
- **deterministic gate:** `tsc` + `next build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (preview URL while pre-merge)

1. Run the Story-1.1 egress script.
   → prints per-project egress + org total + % of 5 GB; matches the Neon console Usage page.
2. Open https://miyagisanchez.com/s/<test-shop> twice in a fresh private window.
   → page renders; the second load serves from cache (response shows the ISR/`s-maxage` header; not a fresh fetch).
3. Open a product PDP https://miyagisanchez.com/l/<test-listing-id>.
   → renders with the cache header present.
4. **(Owed to Daniel — freshness eyeball)** Change a test listing's price in the seller portal; reload the PDP
   after the revalidate window.
   → the new price appears within the documented window (not instantly, not never).
5. Re-run the egress script after ~2–3 days.
   → org egress trend is flat-or-down vs the baseline (record the delta; background bleed remains — that's S2).

If any step fails, note the step number + what you saw — that's the bug report.
