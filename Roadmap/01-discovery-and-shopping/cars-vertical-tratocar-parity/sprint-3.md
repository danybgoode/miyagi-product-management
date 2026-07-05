# Cars vertical — Sprint 3: Outreach readiness (ops-heavy)

**Status:** ⬜ not started

## Stories

### Story 3.1 — Dry-run: the demo car shop
**As** Daniel, **I want** a 10-car demo catalog imported via the agent path into a dressed demo shop, **so that** the tratocar pitch shows a finished thing, not a promise.
**Acceptance:** import runs via agent-native setup (friction found = fixed or filed); shop dressed with OSPP preset + hero + collections (SUVs/Sedanes); facets + $/mes + inspection render on real listings; demo URL shareable.
**Risk:** LOW

### Story 3.2 — BD one-pager for tratocar
**As** Daniel, **I want** an es-MX one-pager: what tratocar gets (extra channel, 0% commission, own subdomain brand, agent-managed catalog, SSR/SEO listings their JS-only site lacks), **so that** the outreach email has substance.
**Acceptance:** built on `/vende` funnel patterns (honest benchmark framing); includes the demo shop URL + a copyable "ask your agent" prompt; PDF or page — Daniel's call at build; **sending it = Daniel's ops task**.
**Risk:** LOW (ops)

## Sprint QA
- **api spec(s):** none new (S1/S2 specs stand); the dry-run IS the test
- **browser smoke owed:** yes, to Daniel — the full demo-shop walkthrough below (it doubles as the pitch rehearsal)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge (if any code shipped)

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open the demo shop URL (e.g. https://miyagisanchez.com/s/demo-autos or its subdomain).
   → Dressed shop: hero with 3 featured cars, collections nav, announcement bar.
2. Browse `/l?categoria=autos` filtered to the demo marca.
   → Facets + $/mes chips + honest counts.
3. Open a car PDP.
   → Specs table, REPUVE cue, $/mes + disclaimer, inspection report, warranty chip, "Agendar prueba de manejo" (Citas), chat/offer CTAs.
4. Read the one-pager end-to-end; click the demo link inside it.
   → Everything it claims is verifiable on screen.
5. (ops) Send it to tratocar.

If any step fails, note the step number + what you saw — that's the bug report.
