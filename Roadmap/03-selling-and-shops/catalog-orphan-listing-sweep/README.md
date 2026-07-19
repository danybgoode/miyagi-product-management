---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: catalog-orphan-listing-sweep
---

# Epic: Catalog orphan-listing sweep — drain the seller-less listings the 2026-07-15 fix left behind

> **Area:** 03 · Selling & Shops · **Risk:** high · **Class:** Bug · **Scope seed:** [`00-ideas/seeds/catalog-orphan-listing-sweep.md`](../../00-ideas/seeds/catalog-orphan-listing-sweep.md) · **Archetype:** Sweeper/Maintainer

## Why

The daily production smoke has been failing check 4 (embed iframe): the public catalog's first item
has an **empty `shop.slug`**, so `/embed/s/` + `''` resolves to a path with no slug segment, returns
a 308 instead of 200, and carries no `frame-ancestors` CSP header. A seller embedding their
storefront on their own site would get a broken iframe.

The empty slug is **deliberate** — `lib/ucp/schema.ts:367-384` emits it for a listing with no linked
shop, and its comment records that a synthetic placeholder slug was tried and reverted because every
consumer treats falsy as "no real shop." So the smoke is right and the assertion is right. **The
defect is the orphan row.**

The 2026-07-15 embed-iframe incident already produced the preventive fix: `seller-product-create.ts`
made product-create + seller-link atomic, so a published, seller-less listing can no longer be
*created*. **That closed the tap; it never drained the sink.** Rows from before the fix are still
published, still served, and one has now floated to `items[0]` — which is why this surfaced four
days later rather than immediately.

A second finding: `e2e/embed-shop.spec.ts:30-31` derives its slug the same way and `test.skip()`s on
a falsy value. `''` is falsy — so **CI has been reporting green on exactly this condition** while
the daily prod smoke caught it. The deterministic gate had a hole shaped like the bug.

## Medusa-first note

No new model, route, table, or flag. The orphan is a missing **seller↔product link** row in Medusa's
own link module — we fix data and add an invariant at the read boundary. `lib/ucp/schema.ts`'s
fallback branch **stays exactly as it is**: this epic makes the branch unreachable in production
data, it does not delete the branch (a defensive fallback that never fires is correct).

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
| 1 | 1.1 Report the orphans — read-only, **stop and show Daniel** | low |
| 1 | 1.2 Unpublish them (orphans with orders excluded + escalated) | high |
| 1 | 1.3 Invariant: no empty `shop.slug` anywhere in catalog output; fix the silent CI skip | low |

## Deploy order

Story 1.1 is read-only and can ship or simply be reported in the PR. **Story 1.2 does not start
until Daniel has read 1.1's output** — if the list is one test row this epic is ten minutes; if it's
three hundred rows with live orders, we re-groom rather than sweep. 1.2 is HIGH (mutates published
commerce data) → **Daniel merges**. 1.3 is LOW and may ride with 1.1.

No kill-switch — Stage 6b carve-out: unpublishing is reversible by republishing, and the guard is
fail-safe by construction. Rollback is republish + `git revert`.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append). **Candidate already visible: a `test.skip()` on a falsy value silently converts the exact defect it was meant to detect into a green run.**
- [ ] **Kill-switch:** N/A — carve-out recorded at grooming (Stage 6b): reversible data change, no runtime seam
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
