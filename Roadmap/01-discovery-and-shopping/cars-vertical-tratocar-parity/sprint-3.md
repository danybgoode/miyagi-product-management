# Cars vertical — Sprint 3: Outreach readiness (ops-heavy)

**Status:** 🚧 in progress — 3.2 built (frontend commit `9051b06`, branch
`feat/cars-vertical-tratocar-parity-s3`, fresh branch off `origin/main` since
both S1/S2 branches squash-merged). 3.1 reframed + blocked on Daniel (see
below); confirmed with Daniel during S3 planning.

> **Reshaped during planning.** Confirmed with Daniel: (1) 3.1's demo shop is
> bootstrapped by Daniel (fresh account, shop creation, agent-token generation
> in Agentes settings — a Medusa shop is 1:1 with a Clerk account, so this
> can't reuse his own logged-in session); once handed the shop slug + token,
> the rest (import 10 cars, apply OSPP preset/hero/collections) runs over the
> existing seller MCP tools, no further browser steps needed. (2) 3.2 is
> reframed from a tratocar-specific one-pager into a general `/vende/autos`
> page for **any** car seller (dealer lot, agency, or private seller) — a real
> shipped page, not an external doc, following the existing `/vende` funnel
> pattern.

## Stories

### Story 3.1 — Dry-run: the demo car shop ⬜ blocked on Daniel
**As** Daniel, **I want** a 10-car demo catalog imported via the agent path into a dressed demo shop, **so that** the tratocar pitch (and any car-seller pitch) shows a finished thing, not a promise.
**Acceptance:** import runs via the seller MCP tools (`create_listing` × ~10 + `patch_store_configuration` for theme/hero/announcement + collections); friction found = fixed or filed; shop dressed with OSPP preset + hero + collections (SUVs/Sedanes); facets + $/mes + inspection render on real listings; demo URL shareable.
**Risk:** LOW
**Blocked on:** Daniel signs up a fresh account, creates a shop clearly named as a demo (e.g. "Autos Demo — Miyagi Sánchez"), and generates an agent token in shop settings → Agentes — then shares the shop slug + token so the import/dressing can run over MCP.

### Story 3.2 — `/vende/autos`: sell your cars on Miyagi ✅
**As** any car seller (dealer lot, agency, or private seller), **I want** a real `/vende/autos` page, **so that** I can see what selling cars on Miyagi looks like and get a copyable "ask your agent" prompt — the same substance a tratocar outreach email would need, generalized to anyone.
**Acceptance:** new `SellerPersonaId` `'autos'` + `/vende/autos` route, built on the existing `SellerAcquisitionPage`/`baseConfig` pattern (negocios/servicios precedent) — es-MX, no bare "Miyagi", "marketplace" not "mercado"; persona-router card added on the `/vende` anchor; secondary CTA links the already-live autos facet browse (`/l?category=autos`) as concrete proof instead of a generic router link; SEO/OG/sitemap coverage extended (`e2e/seller-acquisition-seo.spec.ts`, `app/sitemap.ts`). ✅
**Built:** `lib/seller-acquisition.ts` (persona registration), `locales/{es,en}.json` (`sellerAcquisition.autos` + router card), `app/(shell)/vende/_components/page-config.ts` (`buildAutosPageConfig`), `app/(shell)/vende/autos/{page,opengraph-image}.tsx`. One real bug found and fixed pre-commit: the `description` copy had literal `"$/mes"` quotes, which HTML-entity-escape to `&quot;` in the rendered `<meta>` tag and broke the exact-string SEO assertion — fixed by rephrasing without literal quotes (same class of bug the existing pages' copy already avoids). Verified live: `tsc --noEmit` clean, `npm run build` produces `/vende/autos` + its OG image route, full `e2e/seller-acquisition-seo.spec.ts` (14 tests) + `e2e/seller-acquisition-copy.spec.ts` (15 tests) green against a local dev server. Commit `9051b06`.
**Not yet done:** sending anything to tratocar specifically is Daniel's ops call, separate from this page (which now serves any car seller, not just tratocar).

## Sprint QA
- **api spec(s):** 3.2 extends `e2e/seller-acquisition-seo.spec.ts` (persona metadata + OG-image-route-liveness + sitemap listing, now 14 tests) — no new spec file, since the existing seller-acquisition SEO/copy specs already generalize across every persona by iterating a list; 3.1 has no new spec (the dry-run itself is the test, per this sprint's own QA commitment)
- **browser smoke owed:** yes, to Daniel — the demo-shop walkthrough below (once 3.1 lands) doubles as the pitch rehearsal; `/vende/autos` itself is anonymous/unauthed and safe to click through anytime post-merge
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green — ✅ confirmed for 3.2 (full `api` project run locally; the 22 unrelated failures seen in a full local run — home/catalog/launchpad/embed/mobile-filter specs needing live backend data/flag state — don't reproduce in isolation and don't touch any file this story changed; not a regression)

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/vende/autos.
   → Hero, proof points (ficha técnica, búsqueda, inspección/garantía, 0% comisión), steps, copyable "ask your agent" prompt, and a "Ver autos en el marketplace" link to `/l?category=autos`.
2. From https://miyagisanchez.com/vende, confirm the "Vendo autos" card routes to `/vende/autos`.
3. Open the demo shop URL (once Story 3.1 lands — e.g. https://miyagisanchez.com/s/demo-autos or its subdomain).
   → Dressed shop: hero with 3 featured cars, collections nav, announcement bar.
4. Browse `/l?categoria=autos` filtered to the demo marca.
   → Facets + $/mes chips + honest counts.
5. Open a car PDP.
   → Specs table, REPUVE cue, $/mes + disclaimer, inspection report, warranty chip, "Agendar prueba de manejo" (Citas), chat/offer CTAs.

Steps 3–5 are owed once Daniel hands off the demo-shop credentials for Story 3.1 (see above).
