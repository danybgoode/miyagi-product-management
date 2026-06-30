# Mercado Libre sync — Sprint 2: Import ML catalog → Miyagi

**Status:** 🟨 BUILT — draft PRs open (backend
[#45](https://github.com/danybgoode/medusa-bonsai-backend/pull/45) · frontend
[#142](https://github.com/danybgoode/miyagisanchezcommerce/pull/142); **merge backend first**). Rides the
existing bulk-import/supply pipeline as a new ML **source adapter**; the import surface is
**seller-facing** (`/shop/manage/mercadolibre/import`, NOT the admin supply console) and attaches
products to the **connected seller's own shop**, behind a new `ml.import_enabled` flag (enablement,
default OFF, dark-ship). Deterministic gate green locally (tsc + build + Playwright `api` pure tests +
backend unit). **Owed to Daniel:** the live ML-sandbox import smoke (steps below) + flag flip.

| Story | Status | Commit |
|---|---|---|
| US-4 — Import ML listings → supply pipeline → Medusa products (+ linkage) | ✅ | be `c73cdae` · fe `7ddf80f` |
| US-5 — Category / attribute / image mapping on import | ✅ | fe `9670a24` |
| US-6 — Import review + confirm + dedupe UI | ✅ | fe `b590a8e` |
| api spec (`e2e/ml-import.spec.ts`) | ✅ | fe `dfccf21` |

> **Architecture note (confirmed with Daniel):** the import surface is **seller-facing** under
> `/shop/manage/mercadolibre/import` (the connected seller imports their own catalog), gated by a new
> **`ml.import_enabled`** enablement flag (default `false`), independent of `ml.connect_enabled`.
> Backend adds the read side the S1 client lacked (`GET /internal/ml/items` + `client.getSellerItems`/
> `getItemDetail`); the FE maps ML→supply (pure `lib/ml-import.ts`), reuses the supply staging
> (`supply_batches`/`supply_items`) and the extracted import core (`lib/supply-import.ts`), and records
> the S1 product↔ML-item linkage via `POST /internal/ml/links` (409 ⇒ already linked ⇒ duplicate).
> No new DB migration; no money mutation. **Risk tier: MED** (writes the seller's own catalog, dark).

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
**Prerequisite (owed to Daniel):** backend deployed (the `GET /internal/ml/items` route is live), then
flip the **`ml.import_enabled`** flag **ON** in Flagsmith. Until then `/shop/manage/mercadolibre/import`
returns 404 by design (dark-ship), and the "Importar mi catálogo" CTA on the connection card is hidden.
Requires a seller already connected to ML (Sprint 1 smoke).

1. As a connected test seller (flag ON), open **`/shop/manage/mercadolibre`** → "Importar mi catálogo"
   (or go straight to **`/shop/manage/mercadolibre/import`**) → "Traer mis publicaciones de Mercado Libre".
   → A review list of your ML sandbox items appears, each with first image + price; any already-imported
   item is badged **"Ya importada"** and unchecked by default.
2. Leave the default selection (or pick a few) and click "Importar seleccionadas (N)".
   → A result banner shows "Importadas N · duplicadas M"; the Medusa products appear under your shop with
   title, price, images, and description.
3. Open one imported product's detail (PDP / `/shop/manage`).
   → Category + attributes are mapped (category defaults to a best-effort map — re-categorise in review if
   needed; the accurate predictor is Sprint 3/US-9); images are **ingested to R2** (not hotlinked to ML).
4. Re-run "Traer mis publicaciones".
   → The items you imported are now badged **"Ya importada"** (linkage-aware) and unchecked; importing
   again does **not** create duplicates (the product↔ML-item link is 1:1).

If any step fails, note the step number + what you saw — that's the bug report.
**Owed to Daniel:** all steps — a live ML-sandbox catalog + consent (a third-party account can't be
automated headlessly). The api gate covers the pure ML→supply mapping, dedupe logic, and route auth shape.
