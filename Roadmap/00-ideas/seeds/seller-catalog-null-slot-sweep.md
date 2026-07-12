---
title: "Seller-catalog null-slot sweep — resolveSellerProductIds() pattern across ~20 sites"
slug: seller-catalog-null-slot-sweep
status: scaffolded                   # raw | ready | queued | scaffolded | in-progress | shipped | archived — funnel-only now; epic README frontmatter is the SSOT
area: "03"                           # primary home: Selling & Shops; several affected routes are money-path order routes (02 checkout)
type: bug                            # class: Bug (fan-out sweep) · archetype: Sweeper/Maintainer
priority: tbd
risk: high                           # money-path order routes (confirm-payment, release-escrow, ship) — Daniel merges those
epic: "03-selling-and-shops/seller-catalog-null-slot-sweep"
build_order: null
updated: 2026-07-11
---

# Seller-catalog null-slot sweep — scope doc (groomed 2026-07-11)

**Origin:** live production incident found during catalog-management Sprint 3's smoke test
(2026-07-09) — full writeup in
[`catalog-management/sprint-3.md`](../../03-selling-and-shops/catalog-management/sprint-3.md) §"Second
incident"; hotfix [backend PR #74](https://github.com/danybgoode/medusa-bonsai-backend/pull/74)
(squash `62f32c1b`).

## Reproduction + root cause (bug class — already proven, not re-derived)

`remoteQuery.graph({ entity: 'seller', fields: ['id', 'products.id'], filters: { id: sellerId } })`
returns a **sparse/null array slot** for any product whose `deleted_at` was set by
`productService.softDeleteProducts()` — the module-link row survives the soft-delete, the joined
product resolves to `null`. Any bare `(rows[0]?.products ?? []).map((p) => p.id)` then throws
`Cannot read properties of undefined (reading 'id')` on **every subsequent fetch** for that seller.
Reproduce: soft-delete any listing (single-row delete or bulk delete, both shipped) → hit any
affected route for that seller → 500 (or silent misbehavior where a `try/catch` swallows it).

**The fix primitive already exists and is proven:** `apps/backend/src/api/store/_utils/
seller-catalog-query.ts` → `resolveSellerProductIds()` filters null slots before mapping; regression
unit spec `seller-catalog-query.unit.spec.ts` covers the null-slot case; PR #74's pr-reviewer pass
confirmed the change is fail-closed (can only shrink the id set — cannot introduce an IDOR).

## Validation (2026-07-11, this groom — fresh sweep against `origin/main`, not the local checkout)

- Only 4 files call `resolveSellerProductIds()` today (helper + PR #74's two routes + the two
  bulk-apply routes). **No sibling epic fixed the rest** — money-path order routes verified bare
  directly on `origin/main` via `git grep`.
- All 18 seed-listed sites confirmed live (order routes actually live under
  `store/sellers/me/orders/[id]/…`).
- **Two additional sites the original sweep missed:** `store/listings/route.ts` (marketplace browse)
  and `store/sellers/me/support-product/route.ts` (×2 call sites).
- **Total: ~20 files / 22 call sites**, all in `apps/backend/src/api`.

## Stage-2.5 bucket: **light enhancement** (bucket 2)

Not net-new work — the shared helper + its regression spec + the PR #74 migration pattern already
exist. The work is migrating call sites onto the proven primitive (or a variant, below) + a guard so
the pattern can't return. No architecture fork → planning panel not triggered (on-demand only).

## The design wrinkle that shapes the slicing (decided with Daniel, 2026-07-11)

For the **orders family**, a plain null-filter changes the failure from 500 → **403**: the null slot
*is* the soft-deleted product, so filtering it removes it from the seller's ownership set, and the
`owns = items.every(id => sellerProductIds.has(id))` check would then reject the legitimate seller
on any existing order containing a since-deleted listing — stranding in-flight orders
(confirm-payment, escrow release, ship). Shipped behavior is "delete… with order history intact"
(seller-unclaimed-bug-sweep), so **Daniel confirmed: orders must survive deletes**. Ownership checks
in the orders family therefore resolve **including soft-deleted products** (a `withDeleted`-style
variant of the helper), while catalog/browse surfaces keep the plain null-filter (deleted products
correctly excluded).

## What already exists (reuse, don't rebuild)

- `store/_utils/seller-catalog-query.ts` → `resolveSellerProductIds(scope, sellerId)` — the fixed,
  unit-tested resolver; extend with an `{ includeDeleted }` option rather than forking a second helper.
- `store/_utils/__tests__/seller-catalog-query.unit.spec.ts` — regression spec to extend for the
  `includeDeleted` variant.
- The PR #74 migration pattern (two routes already converted:
  `store/sellers/me/products/[id]/route.ts`, `internal/seller-products/[id]/route.ts`).
- Backend unit-test rail (`npm run test:unit`, 304 green at last count) — the deterministic gate;
  backend has no per-branch preview, so live confirmation is post-merge (WAYS-OF-WORKING).
- The **enforced-sweep-list static-guard pattern** (LEARNINGS, seller-portal-rails-foundation S2 +
  raw-color guard) for the anti-recurrence story.

## Site inventory (fresh sweep 2026-07-11 — re-grep at build time anyway; files move)

**Story 1 — orders family, ownership incl. soft-deleted (10 files, 11 call sites) — HIGH:**
`store/sellers/me/orders/route.ts` · `orders/[id]/route.ts` (×2) · `orders/[id]/confirm-payment` ·
`orders/[id]/release-escrow` · `orders/[id]/return-request` · `orders/[id]/ship` ·
`orders/[id]/proof` · `orders/[id]/pickup-appointment` · `orders/[id]/tags` · `orders/bulk-status`.

**Story 1 also — public shop page (plain null-filter) — HIGH tier by blast radius:**
`store/sellers/[slug]/products/route.ts` — any shop's public product list 500s once the seller
soft-deletes one listing (same severity as the original Catálogo incident, public surface).

**Story 2 — remaining sites, plain null-filter (9 files, 10 call sites):**
`store/listings/route.ts` (browse — throw currently swallowed per-seller → silent missing seller
attribution) · `store/listings/[id]/route.ts` · `store/_utils/support-seller-resolution.ts` ·
`store/sellers/me/support-product/route.ts` (×2 — swallowed throw can fall through and create a
duplicate support product) · `store/envia/rates/route.ts` (swallowed → envía grant/Correos settings
silently lost at quote time) · `store/sellers/me/profit/apply-price/route.ts` ·
`admin/sellers/route.ts` · `internal/ml/publish/route.ts` · `internal/events-ticketing/redeem/route.ts`.
Where a site needs more than ids (e.g. `products.metadata` in support-product), an inline null-guard
with a comment pointing at the helper is acceptable — don't force-fit the helper.

## Stories (one sprint, three stories — Daniel's call 2026-07-11)

### Story 1 — Money-path + public-shop sweep (HIGH — Daniel merges, PR A)
**As a** seller, **I want** my order actions (view, confirm payment, release escrow, ship, return,
proof, pickup, tags, bulk status) and my public shop page to keep working after I delete any listing,
**so that** deleting a product never strands my in-flight orders or takes my shop offline.
**Acceptance:** with a test shop containing ≥1 soft-deleted product: (a) the public
`/store/sellers/[slug]/products` response is 200 and lists the live products; (b) every orders-family
route works against an order containing the *deleted* product — the ownership check still passes
(soft-deleted products count as owned); (c) an order containing *another seller's* product is still
403 (no ownership loosening — fail-closed preserved).
**QA stage:** extend `seller-catalog-query.unit.spec.ts` with the `includeDeleted` variant (null-slot
+ deleted-id-present cases); backend gate (`medusa build` → `tsc` → `test:unit`) green pre-merge;
**post-merge prod smoke owed to Daniel** (money path): soft-delete a disposable listing → confirm a
manual payment + ship on a pre-existing test order containing it.

### Story 2 — Remaining-sites sweep (LOW/MED — reviewer may merge on green, PR B)
**As a** buyer or admin, **I want** browse, listing detail, support resolution, shipping quotes,
profit apply-price, admin seller list, ML publish, and ticket redeem to tolerate a seller's deleted
products, **so that** no surface silently misattributes, duplicates, or drops data after a delete.
**Acceptance:** with the same test shop: browse (`/store/listings`) still attributes the seller's
live products; `support-product` reuses (never duplicates) the existing support primitive;
`envia/rates` still honors the shop's grant/Correos settings; each remaining route returns 200 with
correct data. Every site either calls `resolveSellerProductIds()` or carries an explicit null-guard.
**QA stage:** covered by the Story 3 guard (each migrated file drops off its allow-list) + backend
gate green.

### Story 3 — Anti-recurrence static guard (LOW — rides PR B)
**As a** future builder, **I want** a backend unit test that fails on any bare
`(…?.products ?? []).map(` shape in `src/api` outside an explicit allow-list, **so that** the 21st
call site can't silently reintroduce the crash.
**Acceptance:** guard scans `src/api` recursively; allow-list starts at the not-yet-migrated files
and ends **empty** when Stories 1–2 land; adding a new bare site fails `npm run test:unit` with a
message naming the helper. (Enforced-sweep-list shape — assert only what the sweep actually swept.)

## Kill-switch decision (Stage 6b — epic is `risk: high`)

**No flag — carve-out:** this is defensive null-filter hardening of existing reads with no new
runtime seam; the change is fail-safe by construction (a filter can only shrink an ownership set →
fail-closed; the `includeDeleted` ownership variant restores *shipped* intended behavior). A flag
would gate "not crashing" — flipping it off would only re-enable the crash. Rollback path is
`git revert` on `main`, per WAYS-OF-WORKING.

## In / out of scope

**In:** the ~20 backend sites above; the `includeDeleted` helper option; the static guard; regression
spec extensions.
**Out:** any frontend change; any new endpoint/table/flag; refactoring routes beyond the resolver
swap; fixing the upstream Medusa link behavior itself (sparse slots are Medusa v2's shape — we adapt);
`store/_utils/seller-product-update.ts:618`'s `variant.prices` map (different link, no evidence of
sparse behavior — noted, not swept).

## Open risks / build-time checks

- Confirm `remoteQuery.graph` supports a `withDeleted`/deleted-inclusive read for the seller→products
  link; if not, fall back to resolving ownership from the link module or a product query with
  `deleted_at` included. **Escalate, don't guess** if neither is clean — this is the one real unknown.
- Re-grep the site list at build time (files move; the sweep is 2 days old by then at best).
- `store/listings/route.ts` loops all sellers (take 1000) — swap the inner query for the helper
  without changing the N-queries shape (perf refactor is out of scope).
- Two PRs by tier (Daniel's call): PR A = Story 1 (HIGH, Daniel merges); PR B = Stories 2+3
  (reviewer-merge on green).

## Next step

**Gate:** Daniel approves this scope doc → run the scaffolder
(`node skills/groom/scaffold-epic.mjs --slug seller-catalog-null-slot-sweep --area 03 …`, single
sprint), set `epic:` + `status: scaffolded` here, regenerate `BUILD-ORDER.md`, emit the Claude Code
kickoff prompt.
