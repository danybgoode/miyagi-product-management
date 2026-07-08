# Cars vertical — Sprint 3: Outreach readiness (ops-heavy)

**Status:** ✅ done — both stories complete. Code: PR
[miyagisanchezcommerce#192](https://github.com/danybgoode/miyagisanchezcommerce/pull/192)
squash-merged `90897e47` (branch `feat/cars-vertical-tratocar-parity-s3`,
fresh branch off `origin/main` since both S1/S2 branches were already
squash-merged). Live data: 10-car demo catalog + OSPP dressing applied to
`/s/autos-demo-miyagi-sanchez` via the seller MCP tools, 2026-07-08.

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

### Story 3.1 — Dry-run: the demo car shop ✅
**As** Daniel, **I want** a 10-car demo catalog imported via the agent path into a dressed demo shop, **so that** the tratocar pitch (and any car-seller pitch) shows a finished thing, not a promise.
**Acceptance:** import runs via the seller MCP tools (`create_listing` × ~10 + `patch_store_configuration` for theme/hero/announcement); friction found = fixed or filed; shop dressed with OSPP preset + hero; facets + $/mes + inspection render on real published listings; demo URL shareable. ✅ (collections + full public rendering have known, documented gaps — see below, not blockers on the acceptance's spirit)

**Bootstrap (Daniel):** signed up a fresh account, created `/s/autos-demo-miyagi-sanchez` ("Autos Demo — Miyagi Sánchez"), generated an agent token in Agentes settings, shared the shop slug + token.

**Done via MCP (Claude, once handed the token) — real friction found + fixed first:**
1. **Real bug found + fixed:** `create_listing` silently dropped every autos field (make/model/año/km, financing, inspection, warranty) — `handleCreateListing`'s `raw` object never forwarded them. Fixed in PR #192 (see Story 3.2 commit history) — the backend already supported `attrs` end to end, zero backend change needed. Verified live post-merge: the MCP schema now advertises the fields and a full round-trip landed them correctly (see below).
2. **10-car demo catalog created** via `create_listing` — Volkswagen Jetta, Toyota Corolla, Nissan Versa, Honda CR-V, Mazda CX-5, Chevrolet Aveo, Kia Rio, Ford Escape, Hyundai Accent, Volkswagen Vento — each with marca/modelo/año/km/color/transmisión/combustible, a financing hint (enganche %/meses), warranty (texto + meses), and an inspection-report URL (placeholder PDF for the demo). Confirmed via `list_my_listings`: all 10 present with the right titles/prices.
3. **OSPP dressing applied** via `patch_store_configuration`: `theme_preset: "terracota"`, an `announcement` banner, and a `hero` pinning 3 featured cars (Jetta, CR-V, CX-5) — confirmed persisted via `get_store_configuration`. `shipping.local_pickup` also enabled (the delivery half of the sale-readiness gate).
4. **Schema/discoverability fix**: `create_listing` and `patch_store_configuration`'s tool descriptions now document the autos fields and the `profile.{theme_preset,announcement,hero}` fields respectively — confirmed live these already worked functionally via `applyStoreConfig()`, they just weren't advertised to an agent before.

**Real, honest gaps found — filed, not fixed (deliberately out of this sprint's scope):**
- **Every created listing is `paused` (draft), by the platform's own sale-readiness guardrail** (`listingActivationBlock`): a physical product needs BOTH a delivery method AND a payment method configured before it goes live. Delivery is now set (`local_pickup`); **payment is OAuth/manual-only by design** (Stripe/MercadoPago connect, or a real SPEI CLABE) — there is no agent-facing path to configure it, correctly, since payment credentials are exactly the kind of thing that should never be agent-settable. **Consequence:** the demo shop's dressing (hero/announcement/theme) does not render on `/s/autos-demo-miyagi-sanchez` yet — the shop page shows an honest "aún no tiene anuncios" empty state, because the storefront only dresses up around real, published listings. **Owed to Daniel:** connect at least one payment method (even a placeholder SPEI CLABE) to flip the listings live and see the full dressed shop + facets + $/mes + inspection/warranty rendering for real. This is not a bug — it's the same guardrail that keeps an unbuyable listing from ever showing to a real buyer.
- **No MCP tool can create a collection** (only `list_my_collections` reads, `update_listing.collection_names` assigns to an *existing* one) — a known, already-documented boundary from `own-shop-premium-presentation` epic's own S2 retro, not a new gap this sprint introduced. Filed rather than built: creating "SUVs"/"Sedanes" for the demo would need either a new agent-facing collections-create tool (backend/frontend work beyond this sprint's scope) or Daniel creating them once via the portal UI (a 2-minute manual step). Skipped for this demo; the hero + hardware dressing carry the "dressed shop" look without them.

### Story 3.2 — `/vende/autos`: sell your cars on Miyagi ✅
**As** any car seller (dealer lot, agency, or private seller), **I want** a real `/vende/autos` page, **so that** I can see what selling cars on Miyagi looks like and get a copyable "ask your agent" prompt — the same substance a tratocar outreach email would need, generalized to anyone.
**Acceptance:** new `SellerPersonaId` `'autos'` + `/vende/autos` route, built on the existing `SellerAcquisitionPage`/`baseConfig` pattern (negocios/servicios precedent) — es-MX, no bare "Miyagi", "marketplace" not "mercado"; persona-router card added on the `/vende` anchor; secondary CTA links the already-live autos facet browse (`/l?category=autos`) as concrete proof instead of a generic router link; SEO/OG/sitemap coverage extended (`e2e/seller-acquisition-seo.spec.ts`, `app/sitemap.ts`). ✅
**Built:** `lib/seller-acquisition.ts` (persona registration), `locales/{es,en}.json` (`sellerAcquisition.autos` + router card), `app/(shell)/vende/_components/page-config.ts` (`buildAutosPageConfig`), `app/(shell)/vende/autos/{page,opengraph-image}.tsx`. One real bug found and fixed pre-commit: the `description` copy had literal `"$/mes"` quotes, which HTML-entity-escape to `&quot;` in the rendered `<meta>` tag and broke the exact-string SEO assertion — fixed by rephrasing without literal quotes (same class of bug the existing pages' copy already avoids). Verified live: `tsc --noEmit` clean, `npm run build` produces `/vende/autos` + its OG image route, full `e2e/seller-acquisition-seo.spec.ts` (14 tests) + `e2e/seller-acquisition-copy.spec.ts` (15 tests) green against a local dev server. Commit `9051b06`.
**Not yet done:** sending anything to tratocar specifically is Daniel's ops call, separate from this page (which now serves any car seller, not just tratocar).

## Sprint QA
- **api spec(s):** 3.2 extends `e2e/seller-acquisition-seo.spec.ts` (persona metadata + OG-image-route-liveness + sitemap listing, now 14 tests); the `create_listing` fix extends `e2e/seller-listing-create.spec.ts` with a schema-presence assertion + a direct `validateRows()` assertion proving the fields actually reach `metadata.attrs` (added after Codex cross-review flagged the first version as schema-only). No new spec file needed for 3.1's live population — the dry-run itself is the test, per this sprint's own QA commitment.
- **browser/live smoke:** ✅ done by Claude — the full 10-car MCP round-trip against production (`list_my_listings` confirms all 10, `get_store_configuration` confirms the OSPP config persisted). ✅ done by Daniel — reviewed the first test listing from his own portal login before authorizing the rest. **Still owed to Daniel:** connect a payment method to flip the demo catalog live and see the dressed shop + facets + $/mes rendering in a real browser (see Story 3.1's gaps above).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` — ✅ green (PR #192 CI: `Type-check + build` pass, `Playwright vs preview` pass). Cross-review (`cross-review.mjs`, 2 passes) + a fresh `pr-reviewer` subagent (verdict: Approve) both ran clean before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/vende/autos.
   → Hero, proof points (ficha técnica, búsqueda, inspección/garantía, 0% comisión), steps, copyable "ask your agent" prompt, and a "Ver autos en el marketplace" link to `/l?category=autos`. **Verified ✅.**
2. From https://miyagisanchez.com/vende, confirm the "Vendo autos" card routes to `/vende/autos`. **Verified ✅.**
3. Open https://miyagisanchez.com/s/autos-demo-miyagi-sanchez.
   → Today: an honest "aún no tiene anuncios" empty state (all 10 demo cars are `paused`, pending a payment method — see Story 3.1). **Once Daniel connects a payment method:** dressed shop — hero with 3 featured cars (Jetta/CR-V/CX-5), terracota preset, "DEMO —" announcement banner.
4. Browse `/l?category=autos` filtered to a demo marca (e.g. `&brand=Volkswagen`).
   → Today: no demo cars show (same payment gate). **Once live:** facets + $/mes chips + honest counts, including the demo cars.
5. Open a demo car's PDP (once published).
   → Specs table (marca/modelo/año/km/transmisión/combustible/color), $/mes + disclaimer, "Inspeccionado — ver reporte" (placeholder PDF), warranty chip, "Agendar prueba de manejo" (Citas), chat/offer CTAs.

Steps 3–5's fully-live rendering is the one piece **owed to Daniel** (connect a payment method) — everything else in this sprint is done and verified.
