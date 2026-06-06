# Sprint 1 - Seller Support Setup

Goal: let a seller enable support and make that support purchasable through a Medusa-owned commerce primitive,
before any public widget is shipped.

Status: ✅ shipped to production.

## US-1 - Seller support configuration ✅ · Risk: HIGH
**As a** seller, **I want** to enable a support widget with preset/custom amounts, **so that** visitors can
support me without buying a listing.

Acceptance:
- [x] Seller settings expose support enabled/disabled.
- [x] Seller can configure exactly three preset amounts.
- [x] Seller can configure custom minimum and maximum.
- [x] Seller can choose the default public/private visibility.
- [x] Public support config fails closed when support is disabled or the embed key is invalid.

## US-2 - Medusa support primitive ✅ · Risk: HIGH
**As the** platform, **I want** support represented through Medusa commerce primitives, **so that** money,
orders, receipts, and seller attribution stay in the commerce backend.

Acceptance:
- [x] Enabling support provisions or reuses a hidden Medusa support product for the seller.
- [x] The support primitive is excluded from public catalog/search.
- [x] The support primitive is usable by the support checkout path.
- [x] Support metadata is written to cart/order/payment metadata, not Supabase.

## QA
- [x] API specs cover support config CORS and fail-closed invalid-key behavior.
- [x] Shared validation specs cover exact preset count, min/max, and message limit.
- [x] Seller settings save path provisions the Medusa support product before persisting support settings.
- [x] Backend/frontend deterministic gates are green locally.
- [x] Frontend PR #25 and backend PR #7 merged to `main`.
- [x] Vercel production and Cloud Run production deploys completed.
