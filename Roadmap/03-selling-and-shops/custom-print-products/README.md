---
status: shipped
slug: custom-print-products
---

# Epic: Custom print products — the sticker-shop buy experience

> **Area:** 03 · Selling & Shops · **Risk:** HIGH (multi-variant commerce core + tiered pricing + buyer file upload; S1 LOW) · **Archetype:** Builder · **Scope doc:** [`00-ideas/2. readyforscope/custom-print-products.md`](../../00-ideas/2.%20readyforscope/custom-print-products.md)
>
> **✅ SHIPPED 2026-07-07 — all 4 sprints merged.** See [`RETROSPECTIVE.md`](RETROSPECTIVE.md).

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
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | 1.1 Hide `is_print_placement` products from every shop-storefront surface | LOW | ✅ [#171](https://github.com/danybgoode/miyagisanchezcommerce/pull/171) `8552974` |
| 1 | 1.2 miyagiprints ops checklist (comp grants · owner-email query · seed real catalog) | LOW (ops) | ✅ grants done; catalog seeding continues as backlog |
| 2 | 2.1 Seller defines priced option dimensions → real Medusa options/variants (create + edit) | HIGH | ✅ backend [#60](https://github.com/danybgoode/medusa-bonsai-backend/pull/60) `d22fb29` |
| 2 | 2.2 Seller sets quantity price breaks per variant (`min_quantity`/`max_quantity`; #12706 verify-first) | HIGH | ✅ same as 2.1 (verify-first confirmed #12706 doesn't apply to our Medusa version) |
| 2 | 2.3 PDP/cart/checkout price correctly for variant × quantity (pure price-grid deriver in `lib/`) | HIGH | ✅ frontend [#175](https://github.com/danybgoode/miyagisanchezcommerce/pull/175) `7009895` |
| 2 | 2.4 Seller-facing "Opciones" UI — dimension/value editor, per-combo price grid, tier editor (added 2026-07-06; 2.1-2.3 shipped API-only, no form) | HIGH | ✅ [#176](https://github.com/danybgoode/miyagisanchezcommerce/pull/176) `d6d457b` |
| 3 | 3.1 New `file` CustomFieldType (required flag, format allowlist, max size) | LOW | ✅ `4f6b859` |
| 3 | 3.2 Buyer (incl. guest) uploads artwork → R2; thumb echoes cart→checkout→order→emails; seller downloads original | HIGH | ✅ `bf769c3` |
| 3 | 3.3 Low-res preflight warning (pixels vs cm @ ~300 PPI; warn, never block) | LOW | ✅ `4f6b859`/`8e348cc` |
| 3 | 3.4 Configurator buy box: options → upload → live price grid → total (es-MX, mobile-first) | LOW | ✅ `8e348cc` — all of S3 landed via [#177](https://github.com/danybgoode/miyagisanchezcommerce/pull/177) `bfd28de` |
| 4 | 4.1 Lightweight proof via messaging (auto-restates size/qty/price; "Aprobar prueba" lands on the ledger) | MED | ✅ frontend (same #177) + backend [#63](https://github.com/danybgoode/medusa-bonsai-backend/pull/63) `6d982ff` |
| 4 | 4.2 Agent parity: options/tiers/upload contract in UCP catalog; MCP order with artwork URL | MED | ✅ same #177/#63 |
| 4 | 4.3 "Volver a pedir" re-adds same variant/qty/artwork to cart | LOW | ✅ same #177 |

Same-day hardening from cross-review, merged with S4: backend
[#64](https://github.com/danybgoode/medusa-bonsai-backend/pull/64) `fc6d867` (seller-ownership
auth-bypass fix), frontend [#181](https://github.com/danybgoode/miyagisanchezcommerce/pull/181)
`9465120` (MCP `isError` propagation).

## Deploy order
S1 independent, ship anytime. Then S2 → S3 → S4. Within S2/S3: **backend first** (variants/tiers,
then upload contract), frontend degrades gracefully (single-variant products keep today's PDP; the
configurator only renders when a product has options/tiers). Daniel merges all HIGH stories.

**As deployed:** exactly this order — S1 (2026-07-04) → S2 incl. 2.4 (2026-07-05/06) → S3+S4 together
(2026-07-07, continued on the same branch/PR since S3 was still unmerged when S4 was built) → same-day
hardening fixes #64/#181. Backend merged before frontend at every step; Cloud Run deploy confirmed
live (not just build success) before the dependent frontend PR merged.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated — see `RETROSPECTIVE.md` → Gaps/follow-ups)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Kill-switch: `configurator.enabled` exists, kill-switch polarity (fail-open `true`, matches `pdp_redesign`), scoped narrowly to S3's buy-box addition only (not S2's underlying variant/tier buy box) after a cross-review catch
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`**
