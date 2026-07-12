---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: seller-catalog-null-slot-sweep
---

# Epic: Seller-catalog null-slot sweep — resolveSellerProductIds() across ~20 routes

> **Area:** 03-selling-and-shops · **Risk:** high · **Scope seed:** [`00-ideas/seeds/seller-catalog-null-slot-sweep.md`](../../00-ideas/seeds/seller-catalog-null-slot-sweep.md) · **Archetype:** Sweeper/Maintainer

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
| 1 | 1.1 Money-path orders family + public shop page (ownership incl. soft-deleted) — **PR A** | high |
| 1 | 1.2 Remaining ~9 sites (plain null-filter / inline guards) — **PR B** | low |
| 1 | 1.3 Anti-recurrence static guard (allow-list ends empty) — rides **PR B** | low |

## Deploy order

Backend-only (`apps/backend`), no frontend change. Two PRs by tier (Daniel's call at grooming):
**PR A** (Story 1.1) is HIGH — Daniel merges; **PR B** (Stories 1.2 + 1.3) is LOW — reviewer may
merge on green CI, after PR A lands (the guard's allow-list must reflect PR A's migrations). No
kill-switch — Stage 6b carve-out recorded in the seed: defensive hardening of existing reads, no new
runtime seam, fail-safe by construction; rollback is `git revert` on `main`. Backend deploys
post-merge via Cloud Build (~12 min, no preview) — prod smoke follows deploy.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** N/A — carve-out recorded at grooming (Stage 6b, see seed): no runtime seam, fail-safe by construction
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
