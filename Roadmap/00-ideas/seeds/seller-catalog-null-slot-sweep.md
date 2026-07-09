---
title: "Seller-catalog null-slot sweep — resolveSellerProductIds() pattern across ~18 routes"
slug: seller-catalog-null-slot-sweep
status: raw                          # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "03"                           # primary home: Selling & Shops (seller-catalog module); several affected routes are money-path order routes (02 checkout)
type: bug
priority: tbd
risk: high                           # several affected routes are money-path (release-escrow, confirm-payment) — Daniel prioritizes/merges
epic: null
build_order: null
updated: 2026-07-09
---

# Seller-catalog null-slot sweep

**Origin:** found live during catalog-management Sprint 3's own smoke test (2026-07-09). Logged here as
a raw backlog item per Daniel's explicit call — not built as part of that sprint's hotfix, tracked
separately for future grooming/prioritization. See
[`catalog-management/sprint-3.md`](../../03-selling-and-shops/catalog-management/sprint-3.md) for the
full incident writeup and [backend PR #74](https://github.com/danybgoode/medusa-bonsai-backend/pull/74)
(squash `62f32c1b`) for the hotfix that seeded this finding.

## The bug pattern

`remoteQuery.graph({ entity: 'seller', fields: ['id', 'products.id'], ... })`'s `seller → products` link
returns a **sparse/null array slot** for a product right after `productService.softDeleteProducts()`
sets that product's `deleted_at` — the module-link row survives the soft-delete, but the joined product
entity resolves to `null`/`undefined` for that slot. Any code that does a bare
`(rows[0]?.products ?? []).map((p) => p.id)` on that result throws `Cannot read properties of undefined
(reading 'id')` the moment it's hit for a seller with a recently-deleted product — a real production
incident (broke a seller's entire Catálogo page on every load).

**The fix, already built and proven correct in PR #74:** `apps/backend/src/api/store/_utils/
seller-catalog-query.ts`'s `resolveSellerProductIds()` now filters null/undefined slots before mapping.
Any route with this pattern should call that shared helper instead of running its own inline
`remoteQuery.graph()` — same fix shape as the two routes PR #74 already migrated
(`store/sellers/me/products/[id]/route.ts`, `internal/seller-products/[id]/route.ts`).

## Sites found (independent `pr-reviewer` sweep, 2026-07-09 — NOT re-verified line-by-line since; treat
as a starting list, re-grep before building)

```
store/sellers/[slug]/products/route.ts
store/_utils/support-seller-resolution.ts
store/envia/rates/route.ts
store/listings/[id]/route.ts
admin/sellers/route.ts
internal/ml/publish/route.ts
internal/events-ticketing/redeem/route.ts
store/sellers/me/profit/apply-price/route.ts
store/sellers/me/orders/route.ts
store/sellers/me/orders/[id]/route.ts
store/sellers/me/orders/confirm-payment/route.ts
store/sellers/me/orders/release-escrow/route.ts
store/sellers/me/orders/return-request/route.ts
store/sellers/me/orders/ship/route.ts
store/sellers/me/orders/tags/route.ts
store/sellers/me/orders/bulk-status/route.ts
store/sellers/me/orders/proof/route.ts
store/sellers/me/orders/pickup-appointment/route.ts
```

(~18 sites total, all in `apps/backend`.) **Prioritize the `store/sellers/me/orders/*` family first** —
`release-escrow` and `confirm-payment` are money-path; a seller hitting either right after soft-deleting
any product in their catalog would 500 on an escrow release or payment confirmation, which is a much
worse failure mode than the catalog-page crash that surfaced this bug.

## Why this wasn't fixed immediately

PR #74 was a same-day production hotfix scoped to the two routes actually implicated in the live
incident (both feed the seller-catalog ownership-check path). Expanding it to ~18 sites, several of them
money-path order routes, was judged out of scope for an urgent hotfix — Daniel's explicit call was to
track this as a follow-up rather than widen that PR. This seed is that tracking.

## Next step

Not yet groomed to "ready" — needs: a fresh `grep`/`rg` sweep to confirm the site list above is current
(files move), a decision on whether every site should call `resolveSellerProductIds()` directly or
whether some need a narrower inline null-guard (some of the order routes may resolve products via a
different shape than the seller→products link), and a risk-tier call per site given the money-path
routes in the list.
