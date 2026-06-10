# Sprint 1 — an imported gem renders live

Goal: a curated gem imported through `/supply` becomes a real, unclaimed, Medusa-backed shop at
`/s/[slug]` with a fully-populated listing.

## Stories

### S1.1 (backend) — unclaimed sellers can exist
- [x] Migration: `seller.clerk_user_id` drops NOT NULL (partial unique index already tolerates NULLs); model gets `.nullable()`.
- [x] `POST /internal/sellers` (`x-internal-secret`): creates `{slug?, name, description?, location?, logo_url?, source:'scraped', source_url?, metadata}` with `clerk_user_id: null`; idempotent — if a seller with the same `source_url` exists, return it (200) instead of creating; slug de-duped like `sellers/me`.
- **Done when:** a seller created this way renders at `/s/[slug]` with the "Sin reclamar" badge and claim CTA (criterion 1 + 2-front-half).

### S1.2 (frontend) — supply import writes Medusa + mirror
- [x] `/api/supply/import` final hop: resolve/create seller via `POST /internal/sellers`; create each listing via `POST /internal/seller-products` (status from batch target, images = hosted URLs, state/municipio/category/listing_type/price pass through).
- [x] Mirror shop + listing into Supabase (`marketplace_shops` with `metadata.medusa_seller_id`, `marketplace_listings` via `syncSupabaseListingMirror` → short code) so conversations/offers/short links keep working.
- [x] Keep `source_url` duplicate detection; `revalidateTag('shops'|'listings')` after import.
- **Done when:** importing a staged gem yields `/s/[slug]` HTTP 200 whose listing shows title, description, state/municipio, category, listing_type, price, image — and it appears in `/store/listings` search (criteria 3 + 4).

### S1.3 (frontend) — image path with no Clerk login
- [x] `POST /api/supply/upload` (`x-admin-secret`, multipart) → R2 (Supabase Storage fallback) → `{url}`; same size/MIME guards as `/api/sell/upload`.
- **Done when:** a local photo becomes a hosted URL usable as `image_url` in staging or attachable after import (criterion 5).

## Verification
- Local gate: tsc + build + e2e specs (pure normalization spec stays next-free).
- Prod (post-merge, backend first): import a fresh test gem end-to-end; criteria 1/3/4/5.
