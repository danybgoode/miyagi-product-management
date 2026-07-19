# Seller-catalog null-slot sweep — Sprint 1: money-path + public shop · remaining sites · anti-recurrence guard

**Status:** ✅ complete — backend PR [#104](https://github.com/danybgoode/medusa-bonsai-backend/pull/104), squash `f813206`; Cloud Run `medusa-web-00003-jgv`

> **Close correction (2026-07-19):** build-time re-grep found 23 unsafe reads across 21 runtime
> files, including `store/home/personalization`, which the seed missed. The planned HIGH/LOW split
> became one HIGH PR because `store/listings`—the active production failure—was in the nominally
> LOW half and shared the same helper/deploy. Fresh review also identified historical ticket
> redemption and pre-existing fail-open/partial order ownership paths; the final PR makes all 11
> order authorization seams fail closed and all 12 historical reads deleted-inclusive.

> **Root cause (proven, don't re-derive):** `remoteQuery.graph({ entity: 'seller', fields: ['id',
> 'products.id'] })` returns a **null array slot** for every soft-deleted product; a bare
> `.map((p) => p.id)` throws on the next fetch. Fix primitive: `resolveSellerProductIds()`
> (`store/_utils/seller-catalog-query.ts`, PR #74). Full site inventory + failure modes: the
> [scope seed](../../00-ideas/seeds/seller-catalog-null-slot-sweep.md) — **re-grep before building**
> (`rg "products \?\? \[\]\)" src/api` + `rg "'products.id'" src/api`).

> ⚠️ **The one real unknown — escalate, don't guess:** Story 1.1 needs the seller→products link read
> to **include** soft-deleted products for ownership checks (a `withDeleted`-style option on
> `remoteQuery.graph`, or ownership resolved via the link module / a deleted-inclusive product
> query). If no clean path exists, stop and hand back to Opus/Daniel rather than inventing one —
> these are money-path routes.

## Stories

### Story 1.1 — Money-path orders family + public shop page
**As a** seller, **I want** my order actions (view, confirm payment, release escrow, ship, return,
proof, pickup appointment, tags, bulk status) and my public shop page to keep working after I delete
any listing, **so that** deleting a product never strands my in-flight orders or takes my shop
offline.
**Files (11):** `store/sellers/me/orders/route.ts` · `orders/[id]/route.ts` (×2 call sites) ·
`orders/[id]/{confirm-payment,release-escrow,return-request,ship,proof,pickup-appointment,tags}` ·
`orders/bulk-status` — all adopt `resolveSellerProductIds(scope, sellerId, { includeDeleted: true })`
(new option). Plus `store/sellers/[slug]/products/route.ts` (public shop page) — plain null-filter
via the helper (deleted products correctly excluded there).
**Acceptance:** with a test shop containing ≥1 soft-deleted product: (a) the public shop products
endpoint returns 200 listing the live products; (b) every orders-family route works against an order
containing the *deleted* product — ownership still passes; (c) an order containing *another
seller's* product is still 403 (fail-closed preserved — the sweep must not loosen ownership).
**QA:** extend `seller-catalog-query.unit.spec.ts` — null-slot + `includeDeleted` (deleted id
present, other-seller id absent) cases.
**Risk:** HIGH (money path) — shipped in the consolidated PR after the batch authorization.

### Story 1.2 — Remaining-sites sweep
**As a** buyer or admin, **I want** browse, listing detail, support resolution, shipping quotes,
profit apply-price, admin seller list, ML publish, and ticket redeem to tolerate a seller's deleted
products, **so that** no surface silently misattributes, duplicates, or drops data after a delete.
**Files (9):** `store/listings/route.ts` · `store/listings/[id]/route.ts` ·
`store/_utils/support-seller-resolution.ts` · `store/sellers/me/support-product/route.ts` (×2 —
needs `products.metadata`, so an inline null-guard is fine; comment pointing at the helper) ·
`store/envia/rates/route.ts` · `store/sellers/me/profit/apply-price/route.ts` ·
`admin/sellers/route.ts` · `internal/ml/publish/route.ts` ·
`internal/events-ticketing/redeem/route.ts`.
**Acceptance:** with the same test shop: `/store/listings` still attributes the seller's live
products; `support-product` reuses (never duplicates) the existing support primitive; `envia/rates`
still honors the shop's Envía grant / Correos settings; each remaining route returns 200 with
correct data. Every site either calls the helper or carries an explicit null-guard. No behavior
refactor beyond the resolver swap (e.g. `store/listings/route.ts` keeps its per-seller loop shape).
**Risk:** LOW in isolation; shipped with Story 1.1 because the production failure and shared helper
made an intermediate deploy lower-value than one HIGH-reviewed PR.

### Story 1.3 — Anti-recurrence static guard
**As a** future builder, **I want** a backend unit test that fails on any bare
`(…?.products ?? []).map(` shape under `src/api` outside an explicit allow-list, **so that** the
21st call site can't silently reintroduce the crash.
**Acceptance:** guard scans `src/api` recursively; allow-list starts at the not-yet-migrated files
and is **empty** once 1.1 + 1.2 land; a new bare site fails `npm run test:unit` with a message
naming `resolveSellerProductIds()`. Enforced-sweep-list shape (LEARNINGS): assert the hard gate only
over what the sweep actually swept.
**Risk:** LOW.

## Sprint QA
- **api spec(s):** backend Jest only (no Playwright — backend repo): extended
  `seller-catalog-query.unit.spec.ts` (1.1) + new `null-slot-guard.unit.spec.ts` (1.3).
- **browser smoke owed:** **yes, to Daniel — money path** (steps 4–6 below: confirm-payment + ship
  on an order containing a since-deleted listing). Agent owns the API-level prod probes.
- **deterministic gate:** `medusa build` → `tsc --noEmit` → `npm run test:unit` green before merge
  (backend has no per-branch preview; live confirmation is post-merge against prod).

**Recorded result:** backend/admin build + `tsc` + 44 suites / 450 unit tests green; import-aware
AST inventory leaves every `products.*` relation selection behind the typed helper. Production
revision deployed successfully; the formerly ownerless catalog product now resolves to
`andrea-shops`, and the full 71-item catalog invariant is green. Still owed to Daniel: authed
confirm-payment/ship/release-escrow and cross-seller 403 browser smokes on a disposable historical
order, plus a real scanner redemption of a ticket whose listing was deleted.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com — **post-merge** (backend deploys via Cloud Build,
~12 min; confirm the new revision is live before starting). Needs: a disposable test shop with ≥2
listings and one pre-existing test order.

1. In the test shop, place (or reuse) a test order containing listing A, paid via SPEI/manual.
   → Order visible at https://miyagisanchez.com/shop/manage/pedidos.
2. Soft-delete listing A from https://miyagisanchez.com/shop/manage/catalogo (single delete or bulk).
   → Listing drops from the Catálogo table; page still loads (the PR #74 fix, unchanged).
3. Open the shop's public page https://miyagisanchez.com/s/<test-shop>.
   → 200; remaining live listings render. (Pre-sweep this 500s — the Story 1.1 public-surface fix.)
4. **(money path — Daniel)** Open the test order and confirm the manual payment.
   → Confirmation succeeds — no 500, no 403; order shows payment confirmed.
5. **(money path — Daniel)** Mark the same order shipped (manual carrier is fine).
   → Ship succeeds; buyer notification fires as usual.
6. **(money path — Daniel)** If an escrow-eligible test order exists, release escrow on it.
   → Succeeds. (Skip gracefully if no escrow order is available — state the gap in the PR.)
7. Ask a second test seller's session (or agent) to hit one of the same order routes for that order.
   → Still 403 — ownership didn't loosen.
8. Browse https://miyagisanchez.com/l and open one of the test shop's live listings.
   → Card + PDP attribute the seller correctly (no missing-shop fallback).

If any step fails, note the step number + what you saw — that's the bug report.
