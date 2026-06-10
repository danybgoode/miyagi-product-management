# Gem → claimable shop loop fix (Ask-Claude / Mexico 26)

**Status: awaiting Daniel approval — no code yet.**
Serves campaign brief §7: curate gem → import as unclaimed shop → magazine QR → `/s/[slug]` → seller claims free → agent maintains it.

## Findings — why the imported gem 404s

**Where things actually live (verified against code, 2026-06-09):**

| Concern | Source of truth | Read by |
|---|---|---|
| Shops/sellers | Medusa `seller` table (custom `seller` module, Cloud Run Postgres) | `getShop()` → `GET /store/sellers/:slug` → `/s/[slug]` |
| Listings | Medusa products linked to seller | `getShopListings()`, `GET /store/listings` (search/home), PDP |
| Supabase `marketplace_shops` / `marketplace_listings` | **Mirror only** (written Medusa→Supabase by `lib/provisioning.ts`) | conversations, offers, short links, agent tooling — never the storefront |

**Root cause 1 (the 404):** `POST /api/supply/import` still writes the **legacy pre-Medusa model**: it inserts directly into Supabase `marketplace_shops` + `marketplace_listings` and never creates a Medusa seller or product. Nothing renders from those tables anymore → `/s/pulqueria-las-duelistas-nxwy` 404s. Daniel's hypothesis confirmed.

**Root cause 2 (claim is silently broken too):** `/s/[slug]/claim` reads the **Medusa** shop and puts its id (`sel_…`) in the claim JWT. despachobonsai's `POST /api/onboarding/claim/complete` updates Supabase `marketplace_shops WHERE id = 'sel_…'` → matches 0 rows (mirror uses UUIDs), reports success anyway, and **never touches the Medusa seller** — which is what the storefront badge, `/shop/manage`, and `sellers/me` read. So even a Medusa-backed unclaimed shop could not actually be claimed today.

**Root cause 3 (schema gap):** Medusa `seller.clerk_user_id` is `NOT NULL` (unique). An unclaimed seller (`clerk_user_id = null`) can't even be inserted yet — even though the model comments, the `source: 'scraped'` field, and the storefront's `!shop.clerk_user_id` → "Sin reclamar" badge all already anticipate it.

**What already exists and is reusable (no Clerk needed):**
- `POST /internal/seller-products` (backend, `x-internal-secret` = `MEDUSA_INTERNAL_SECRET`) → shared `createSellerProduct()`: category handle lookup, listing_type → product type, price → variant, state/municipio/location/condition → metadata, **hosted image URLs pass straight through**, sales channel + inventory + shipping profile handled. Built for the MCP agent path; exactly what supply needs.
- `ensureSupabaseShopMirror` / `syncSupabaseListingMirror` (`lib/provisioning.ts`) — mirror writes incl. short-code minting.
- `/api/sell/upload` → R2 (Supabase Storage fallback) — but Clerk-gated; supply needs a secret-gated sibling.
- Supply staging (`/supply` UI, batches/items routes, normalization, quality score) — all fine; only the final import hop is wrong.

## Options

- **A (recommended): point supply import at Medusa.** Import creates an unclaimed Medusa seller + products via the existing internal seam, then mirrors to Supabase (as every other path does). Fix claim to set the Medusa seller's `clerk_user_id`. Medusa-first, smallest blast radius, no new tables.
- **B: storefront falls back to reading Supabase.** Rejected — violates Rule #1, re-creates the dual read model in search/PDP/checkout/MCP.
- **C: `pending:` placeholder clerk_user_id to avoid the migration.** Rejected — spreads a string convention across 3 apps; frontend + types already expect `null`.

## Plan (Option A) — 3 sprints

Branches per app repo (`feat/gem-claim-loop`); backend deploys first (regional Cloud Build us-east4), then frontend. One e2e spec per testable story per WAYS-OF-WORKING.

### Sprint 1 — an imported gem renders live
- **S1.1 (BE):** migration + model: `seller.clerk_user_id` nullable. New `POST /internal/sellers` (x-internal-secret): create unclaimed seller `{slug?, name, description, location, logo_url, source:'scraped', source_url, metadata.supply}`; idempotent on `source_url` (returns existing); slug de-dupe.
  - *Story:* an admin/agent with the secret can create an unclaimed shop that renders at `/s/[slug]` with the "Sin reclamar" badge and claim CTA.
- **S1.2 (FE):** rewrite the import hop in `/api/supply/import`: resolve/create seller via `POST /internal/sellers`, create each listing via `POST /internal/seller-products` (status from batch target, images = hosted URLs), then mirror shop + listing into Supabase (with `medusa_seller_id` / `medusa_product_id` + short code) so conversations/offers/short links work. Keep source_url duplicate detection. `revalidateTag('shops'|'listings')`.
  - *Story:* approving + importing a staged gem yields a shop at `/s/[slug]` (HTTP 200) whose listing shows title, description, state/municipio, category, listing_type, price and image, and which appears in marketplace search.
- **S1.3 (FE):** `POST /api/supply/upload` (x-admin-secret, multipart) → R2/Supabase → `{url}`; usable before staging (put URL in `image_url`) or after.
  - *Story:* with no Clerk login, a local photo becomes a hosted URL attachable to a gem listing.

### Sprint 2 — claim actually transfers the shop
- **S2.1 (BE):** `POST /internal/sellers/[id]/claim` `{clerk_user_id}` — sets it iff currently null; idempotent for same user; 409 if owned by another.
- **S2.2 (FE):** `POST /api/claim/complete` — server-to-server (shared secret), body `{token, clerk_user_id}`; re-verifies the claim JWT (`CLAIM_JWT_SECRET` already shared), calls S2.1, claims the mirror row (`metadata->>medusa_seller_id`), marks `marketplace_claims` approved, revalidates caches.
- **S2.3 (despachobonsai repo, small PR):** `onboarding/claim/complete` keeps its `commerce_tenants` upsert but delegates the marketplace side to S2.2 instead of the dead direct Supabase update.
  - *Story:* a real seller clicks the QR → `/s/[slug]` → "Reclamar" → email → signs in → shop shows as theirs (badge gone, `/shop/manage` works).
  - Live Clerk-gated browser claim smoke = Daniel; token→API path smoked by agent.

### Sprint 3 — docs, cleanup, the real gem
- **S3.1:** reconcile `SUPPLY_IMPORT_SCHEMA.md` (import target = Medusa, new upload + claim endpoints) + `/supply` UI copy if stale; CSV schema itself is unchanged.
- **S3.2:** clean orphaned prod rows from the 2026-06-09 run: delete mirror shop `5ed4890f-…` + listing `df12a345-…`; re-approve the item in batch `1325c9ef-…` and re-import through the fixed path → **Las Duelistas live** with `gems/las-duelistas/*.jpg` hosted via S1.3.
- **S3.3:** verification: fresh test gem end-to-end against all 6 end-state criteria, then remove the test gem; e2e specs added per story.

## Risks / notes
- **Null clerk_user_id ripple:** audit notification dispatch + any seller→Clerk lookups for null-safety (unclaimed shops simply have nobody to notify — must no-op, not throw).
- **Checkout on unclaimed gems:** no payment methods configured → checkout options collapse to contact/coordination; acceptable (loop is claim-first). Verify it degrades, not errors.
- **Known follow-up (not in scope):** the 90-day scraped-listing expiry cron only touches the mirror; once listings live in Medusa it must expire the Medusa product too. Flag for a follow-up idea.
- despachobonsai change is cross-repo (S2.3) — needs Daniel's go-ahead explicitly.
