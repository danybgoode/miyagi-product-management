# Marketplace communications — Sprint 2: the matrix as a surface

**Status:** ⬜ not started

## Stories

### Story 2.1 — `/admin/comunicaciones`
**As a** platform owner, **I want** to read the communications map in the admin, **so that** I can
answer "what does this action send, to whom, on which channel" without opening an editor.
**Acceptance:** the page lists every communication with its trigger, from-actor, to-actor, channels
and event group; the totals are computed from the catalog, never typed; the page is Clerk-admin gated
and registered in the admin nav.
**Risk:** LOW

### Story 2.2 — Filter by actor, channel and trigger
**As a** platform owner, **I want** to narrow the map, **so that** I can see just what a buyer
receives, or just what goes out over Telegram.
**Acceptance:** filtering by from-actor, to-actor and channel narrows the list and updates the count;
a text search matches trigger and key; clearing the filters restores the full set.
**Risk:** LOW

## Sprint QA
- **api spec(s):** 2.2 → `e2e/communications-matrix-filter.spec.ts` over the pure filter function.
- **browser smoke owed:** **yes, to Daniel** — the page is Clerk-admin gated.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com/admin/comunicaciones

1. Open the page.
   → every communication is listed, with a total at the top.
2. Filter to-actor = *comprador*.
   → only messages a buyer receives remain, and the count drops accordingly.
3. Filter channel = *telegram*.
   → only Telegram-carrying messages remain.
4. Search for `oferta`.
   → the offer-flow messages appear and nothing else.

If any step fails, note the step number + what you saw — that's the bug report.
