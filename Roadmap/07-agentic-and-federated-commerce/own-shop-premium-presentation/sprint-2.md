# Own-shop premium presentation — Sprint 2: Collections + in-shop navigation

**Status:** 🚧 in progress — plan-mode gate resolved 2026-07-06, building on `feat/own-shop-premium-presentation`.

> ⚠️ **Plan-mode gate — RESOLVED 2026-07-06.** The gate's premise was wrong: there is no
> `@medusajs/marketplace` plugin anywhere in this codebase (confirmed against `package.json`,
> `node_modules`, `medusa-config.ts` — zero hits; already correctly documented in
> `apps/miyagisanchez/.claude/context/medusa.md`, stale in `AGENTS.md` rule #1, fixed alongside this
> sprint). Shops/sellers are a fully custom module (`apps/backend/src/modules/seller/`), and
> product-to-seller scoping is a **module link** (`apps/backend/src/links/seller-product.ts`, a
> pivot table) — no plugin namespace to fight.
>
> **Determination (confirmed with Daniel):** use Product **Category**, not Collection. Reading the
> installed `@medusajs/product` v2.15.3 model source directly: Collection is `belongsTo` (one
> collection per product — structurally fails the "a listing can live in multiple collections"
> acceptance line below); Category is `manyToMany` (satisfies it). Per-shop scoping of a
> seller-created category is a **new module link** `seller ↔ product_category` (mirrors
> `seller-product.ts`/`seller-order.ts`, auto-migrated pivot table, no hand-authored migration) —
> gives a real ownership/authorization boundary, not metadata-only trust.
>
> **Real risk found and folded into scope (Story 2.1a, ships first, standalone):**
> `product_category.handle` has a **global unique index**, and the app today derives "the" category
> positionally — `product.categories?.[0]?.handle` (`apps/backend/src/api/store/_utils/listing.ts:182`,
> `apps/miyagisanchez/lib/listings.ts:183`) — which only holds because every product has 0-or-1
> category today. Once seller collections attach to the same many-to-many pivot, `[0]` could
> silently return a seller collection instead of the platform category, breaking the site's main
> category filter. Fixed via explicit platform-vs-collection split (handle-prefix check), before
> any collection-creation code ships. No Supabase grouping table under any outcome (AGENTS #1/#2).

## Stories

### Story 2.1a — Fix the category positional-read bug (preliminary, LOW risk, ships first)
**As a** platform, **I want** "the" product category derived explicitly (not positionally), **so
that** attaching seller collections to the same product can never silently break the main category
filter.
**Acceptance:** `toListingShape` (backend) and `getShopListings` (frontend) both derive the platform
category via an explicit split (handle-prefix / platform-enum match), never `categories?.[0]`; a
`collections: string[]` field is added to both listing shapes; unit specs cover order-independence
and empty/absent cases.
**Risk:** LOW — pure function, no schema/migration.

### Story 2.1b — Seller-defined collections (was Story 2.1)
**As a** print-shop seller, **I want** to create, rename, reorder, and delete collections (Die-cut, Kiss-cut, Zines, Flyers…) and assign my listings to them, **so that** my catalog reads like a store, not a pile.
**Acceptance:** Medusa-native grouping (Product Category, many-to-many); a listing can live in multiple collections; seller-namespaced handles (`{seller.slug}-{slug}`) avoid global unique-index collisions; deleting a collection never touches its products; renaming never changes the handle (stable `/c/...` URLs); manage UI in the seller shell; agent parity via the existing config/listing MCP tools where natural (via `seller-product-update.ts`'s shared `collection_ids` path).
**Risk:** HIGH (commerce model)

### Story 2.2 — Shop nav strip + collection pages, white-label everywhere
**As a** buyer, **I want** a nav strip on the shop (Todos · Die-cut · Zines…) and `/s/[slug]/c/[collection]` pages, **so that** I browse the shop by its own sections on the marketplace, the subdomain, and the custom domain.
**Acceptance:** per-shop isolation holds (foreign collection/slug → clean white-label 404); print-placement filter (custom-print-products S1) applies inside collections too; empty collection → honest empty state; embed unchanged.
**Risk:** HIGH (middleware, shared infra)
**Correction found during planning:** `middleware.ts` needs **no edit** — there is no allow-list to
extend (verified: the model is an inverted deny-list — `/s`, `/s/*`, `/l`, `/l/` → redirect home;
every other path, including `/c/[collection]`, already passes through untouched, exactly like
`/l/[id]` does today). Announced anyway since this is shared-surface territory a sibling PR might
assume otherwise about.

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
