# Own-shop premium presentation — Sprint 2: Collections + in-shop navigation

**Status:** ⬜ not started

> ⚠️ **Plan-mode gate:** confirm the Medusa grouping primitive first — Product **Collection** vs
> **Category**, per-shop scoped via metadata through the marketplace plugin. If the plugin's global
> namespace fights per-shop scoping, **escalate to Daniel, don't guess** (WAYS-OF-WORKING model
> tiers). No Supabase grouping table under any outcome (AGENTS rules #1/#2).

## Stories

### Story 2.1 — Seller-defined collections
**As a** print-shop seller, **I want** to create, rename, reorder, and delete collections (Die-cut, Kiss-cut, Zines, Flyers…) and assign my listings to them, **so that** my catalog reads like a store, not a pile.
**Acceptance:** Medusa-native grouping; a listing can live in multiple collections; deleting a collection never touches its products; manage UI in the seller shell; agent parity via the existing config/listing MCP tools where natural.
**Risk:** HIGH (commerce model)

### Story 2.2 — Shop nav strip + collection pages, white-label everywhere
**As a** buyer, **I want** a nav strip on the shop (Todos · Die-cut · Zines…) and `/s/[slug]/c/[collection]` pages, **so that** I browse the shop by its own sections on the marketplace, the subdomain, and the custom domain.
**Acceptance:** collection route added to the custom-domain middleware **pass-through allow-list** (announced — shared surface); per-shop isolation holds (foreign collection/slug → clean white-label 404); print-placement filter (custom-print-products S1) applies inside collections too; empty collection → honest empty state; embed unchanged.
**Risk:** HIGH (middleware, shared infra)

### Story 2.3 — SEO + agent surface
**As a** search engine or AI agent, **I want** collection pages in the per-host sitemap with correct canonicals/OG, and collections exposed in the UCP catalog, **so that** a shop's sections are discoverable by machines too.
**Acceptance:** `sitemap.ts` per-host entries; canonical points at the tenant domain when live (existing consolidation pattern); `GET /api/ucp/catalog` carries collection membership; manifest stays accurate.
**Risk:** MED

## Sprint QA
- **api spec(s):** collection grouping deriver spec (membership, ordering, multi-collection) · pass-through route-list spec (the allow-list can't drift — mirror the seller-nav spec pattern) · isolation 404 spec via channel headers
- **browser smoke owed:** yes, to Daniel — **real-domain white-label collection browse** (previews can't exercise the hostname branch; local `curl -H "Host: …"` pre-merge, Daniel's real device post-merge)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. As miyagiprints, open the new Colecciones manage surface → create "Die-cut", "Zines"; assign listings; reorder.
   → Changes persist; a listing can sit in both.
2. Open https://miyagisanchez.com/s/miyagiprints.
   → Nav strip shows Todos · Die-cut · Zines in your order.
3. Tap "Die-cut" → https://miyagisanchez.com/s/miyagiprints/c/die-cut.
   → Only die-cut listings; hero/bar/preset from S1 still framing the page.
4. Open https://miyagiprints.miyagisanchez.com/c/die-cut (subdomain) and the same path on the custom domain.
   → White-label collection page, no platform chrome.
5. Isolation check: visit `/c/die-cut` under a DIFFERENT shop's subdomain.
   → Clean white-label 404 — never miyagiprints content.
6. Fetch https://miyagiprints.miyagisanchez.com/sitemap.xml and `GET /api/ucp/catalog?shop=miyagiprints`.
   → Collection URLs present; catalog items carry collection membership.

If any step fails, note the step number + what you saw — that's the bug report.
