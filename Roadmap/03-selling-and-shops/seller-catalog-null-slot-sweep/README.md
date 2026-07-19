---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: seller-catalog-null-slot-sweep
---

# Epic: Seller-catalog null-slot sweep — 23 unsafe reads across 21 runtime files

> **Area:** 03 · Selling & Shops · **Risk:** high · **Class:** Bug · **Scope seed:** [`00-ideas/seeds/seller-catalog-null-slot-sweep.md`](../../00-ideas/seeds/seller-catalog-null-slot-sweep.md) · **Archetype:** Sweeper/Maintainer

> ✅ **Shipped 2026-07-19.** Backend
> [PR #104](https://github.com/danybgoode/medusa-bonsai-backend/pull/104), squash `f813206`, migrated
> the full re-derived inventory in one HIGH release and deployed as Cloud Run revision
> `medusa-web-00003-jgv`.

## Why

Deleting a listing is a normal, everyday seller action — and today it silently arms a crash across
~20 backend routes. The seller→products link returns a null slot for every soft-deleted product, and
any route that maps that array bare 500s on the next fetch: the seller's order actions (confirm
payment, release escrow, ship), their **public shop page**, and quieter surfaces where the throw is
swallowed (browse misattributes the seller, support-product can duplicate itself, shipping quotes
lose the shop's Envía grant/Correos settings). This epic finishes what hotfix PR #74 started: every
site adopts the proven fix, orders keep working for since-deleted listings, and a static guard keeps
the pattern from coming back.

## Medusa-first note

No new model, route, table, or flag. The sparse null slot is Medusa v2's own `remoteQuery` link
behavior after `softDeleteProducts()` — we adapt at the read sites. The fix primitive
(`resolveSellerProductIds()`) already exists and is unit-tested; the only extension is an
`includeDeleted` option so **order-ownership checks count soft-deleted products as owned** (orders
survive deletes — shipped product behavior, reconfirmed by Daniel at grooming 2026-07-11).

## What already exists (reuse, don't rebuild)

- `apps/backend/src/api/store/_utils/seller-catalog-query.ts` → `resolveSellerProductIds(scope, sellerId)` — the fixed, null-filtering resolver (PR #74, squash `62f32c1b`). Extend with `{ includeDeleted }`; don't fork a second helper.
- `store/_utils/__tests__/seller-catalog-query.unit.spec.ts` — the null-slot regression spec to extend.
- The PR #74 migration pattern — two routes already converted: `store/sellers/me/products/[id]/route.ts`, `internal/seller-products/[id]/route.ts` (plus both `bulk-apply` routes calling the helper).
- Backend unit-test rail (`medusa build` → `tsc --noEmit` → `npm run test:unit`) — the deterministic gate; **no per-branch preview**, live confirmation is post-merge.
- The enforced-sweep-list static-guard pattern (LEARNINGS — raw-color guard, seller-portal-rails-foundation S2) for Story 1.3.
- The full validated site inventory + failure-mode notes live in the scope seed — re-grep at build time (files move).

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Money-path orders family + public shop page (ownership incl. soft-deleted) | high |
| 1 | 1.2 Remaining sites, including the seed-missed home-personalization read and historical ticket redemption | high |
| 1 | 1.3 Import-aware TypeScript-AST inventory guard + fail-closed all-item ownership seam | high |

## Deploy order

Backend-only (`apps/backend`), one HIGH PR. Validation showed the planned LOW half contained the
active production attribution failure and shared the same helper/root cause, so splitting it would
have left the incident live through a second review/deploy. The consolidated gate and fresh review
also found and fixed ticket redemption plus pre-existing fail-open/partial order ownership paths.
No kill-switch — defensive hardening of existing reads; rollback is `git revert` on `main`.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** N/A — carve-out recorded at grooming (Stage 6b, see seed): no runtime seam, fail-safe by construction
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
