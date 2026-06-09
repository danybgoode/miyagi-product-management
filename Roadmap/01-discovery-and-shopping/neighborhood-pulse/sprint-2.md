# Neighborhood Pulse — online community feed — Sprint 2: Richer pulse + agents

**Status:** ⬜ not started

> Builds on Sprint 1's feed. All LOW-risk, read-only — a merchant spotlight, a neighborhood feel via grouping,
> and an agent-readable pulse view. No new persistence; reuses `lib/neighborhood-rank.ts` + existing shop/UCP data.

## Stories

### Story 2.1 — Merchant-spotlight strip
**As a** buyer, **I want** to see merchants worth knowing, **so that** I build familiarity and confidence in
local sellers before I transact.
**Detail:** a "Comercios que destacan" strip ranking shops by recent activity (orders / new listings / views),
reusing shop `description`/`tagline`/origin colonia. Read-only; extend `lib/neighborhood-rank.ts` with a
shop-ranking branch.
**Acceptance:**
- The strip shows real shops with their tagline + colonia, ordered by the stated signal; tapping a shop opens
  its storefront.
**Risk:** low.

### Story 2.2 — Colonia/zona presentational grouping
**As a** buyer, **I want** the feed to read as "my neighborhood", **so that** community items feel local and
organized rather than a flat stream.
**Detail:** visually group/label feed items by colonia/zona — **presentational only, no filtering engine**
(honoring the v1 decision: colonia is *shown*, not a queryable location primitive). Items with no zona fall
under a neutral "Tu comunidad" group.
**Acceptance:**
- Items cluster under their zona label; un-zoned items appear under "Tu comunidad"; ordering within a group
  stays newest-first.
**Risk:** low.

### Story 2.3 — Read-only UCP/MCP pulse view (agent surface)
**As an** AI shopping agent, **I want** to read the neighborhood pulse, **so that** agents see trending + the
community signal the same way buyers do (AGENTS rule #3).
**Detail:** expose the feed (opted-in community items + trending listings) as a **read-only** view on the
existing UCP/MCP discovery surface (additive; behind the existing public read API). Keep `GET /api/ucp/manifest`
accurate.
**Acceptance:**
- An agent call returns the trending listings + the opted-in community items; the manifest advertises it; no
  write path is exposed.
**Risk:** low (additive read tool).

## Sprint QA
- **api spec(s):**
  - S2.1 → `e2e/neighborhood-pulse.spec.ts`: shop-ranking branch of `lib/neighborhood-rank.ts` (pure-logic) + the spotlight data route.
  - S2.2 → unit spec on the grouping helper (zona buckets + "Tu comunidad" fallback).
  - S2.3 → api spec on the UCP pulse route + manifest accuracy.
- **browser smoke owed:** **No auth owed to Daniel** — an *anonymous* browser smoke covers the spotlight strip
  + zona grouping render (no login needed).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/vecindario (no login).
   → A "Comercios que destacan" strip renders real shops with tagline + colonia; tapping one opens its storefront.
2. Look at the community items.
   → Items are grouped under colonia/zona labels; items without a zona sit under "Tu comunidad".
3. Fetch the agent pulse view: open https://miyagisanchez.com/api/ucp/manifest and follow the advertised
   community/trending discovery route.
   → The response returns trending listings + the opted-in community items as read-only data; no write action is
     offered.

If any step fails, note the step number + what you saw — that's the bug report.
