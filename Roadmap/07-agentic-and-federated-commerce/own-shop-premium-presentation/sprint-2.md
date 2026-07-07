# Own-shop premium presentation — Sprint 2: Collections + in-shop navigation

**Status:** ✅ MERGED 2026-07-07. Backend PR [#65](https://github.com/danybgoode/medusa-bonsai-backend/pull/65)
squashed to `main` (`667c607`). Frontend PR [#182](https://github.com/danybgoode/miyagisanchezcommerce/pull/182)
squashed to `main` (`ed905d7`), backend merged first per the async-deploy convention. Both branches
deleted. Cross-agent review (codex) ran on both PRs; a fresh Claude reviewer pass ran on both,
independently re-verified after fixes, gave "safe to merge" on both. Daniel authorized merge-on-green
for this sprint. **Owed to Daniel:** the real-domain hostname-branch smoke below (the one slice no
preview/local run can exercise) + confirming the backend Cloud Run deploy rolled (image-only deploy,
~12 min, no GitHub Actions visibility).

**Bugs found and fixed post-build, pre-merge** (cross-review + a fresh reviewer pass, all
independently re-verified against the final commits — not just traced by hand):
- Backend: handle-collision-suffix loop had an off-by-one (adopted the 20th candidate without ever
  checking it was free) — fixed, new unit test constructs 19 real collisions and asserts the 20th
  candidate was actually queried, not just that the result happens to match.
- Backend: `collection_ids` silently dropped unknown/foreign ids instead of rejecting — fixed to
  reject the whole write (422); live-verified against a throwaway local Postgres (valid write
  succeeds, mixed valid+unknown rejects, product categories confirmed unchanged after the reject).
- Frontend: `deriveShopCollections`'s sort was a silent no-op — it read `.metadata.sort_order`, but
  its real caller always passes the flattened shape with `sort_order` as a top-level field, so the
  sort always saw `undefined` and degenerated to array-arrival order (invisible in practice only
  because the backend happens to pre-sort). Fixed with a correctly-typed parameter + a regression
  test feeding a genuinely unsorted array.
- Frontend: a real MCP agent-parity gap — `update_listing` never actually forwarded collection
  assignment to the backend (despite the PR description's claim), and there was no way for an agent
  to discover a shop's collections. Added `list_my_collections` + `update_listing.collection_names`.
- Frontend: the new `list_my_collections` MCP tool was declared + had a complete handler but was
  never wired into the `tools/call` dispatch switch — calling it returned MethodNotFound, and
  `update_listing`'s own description told agents to use it. Fixed; new static-source regression spec
  (`mcp-tool-dispatch-parity.spec.ts`) asserts every declared tool has a dispatch case — verified live
  to actually catch this exact bug before committing.
- Also merged `origin/main` into the frontend branch mid-review (it was 2 commits behind, including
  a same-file MCP `isError`-propagation fix) — one real merge conflict in `lib/ucp/schema.ts`
  (two independent new imports), resolved additively, re-verified clean by the fresh reviewer.

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

### Story 2.1a — Fix the category positional-read bug (preliminary, LOW risk, ships first) ✅
**As a** platform, **I want** "the" product category derived explicitly (not positionally), **so
that** attaching seller collections to the same product can never silently break the main category
filter.
**Acceptance:** `toListingShape` (backend) and `getShopListings` (frontend) both derive the platform
category via an explicit split (handle-prefix / platform-enum match), never `categories?.[0]`; a
`collections: string[]` field is added to both listing shapes; unit specs cover order-independence
and empty/absent cases.
**Risk:** LOW — pure function, no schema/migration.

### Story 2.1b — Seller-defined collections (was Story 2.1) ✅
**As a** print-shop seller, **I want** to create, rename, reorder, and delete collections (Die-cut, Kiss-cut, Zines, Flyers…) and assign my listings to them, **so that** my catalog reads like a store, not a pile.
**Acceptance:** Medusa-native grouping (Product Category, many-to-many); a listing can live in multiple collections; seller-namespaced handles (`{seller.slug}-{slug}`) avoid global unique-index collisions; deleting a collection never touches its products; renaming never changes the handle (stable `/c/...` URLs); manage UI in the seller shell; agent parity via the existing config/listing MCP tools where natural (via `seller-product-update.ts`'s shared `collection_ids` path).
**Risk:** HIGH (commerce model)

### Story 2.2 — Shop nav strip + collection pages, white-label everywhere ✅
**As a** buyer, **I want** a nav strip on the shop (Todos · Die-cut · Zines…) and `/s/[slug]/c/[collection]` pages, **so that** I browse the shop by its own sections on the marketplace, the subdomain, and the custom domain.
**Acceptance:** per-shop isolation holds (foreign collection/slug → clean white-label 404); print-placement filter (custom-print-products S1) applies inside collections too; empty collection → honest empty state; embed unchanged.
**Risk:** HIGH (middleware, shared infra)
**Correction found during planning:** `middleware.ts` needs **no edit** — there is no allow-list to
extend (verified: the model is an inverted deny-list — `/s`, `/s/*`, `/l`, `/l/` → redirect home;
every other path, including `/c/[collection]`, already passes through untouched, exactly like
`/l/[id]` does today). Announced anyway since this is shared-surface territory a sibling PR might
assume otherwise about.

### Story 2.3 — SEO + agent surface ✅
**As a** search engine or AI agent, **I want** collection pages in the per-host sitemap with correct canonicals/OG, and collections exposed in the UCP catalog, **so that** a shop's sections are discoverable by machines too.
**Acceptance:** `sitemap.ts` per-host entries; canonical points at the tenant domain when live (existing consolidation pattern); `GET /api/ucp/catalog` carries collection membership; manifest stays accurate.
**Risk:** MED

## Sprint QA
- **api spec(s), all green:** `category-split.unit.spec.ts` (backend, jest) + `collection-membership.spec.ts`
  (frontend, Playwright — mirrors the backend split: platform-vs-collection derivation, sort order,
  no cross-seller leakage) · `seller-collections.unit.spec.ts` (backend — create/collision-suffix,
  rename/handle-immutability, reorder accept/reject-foreign/reject-partial, delete) ·
  `collection-route-passthrough.spec.ts` (regression guard on the shared `isBoundaryDeniedPath`
  predicate — `/c/*` is never caught by the deny-list) · `collection-isolation.spec.ts`
  (platform-host header-spoofing guard, always-on; fixture-gated marketplace-path 404s via
  `MS_TEST_CLAIMED_SLUG`). Extended `seller-mode.spec.ts` for the new manage-route nav entry.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api`/jest unit green on both
  repos, pre-merge (see PR links above).
- **Live-verified beyond the deterministic gate** (not just unit tests): a throwaway local Postgres
  was migrated from scratch (confirming the new `seller_seller_product_product_category` pivot
  table migrates cleanly), seeded with two real sellers, and used to prove — against the real
  running backend + frontend, not mocks — the full collections CRUD round trip (create with
  handle-collision-suffixing, rename preserving the handle, reorder accept/reject-foreign/
  reject-partial, delete), the shop-page nav strip rendering real collection links, the collection
  page rendering the real filtered product, a nonexistent collection 404ing, and **cross-shop
  isolation** (two shops with an identically-named "Die-cut" collection never leak into each
  other). This caught and fixed two real bugs pre-merge: a hardcoded `#fff` in the new nav strip
  (design-token-foundation.spec.ts caught it) and a partial-reorder `sort_order` collision in
  `reorderSellerCollections` (only surfaced by the live DB round trip, not the mocked unit tests).
- **Browser smoke still owed to Daniel** — the genuine hostname branch (a real subdomain/custom
  domain, where middleware itself resolves the shop and sets `x-miyagi-shop-slug`) can't be
  exercised against a platform preview/prod baseURL or a local Host-header spoof (localhost is a
  recognized platform host, so middleware strips the header before the page ever sees it) — this is
  the one genuinely unverifiable-pre-merge slice, exactly as this sprint's plan anticipated.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (merged and live once the backend Cloud Run deploy
rolls, ~12 min post-merge) — these steps are written against `miyagiprints`, the epic's flagship
dogfood shop.

1. As miyagiprints, open the new Colecciones manage surface (`/shop/manage/collections`) → create
   "Die-cut", "Zines"; assign listings via the per-listing edit surface; reorder with the ↑/↓
   controls.
   → Changes persist on reload; a listing can sit in both collections.
2. Open `/s/miyagiprints`.
   → A nav strip appears below the hero: "Todos · Die-cut · Zines" (count badge per entry), in the
   order set in step 1.
3. Tap "Die-cut" → `/s/miyagiprints/c/die-cut`.
   → Only die-cut listings render; the S1 announcement bar/theme preset still frame the page.
4. Open `miyagiprints.miyagisanchez.com/c/die-cut` (subdomain) and the same path on the custom
   domain if one is verified for this shop.
   → **Owed to Daniel** — this is the hostname branch a preview/local run can't exercise (see QA
   note above). Expected: white-label collection page, no platform chrome, same content as step 3.
5. Isolation check: visit `/c/die-cut` under a DIFFERENT shop's subdomain (one that also has no
   "die-cut" collection, or a different one by that name).
   → Clean white-label 404 — never miyagiprints content. (Live-verified equivalent already passed
   locally with two throwaway shops sharing the same collection name — see QA note.)
6. Fetch `/sitemap.xml` on miyagiprints' domain and `GET /api/ucp/catalog?shop=miyagiprints`.
   → `/c/<slug>` URLs present in the sitemap; catalog items carry a `collections` array.

If any step fails, note the step number + what you saw — that's the bug report.
