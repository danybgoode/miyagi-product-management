# Mercado Libre sync — Sprint 2: Import ML catalog → Miyagi

**Status:** 🟦 READY — not started. Rides the existing bulk-import/supply pipeline.

| Story | Status | Commit |
|---|---|---|
| US-4 — Import ML listings → supply pipeline → Medusa products (+ linkage) | ⬜ | |
| US-5 — Category / attribute / image mapping on import | ⬜ | |
| US-6 — Import review + confirm + dedupe UI | ⬜ | |
| api spec (`e2e/ml-import.spec.ts`) | ⬜ | |

> Goal: a connected seller imports their existing ML catalog into Miyagi in a few clicks. ML is a new
> **source adapter** into the shipped supply/catalog-import pipeline — not new ingestion plumbing.

## Stories

### US-4 — Import ML listings → Medusa products
**As a** seller, **I want** to import my existing ML listings into Miyagi, **so that** onboarding is
one-click. Add an ML **source adapter** that fetches the connected seller's active ML items and feeds the
existing supply pipeline (`lib/catalog-import.ts`, `lib/supply.ts`, `app/api/supply/import`), creating
Medusa products via `internal/seller-products` and **recording the Sprint-1 linkage** for each.
**Acceptance:** importing a connected seller's ML catalog stages the items and creates Medusa products,
each linked to its ML item id; re-running doesn't recreate already-imported items.
**Risk:** med

### US-5 — Category / attribute / image mapping on import
**As a** seller, **I want** imported listings to keep their category, key attributes, images & description,
**so that** they're sellable on Miyagi immediately. Map ML item fields (title, price, pictures,
attributes, ML category) into the Miyagi product shape; ingest images through `lib/image-ingest.ts`.
**Acceptance:** an imported product carries title, price, images, description, and a mapped Miyagi
category + attributes; missing/odd ML fields degrade gracefully (no broken product).
**Risk:** med

### US-6 — Import review + confirm + dedupe UI
**As a** seller, **I want** to review what will import and skip duplicates, **so that** I don't double up.
Add a review/confirm step on the supply tooling (`SupplyClient.tsx`): list fetched ML items, flag likely
duplicates of existing Medusa products, let the seller select which to import. es-MX (rule #5).
**Acceptance:** the review screen lists ML items with a dedupe flag; only selected items import; a flagged
duplicate is not created unless the seller overrides.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/ml-import.spec.ts` (api) — adapter → staged → Medusa product + linkage; re-run is
  idempotent (US-4); field/category/image mapping incl. graceful degradation (US-5); dedupe flags + only-
  selected import (US-6). Mock the ML API.
- **browser smoke owed:** to Daniel — import a small real ML **sandbox** catalog and confirm the products
  + images render in Miyagi.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge) · ML **sandbox**

1. As a connected test seller (Sprint 1), open the ML import on the supply tooling and "fetch my ML
   listings".
   → A review list of your ML sandbox items appears, with dedupe flags on any that match existing products.
2. Select a few and "Importar".
   → Medusa products are created; each shows under your shop with title, price, images, description.
3. Open one imported product's detail.
   → Category + attributes are mapped; images ingested (not hotlinked).
4. Re-run the import.
   → Already-imported items are flagged as duplicates and **not** recreated.

If any step fails, note the step number + what you saw — that's the bug report.
