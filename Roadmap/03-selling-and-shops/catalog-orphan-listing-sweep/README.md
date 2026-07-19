---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: catalog-orphan-listing-sweep
---

# Epic: Catalog shop-slug invariant — the “orphan” was a null-slot read failure

> **Area:** 03 · Selling & Shops · **Risk:** high · **Class:** Bug · **Scope seed:** [`00-ideas/seeds/catalog-orphan-listing-sweep.md`](../../00-ideas/seeds/catalog-orphan-listing-sweep.md) · **Archetype:** Sweeper/Maintainer

## Why

> ✅ **Premise corrected 2026-07-19.** A read-only production audit proved the reported product
> already had an active seller link to live shop `andrea-shops`, with zero orders. The same seller
> had eight soft-deleted test products whose surviving link rows produced sparse relation slots.
> `store/listings` swallowed that read error per seller and dropped every product→seller mapping,
> making the live product *look* ownerless. Backend PR
> [#104](https://github.com/danybgoode/medusa-bonsai-backend/pull/104) fixed the shared read class;
> frontend [PR #286](https://github.com/danybgoode/miyagisanchezcommerce/pull/286) closed the
> green-by-skip gate. **No listing was unpublished and no production data was mutated.**

The daily production smoke has been failing check 4 (embed iframe): the public catalog's first item
has an **empty `shop.slug`**, so `/embed/s/` + `''` resolves to a path with no slug segment, returns
a 308 instead of 200, and carries no `frame-ancestors` CSP header. A seller embedding their
storefront on their own site would get a broken iframe.

The empty slug fallback is **deliberate** — `lib/ucp/schema.ts` emits it when its input has no
resolved shop. The smoke was right and the assertion was right; the groomed conclusion that the
database row lacked a seller link was wrong. The defect was the upstream attribution read.

The 2026-07-15 atomic-create fix remains correct prevention for true missing links, but it did not
explain this row. Validation followed both directions of the relationship before allowing a HIGH
data mutation, which is what prevented a valid listing from being unpublished.

A second finding: `e2e/embed-shop.spec.ts:30-31` derives its slug the same way and `test.skip()`s on
a falsy value. `''` is falsy — so **CI has been reporting green on exactly this condition** while
the daily prod smoke caught it. The deterministic gate had a hole shaped like the bug.

## Medusa-first note

No new model, route, table, flag, or data sweep. The backend sibling epic fixed Medusa sparse-link
reads; this epic adds the frontend invariant. `lib/ucp/schema.ts`'s fallback branch **stays exactly
as it is**.

## What already exists (reuse, don't rebuild)

- `apps/backend/src/api/store/_utils/seller-product-create.ts` — the already-shipped atomic create.
  **Read it first**, so the sweep's definition of "orphan" matches the invariant the create path now
  enforces.
- `apps/miyagisanchez/lib/ucp/schema.ts:359-386` — the shop payload + the documented fallback. Do not
  edit the fallback; do not reintroduce a placeholder slug (tried and reverted — the comment says so).
- `apps/miyagisanchez/e2e/embed-shop.spec.ts` — extend it. Do not fork a second embed spec.
- The enforced-sweep-list static-guard pattern (LEARNINGS — raw-color guard,
  seller-portal-rails-foundation S2) for Story 1.3's invariant.
- Backend unit-test rail (`medusa build` → `tsc --noEmit` → `npm run test:unit`) — the deterministic
  gate. **No per-branch backend preview**; live confirmation is post-merge (WAYS-OF-WORKING §5).
- The related-but-inverse epic `seller-catalog-null-slot-sweep` (same link table, opposite
  direction: seller present, product soft-deleted). Whoever builds second **re-reads the other's
  helper before adding a third resolver.**

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Validate the apparent orphan bidirectionally — result: linked live product, zero true orphans | low |
| 1 | 1.2 Unpublish apparent orphans — **cancelled as unsafe/no-op after 1.1 disproved the premise** | high |
| 1 | 1.3 Invariant: no empty `shop.slug` anywhere in paginated catalog output; remove silent CI skip | low |

## Deploy order

Actual order: read-only production audit → backend PR #104/deploy → production invariant green →
test-only frontend PR #286. Story 1.2 never ran because Story 1.1 invalidated its authorization
premise. This is the intended behavior of the stop-before-mutation gate, not unfinished work.

No kill-switch — the shipped change is a test-only invariant and the proposed production mutation
never ran. Rollback is `git revert` of frontend PR #286; there is no catalog data rollback.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append).
- [x] **Kill-switch:** N/A — no data change or runtime seam shipped
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
