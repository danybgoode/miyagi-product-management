---
status: scaffolded
slug: custom-print-products
---

# Epic: Custom print products — the sticker-shop buy experience

> **Area:** 03 · Selling & Shops · **Risk:** HIGH (multi-variant commerce core + tiered pricing + buyer file upload; S1 LOW) · **Archetype:** Builder · **Scope doc:** [`00-ideas/2. readyforscope/custom-print-products.md`](../../00-ideas/2.%20readyforscope/custom-print-products.md)

**Tagline:** *Sube tu arte, elige tamaño y cantidad, ve el precio al instante — en la tienda de cualquier imprenta de Miyagi.*

## Why
Print shops (miyagiprints first, any tenant after) sell products whose price depends on size ×
material × quantity and whose fulfillment needs the buyer's artwork file. Today Miyagi covers
neither: seller products are single-variant, personalization is text-only, and there's no upload.
This epic delivers the StickerJunkie/Sticker-Mule-grade configurator — priced options, a live
quantity-break price grid, artwork upload that rides the order end-to-end, and a lightweight proof
step — as a **marketplace primitive**, plus it fixes the miyagiprints storefront showing dead
printed-ad placements. Competitor pitfall we design against (live StickerJunkie 1-star review): a
proof must restate size + quantity + price; a seller-proposed change is explicit, never silent.

## Context
| | |
|---|---|
| **Role** | Seller (configure options/tiers/upload), buyer incl. guest (configure + buy), agent (UCP/MCP order), admin (ops grants) |
| **Macro-section** | 03 · Selling & Shops |
| **Risk** | HIGH — S2 mutates the commerce core (variants/pricing); S3 opens a guest upload surface |
| **Flag** | `configurator.enabled` kill-switch on the buy-box surface (fail-safe: falls back to today's PDP) — confirm polarity at S3 plan |
| **Decisions** | 2026-07-03 w/ Daniel: hide print placements (public ad funnel seeded separately) · lightweight proof via messaging (no money-path change) · variants × qty breaks (add-on surcharges out) · own-shop premium presentation is its own groom |
| **Bilingual** | es-MX only; NOT added to the bilingual allow-list |

## Medusa-first note
Medusa models nearly all of it natively: **options/variants** for size/material/finish, **tiered
prices** via `min_quantity`/`max_quantity` on variant prices ([docs](https://docs.medusajs.com/resources/commerce-modules/pricing/price-rules)),
line-item metadata for the artwork payload (the shipped personalization pattern). No new tables.
⚠️ Verify open issue [medusa#12706](https://github.com/medusajs/medusa/issues/12706) (quantity not
resolved in price calc) first thing in Sprint 2 — fallback is resolving the tier price at the
start-checkout seam we already own.

## What already exists (reuse, don't rebuild)
- **Personalization module** — `lib/personalization.ts` (`CustomFieldDef` on `product.metadata.custom_fields`, payload on line-item metadata, echoed buy box → cart → checkout → order → emails → UCP). The artwork upload is a new `file` CustomFieldType here.
- **R2 upload infra** — `lib/r2.ts` (`uploadToR2`), no-Clerk upload precedent `POST /api/supply/upload`, `lib/ratelimit.ts`.
- **Backend product routes** — `apps/backend/src/api/store/sellers/me/products/route.ts` + `_utils/seller-product-update.ts` (already select `variants.*`; assume `variants[0]` — S2 sweeps call sites).
- **PDP buy box** — `app/(shell)/l/[id]` (per-type decision blocks, personalization fields); cart echo in `lib/cart.ts`.
- **Print-placement exclusion** — `is_print_placement` filter in `apps/backend/src/api/store/listings/route.ts`; the missing surface is `getShopListings()` in `lib/listings.ts`.
- **Messaging + order ledger** — conversations + the read-only in-chat transaction card (proof flow rides this; no in-chat money mutation, per house rule).
- **Entitlement/grant seams** — `lib/domain-entitlement*`, `lib/subdomain-entitlement*`, `lib/ml-sync-entitlement*` (`comp` grants for the miyagiprints ops checklist).
- **UCP/MCP** — `app/api/ucp/*` catalog + checkout; personalization already ships to agents.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Hide `is_print_placement` products from every shop-storefront surface | LOW |
| 1 | 1.2 miyagiprints ops checklist (comp grants · owner-email query · seed real catalog) | LOW (ops) |
| 2 | 2.1 Seller defines priced option dimensions → real Medusa options/variants (create + edit) | HIGH |
| 2 | 2.2 Seller sets quantity price breaks per variant (`min_quantity`/`max_quantity`; #12706 verify-first) | HIGH |
| 2 | 2.3 PDP/cart/checkout price correctly for variant × quantity (pure price-grid deriver in `lib/`) | HIGH |
| 3 | 3.1 New `file` CustomFieldType (required flag, format allowlist, max size) | LOW |
| 3 | 3.2 Buyer (incl. guest) uploads artwork → R2; thumb echoes cart→checkout→order→emails; seller downloads original | HIGH |
| 3 | 3.3 Low-res preflight warning (pixels vs cm @ ~300 PPI; warn, never block) | LOW |
| 3 | 3.4 Configurator buy box: options → upload → live price grid → total (es-MX, mobile-first) | LOW |
| 4 | 4.1 Lightweight proof via messaging (auto-restates size/qty/price; "Aprobar prueba" lands on the ledger) | MED |
| 4 | 4.2 Agent parity: options/tiers/upload contract in UCP catalog; MCP order with artwork URL | MED |
| 4 | 4.3 "Volver a pedir" re-adds same variant/qty/artwork to cart | LOW |

## Deploy order
S1 independent, ship anytime. Then S2 → S3 → S4. Within S2/S3: **backend first** (variants/tiers,
then upload contract), frontend degrades gracefully (single-variant products keep today's PDP; the
configurator only renders when a product has options/tiers). Daniel merges all HIGH stories.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Kill-switch: `configurator.enabled` exists with stated polarity (fail-safe to today's PDP)
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
