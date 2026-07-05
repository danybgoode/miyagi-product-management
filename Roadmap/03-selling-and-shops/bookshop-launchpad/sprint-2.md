# Bookshop launchpad — Sprint 2: The excerpt + the shelf

**Status:** ⬜ not started

## Stories

### Story 2.1 — Excerpt on digital PDPs
**As a** reader, **I want** a free "Lee un adelanto" sample inline on the listing page, **so that** I can taste the work before buying or voting.
**Acceptance:** seller uploads an excerpt (PDF pages or text) separate from the full file; inline viewer works on mobile (pages-as-images vs pdf.js — decided in plan mode for perf); full file stays private-bucket; excerpt presence exposed on UCP; absent excerpt = today's PDP.
**Risk:** MED

### Story 2.2 — The launchpad shelf
**As a** bookshop, **I want** published submissions auto-suggested into a "Convocatoria" collection (OSPP), hero-able on my storefront, **so that** the launchpad has a visible home.
**Acceptance:** suggestion, not force (seller confirms); shelf renders via existing collection pages; works listed with excerpt badges.
**Risk:** LOW

## Sprint QA
- **api spec(s):** excerpt validation spec · shelf-suggestion deriver spec
- **browser smoke owed:** yes, to Daniel — excerpt reading flow on a real phone (the make-or-break UX)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. On a published work's edit screen, upload a 5-page excerpt.
   → Saves with validation; PDP shows "Lee un adelanto".
2. Open the PDP on a phone (private window); tap it.
   → Excerpt reads inline, smooth on mobile data; full file NOT reachable.
3. Accept the "Convocatoria" collection suggestion in the seller shell.
   → Shelf appears in the shop nav; works carry excerpt badges.
4. Check `GET /api/ucp/catalog` for the work.
   → `has_excerpt: true` (or equivalent) present.

If any step fails, note the step number + what you saw — that's the bug report.
