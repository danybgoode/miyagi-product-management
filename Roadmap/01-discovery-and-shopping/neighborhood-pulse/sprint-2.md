# Neighborhood Pulse — online community feed — Sprint 2: Richer pulse + agents

**Status:** ✅ built — frontend commits `b4e6962`, `f958052`, `607a8df`; review fix `6bd96e1`

> Builds on Sprint 1's feed. All LOW-risk, read-only — a merchant spotlight, a neighborhood feel via grouping,
> and an agent-readable pulse view. No new persistence; reuses `lib/neighborhood-rank.ts` + existing shop/UCP data.

## Stories

### Story 2.1 — Merchant-spotlight strip
**As a** buyer, **I want** to see merchants worth knowing, **so that** I build familiarity and confidence in
local sellers before I transact.
**Detail:** a "Comercios que destacan" strip ranking shops by recent activity (new listings / views / recency),
reusing shop `description`/`tagline`/origin colonia. Read-only; extend `lib/neighborhood-rank.ts` with a
shop-ranking branch. Order volume is intentionally excluded until a real Medusa-derived aggregate exists.
**Acceptance:**
- The strip shows real shops with their tagline + colonia, ordered by the stated signal; tapping a shop opens
  its storefront.
**Risk:** low.
**Built:** ✅ `b4e6962` — adds the shop-ranking branch, `/api/neighborhood-pulse/spotlight`, the strip on
`/vecindario`, and API-project coverage. Review fix keeps raw ranking counters out of public/UCP/MCP responses.

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
**Built:** ✅ `f958052` — adds the presentational grouping helper + grouped `/vecindario` render and
API-project coverage.

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
**Built:** ✅ `607a8df` — adds `GET /api/ucp/neighborhood-pulse`, MCP `get_neighborhood_pulse`, manifest/capability
metadata, and API-project coverage.

## Sprint QA
- **api spec(s):**
  - S2.1 → `e2e/neighborhood-pulse.spec.ts`: shop-ranking branch of `lib/neighborhood-rank.ts` (pure-logic) + the spotlight data route.
  - S2.2 → unit spec on the grouping helper (zona buckets + "Tu comunidad" fallback).
  - S2.3 → api spec on the UCP pulse route + manifest accuracy + MCP `get_neighborhood_pulse` call.
- **browser smoke owed:** **No auth owed to Daniel** — the automated anonymous browser smoke covers `/vecindario`
  page render + the contribution CTA. Data-dependent spotlight/grouping behavior is covered by the API-project
  specs above and by the manual smoke walkthrough below because preview/production seeds may legitimately be empty.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com once deployed (use the branch preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/vecindario (no login).
   → A "Comercios que destacan" strip renders real shops with tagline + colonia; tapping one opens its storefront.
2. Look at the community items.
   → Items are grouped under colonia/zona labels; items without a zona sit under "Tu comunidad".
3. Open https://miyagisanchez.com/api/ucp/manifest and find `neighborhood_pulse`.
   → The manifest advertises `GET /api/ucp/neighborhood-pulse` and MCP tool `get_neighborhood_pulse`; both are read-only.
4. Fetch https://miyagisanchez.com/api/ucp/neighborhood-pulse?community_limit=2&trending_limit=2&shop_limit=2.
   → The response has `community_items`, `trending_listings`, `spotlight_shops`, and `_meta.read_only: true`.
5. Call MCP `get_neighborhood_pulse` through `POST /api/ucp/mcp`.
   → The JSON-RPC response includes the same read-only pulse sections and exposes no write action.

If any step fails, note the step number + what you saw — that's the bug report.
