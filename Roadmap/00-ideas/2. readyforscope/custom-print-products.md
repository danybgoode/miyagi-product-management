---
status: readyforscope
slug: custom-print-products
macro: 03-selling-and-shops
class: feature
archetype: Builder
risk: HIGH overall (multi-variant commerce core + tiered pricing + buyer file upload) — storefront-cleanup stories LOW
---

# Custom print products — the sticker-shop buy experience (StickerJunkie-grade), as a marketplace primitive

> Scoped 2026-07-03 from Daniel's raw ask (4 open decisions resolved same-day — see *Decisions*).
> Direct successor to the shipped `configurable-personalized-products` epic (2026-06-05), which
> explicitly deferred everything this epic builds: **file upload, priced options, price impact**.
> Flagship shop: **miyagiprints** (Daniel's own print shop, current provider of the printed magazine).

**Tagline:** *Sube tu arte, elige tamaño y cantidad, ve el precio al instante — en la tienda de cualquier imprenta de Miyagi.*

## Overview — As a / I want / so that

**As a print-shop seller (miyagiprints or anyone)**, I want to list a custom product (stickers
die-cut/kiss-cut, plain sheets, flyers, zines) with priced size/material options, quantity price
breaks, and a required artwork upload — **so that** buyers configure and pay correctly without a
single "¿y de qué tamaño lo quieres?" chat round-trip.

**As a buyer**, I want to upload my artwork, pick size/material, see a live Sticker-Mule-style
price grid as I change quantity, and get exactly what I approved — **so that** ordering custom
prints feels as easy as StickerJunkie, in Spanish, on a Mexican marketplace.

**As a buyer on miyagiprints' public storefront**, I want to see only things I can actually buy —
**so that** dead "printed magazine ad" listings stop making the shop look broken.

**As an AI agent (UCP/MCP)**, I want the configurator products discoverable with their options,
tiers, and upload requirement — **so that** an agent can order 100 stickers 3×3 with an artwork URL
end-to-end (AGENTS rule #3).

## Stage-2.5 bucket — genuinely new core, wrapped in heavy reuse + two ops items

- **Already possible today (no build):**
  - **Paid-feature grants for miyagiprints** — all three SKUs support durable `comp` grants on shop
    metadata (`lib/domain-entitlement*`, `lib/subdomain-entitlement*`, `lib/ml-sync-entitlement*`;
    precedence flag → grant → subscription). miyagiprints is very likely already subdomain-
    **grandfathered** (the 179-shop backfill, 2026-07-01). Comping custom-domain + ML-sync = admin
    metadata writes. **Ops checklist, not stories.**
  - **The shop email lookup** — one prod query:
    `select owner_email, owner_clerk_id from marketplace_shops where slug = 'miyagiprints'`
    (sandbox couldn't reach prod Supabase; `tasks/print-edition.md` suggests the owner account,
    likely `miyagi@despachobonsai.com` = seeded `MIYAGI_ADMIN_EMAIL`). **Owed to Daniel / 1-min admin task.**
  - **miyagiprints public catalog** — stickers/zines/flyers can be listed *today* with existing
    listing tools + text-only personalization; the premium configurator is what's missing.
- **Light enhancement (bucket 2):**
  - **Hide print placements from the shop storefront** — placements carry
    `metadata.is_print_placement: true` and are already excluded from general browse
    (`apps/backend/src/api/store/listings/route.ts`) but **not** from `getShopListings()`
    (`lib/listings.ts` → `/s/[slug]`, subdomain, custom domain, embed all render it). One shared
    filter + regression spec.
- **Genuinely new (the epic):** seller-side **priced options → real Medusa variants** (today every
  seller product is single-variant — `_utils/seller-product-update.ts` reads `variants[0]`);
  **quantity price tiers** (Medusa-native `min_quantity`/`max_quantity` prices); **artwork-upload
  field type** on the personalization module; the **configurator buy box** with a live price grid;
  fulfillment + lightweight proof; agent surface.

## Decisions (resolved with Daniel, 2026-07-03)

1. **Print placements: hide from storefront now; public "anúnciate" funnel is a separate future
   idea** (seeded in `1. raw`). Merchants keep buying ads via the backoffice flow.
2. **Proofing v1 = lightweight, via existing messaging + order ledger.** Seller sends the proof in
   the buyer–seller conversation; buyer approves there; no money-path change (no
   authorize-until-proof). The Sticker-Mule "card charged only after proof approval" state machine
   is explicitly **out** of v1.
3. **Pricing v1 = size/material variants × quantity price breaks.** Real Medusa options/variants +
   tiered prices rendered as a live grid. Priced add-ons as a *separate surcharge system* are out —
   holographic/finish is just another variant dimension, which v1 covers.
4. **Own-shop premium presentation (hero, in-shop nav, product-type pages, theming) = its own
   groom**, seeded in `1. raw` with the audit findings. This epic stays product-experience-focused.

## Research (present-day, 2026-07-03)

- **Sticker Mule:** live volume-discounted price grid; free online proof ~4h; card **not charged
  until proof approval**; unlimited free proof changes; clean-file skip-proof option.
  ([ordering FAQ](https://www.stickermule.com/support/faq/ordering) ·
  [proof FAQ](https://www.stickermule.com/support/faq/ordering/can-i-see-a-proof-before-ordering) ·
  [automatic discounts](https://www.stickermule.com/automatic-discounts))
- **StickerJunkie** ([kiss-cut page](https://www.stickerjunkie.com/products/kiss-cut)): artwork
  upload up-front, 300-PPI guidance, proof-then-production (3–6 días), crack & peel standard,
  review wall. **Pitfall found in a live 1-star review:** they silently resized a 3×4 order to
  2.5×4 at proofing — the buyer felt cheated. → Our proof step must restate **size + quantity +
  price**, and any seller-proposed change must be explicit, never silent.
- **Medusa v2 tiered pricing is native:** prices accept `min_quantity`/`max_quantity` (variant
  prices included; admin supports tier editing).
  ([Price tiers & rules](https://docs.medusajs.com/resources/commerce-modules/pricing/price-rules))
  ⚠️ Verify during build: open issue
  [medusa#12706](https://github.com/medusajs/medusa/issues/12706) ("PricingModule quantity is never
  resolved") — confirm the cart path resolves quantity into price calc on our Medusa version before
  betting the grid on it; fallback is computing tier price at add-to-cart via the existing
  start-checkout seam.

## What already exists (reuse, don't rebuild)

- **Personalization module** — `lib/personalization.ts`: `CustomFieldDef` on `product.metadata.
  custom_fields`, payload on `line_item.metadata.personalization`, echoed through buy box → cart →
  checkout → order → both emails → UCP. **The artwork upload is a new `file` CustomFieldType here,
  not a new system.** No new tables (its own precedent).
- **R2 upload infra** — `lib/r2.ts` (`uploadToR2`), the no-Clerk supply upload precedent
  (`POST /api/supply/upload`), rate limiting (`lib/ratelimit.ts`).
- **Medusa options/variants + tiered prices** — native; backend product routes
  (`store/sellers/me/products`, `_utils/seller-product-update.ts`) already select `variants.*` —
  they just assume one variant today.
- **Buy box + PDP** — `app/(shell)/l/[id]` (PDP redesign, per-type decision blocks, personalization
  fields); cart/checkout personalization echo (`lib/cart.ts`).
- **Print-placement exclusion pattern** — `is_print_placement` filter in
  `apps/backend/src/api/store/listings/route.ts`; `getShopListings()` in `lib/listings.ts` is the
  missing surface.
- **Messaging + durable order ledger** — `marketplace_conversations` + the read-only in-chat
  transaction card (proof flow rides this).
- **Entitlement/grant seams** — `lib/*-entitlement*` (ops grants for miyagiprints).
- **UCP/MCP catalog + checkout** — `app/api/ucp/*`; personalization fields already ship in the
  agent catalog.

## v1 scope boundary

**In:** priced options (up to ~3 dimensions: size / material / finish) as real Medusa variants;
per-variant quantity price tiers with a live grid; required/optional artwork upload (PNG/JPG/PDF/AI/
SVG allowlist, size cap, low-res preflight warning vs chosen physical size); artwork echo (thumb in
cart/checkout/order/emails, original downloadable by the seller); lightweight proof via messaging
(explicit size+qty+price restatement); hide print placements from all shop-storefront surfaces;
UCP/MCP parity (options + tiers + upload contract in catalog; agent can order with an artwork URL);
miyagiprints ops checklist (grants + email + seed the real catalog); es-MX only (not added to the
bilingual allow-list).

**Out (explicit):** pay-after-proof / authorize-until-approval money path; a design-canvas editor
("sticker generator"); automatic die-line/cut-outline generation or live die-cut preview; priced
add-on surcharges outside variant dimensions; edit-configuration-in-cart (remove + re-add stands);
public standalone printed-ad sales (seeded separately); own-shop premium presentation (seeded
separately); ML publish of multi-variant configurator products; per-seller print-provider routing.

## Slices (skateboard → car)

### Sprint 1 — Storefront honesty + flagship ops (the skateboard) — LOW
| # | Story | Risk |
|---|---|---|
| 1.1 | As a buyer on any shop storefront (marketplace `/s/`, subdomain, custom domain, embed, UCP shop catalog), I never see `is_print_placement` products. **Acceptance:** miyagiprints.miyagisanchez.com shows zero ad placements; regression spec on the shared filter; general-browse exclusion untouched. | LOW |
| 1.2 | Ops checklist (Daniel/admin, ~no code): comp-grant custom-domain + ML-sync on miyagiprints (verify subdomain grandfather grant), run the owner-email query, seed miyagiprints' real public catalog (stickers/zines/flyers) with existing tools. **Acceptance:** grants visible in Canal/ML settings; email known; storefront shows real offerings. | LOW (ops) |

### Sprint 2 — Seller: priced options + quantity tiers (commerce core) — HIGH
| # | Story | Risk |
|---|---|---|
| 2.1 | As a seller, I define option dimensions (Tamaño/Material/Acabado) with per-combination pricing on a listing → real Medusa options/variants (create + edit; existing single-variant listings untouched). | HIGH |
| 2.2 | As a seller, I set quantity price breaks per variant (e.g. 10/25/50/100+) → Medusa `min_quantity`/`max_quantity` prices. Includes the #12706 verification spike-let; fallback documented. | HIGH |
| 2.3 | As a buyer, PDP + cart + checkout price correctly for variant × quantity (pay-button total always equals summary — house rule). Pure price-grid deriver in `lib/` with api specs. | HIGH |

### Sprint 3 — Buyer: artwork upload + configurator buy box — HIGH
| # | Story | Risk |
|---|---|---|
| 3.1 | As a seller, I add an "Arte / archivo" field (new `file` CustomFieldType): required flag, format allowlist, max size. | LOW |
| 3.2 | As a buyer (incl. guest), I upload artwork in the buy box → R2 (rate-limited, validated), thumbnail echoes through cart → checkout → order → emails; seller downloads the original from the order screen. | HIGH |
| 3.3 | As a buyer, I get a preflight warning when my image is low-res for the chosen physical size (pure `lib/` validator: pixels vs cm at ~300 PPI) — warn, never block. | LOW |
| 3.4 | As a buyer, the configurator buy box reads as one flow: options → upload → live price grid → total; es-MX copy; mobile-first. | LOW |

### Sprint 4 — Fulfillment, lightweight proof + agents (the car) — MED
| # | Story | Risk |
|---|---|---|
| 4.1 | As a seller, I send a proof from the order screen into the existing conversation (image + auto-restated size/qty/price — the StickerJunkie-pitfall guard); buyer taps "Aprobar prueba"; approval lands on the order ledger card. No money mutation. | MED |
| 4.2 | As an agent, the UCP catalog exposes options/tiers/upload contract and MCP checkout accepts variant + quantity + artwork URL end-to-end. | MED |
| 4.3 | As a buyer, "Volver a pedir" on a fulfilled configurator order re-adds the same variant/qty/artwork to the cart. | LOW |

**Deploy order:** S1 anytime (independent) → S2 → S3 → S4. Backend (variants/tiers) deploys before
the frontend grid.

## QA / smoke commitments (per WAYS-OF-WORKING)

- Pure-logic api specs on extracted seams: price-grid deriver, tier resolution, preflight
  validator, `file`-field validation, placement filter.
- Browser smokes owed to Daniel by name: **S2/S3 money path** (configure → upload → pay with test
  card → artwork on order + emails), **S1** storefront visual check on all four channels, **S4**
  proof round-trip on a real device.
- Every sprint closes with the numbered real-URL smoke walkthrough in its `sprint-N.md`.

## Open risks

- **medusa#12706** — quantity may not resolve into price calc on the cart path; verify first thing
  in S2 (fallback: compute tier price at the start-checkout seam we already own).
- **Single-variant assumptions** — `seller-product-update.ts`, inventory summing, offer flow, and
  the ML-sync link may assume `variants[0]`; S2 must sweep call sites.
- **Guest upload abuse** — R2 cost/abuse surface; rate limit + size caps + format sniffing from day
  one (supply-upload precedent).
- **Tier pricing × coupons/offers interplay** — negotiation offers on a tiered product need a
  defined answer (v1: offers apply to the resolved variant+qty price; spec it).

## Kickoff prompts (emitted at scaffold, per sprint — Stage 8)
*Placeholder — generated when the epic is scaffolded on approval.*
