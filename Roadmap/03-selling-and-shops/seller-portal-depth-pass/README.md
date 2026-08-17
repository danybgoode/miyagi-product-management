---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: seller-portal-depth-pass
---

# Epic: Seller-portal depth pass

> **Area:** 03-selling-and-shops · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/seller-portal-depth-pass.md`](../../00-ideas/seeds/seller-portal-depth-pass.md)

## Why
The first four seller-portal UX-audit workstreams shipped the shared design rails, setup guide, repaired
information architecture, and guided onboarding. The final depth pass makes the workspace feel dependable
in ordinary use: route changes acknowledge the wait, a mistaken listing delete has a real escape, a bulk
order change is reviewed before it runs, guidance stays factual and Spanish, and mobile controls can be
hit without opening the wrong order or listing.

## Platform-first note
No new commerce model. Medusa remains the order/product system of record. Listing deletion continues
through the seller-owned native product soft-delete path; its undo window cancels before that existing
write. Order preview is a read-only plan over the same Medusa order, seller-ownership, manual-payment, and
fulfillment rules that the existing bulk apply route re-checks. No Supabase batch table, new order state,
or parallel fulfillment logic.

## What already exists (reuse, don't rebuild)
- Next App Router's co-located `loading.tsx` boundary + the existing `.skeleton` class in `globals.css`.
- P0·A's shared `Toast`, `Banner`, `useToast`, semantic tokens, and existing seller sheet language.
- `lib/listing-status.ts::deleteListing()` and the seller-owned Medusa DELETE route, including mirror and
  Mercado Libre close side effects; defer this call for 10 seconds rather than inventing restore-after-delete.
- Catalog's shipped staged interaction: `CatalogTable` → `BulkActionBar` → `BulkDiffPreview`.
- Backend `lib/order-status-transition.ts`, including manual-payment and manual-carrier admission, plus
  `store/sellers/me/orders/bulk-status`, which already proves per-order seller ownership before apply.
- Current owners of the audit's mobile debt: `OrdersInbox`, `CatalogTable`, and `SellWizard` (catalog
  management moved listing row actions out of the audit's stale `ManageDashboard` location).
- Seller surfaces' existing es-MX-only contract; no locale dictionary expansion.

## Architecture constraints to verify and lock before builders start
These are grooming decisions, not substitutes for the epic-mode architecture-lock pass. The orchestrator
must re-derive them against the then-current `origin/main` and record locked `D1…Dn` decisions here before
dispatching any story.

- Preview is never authority: it performs no workflow/write and mints no confirm token; apply re-reads and
  re-evaluates every order so a state change becomes an explicit skip.
- Preview and apply consume one transition-plan/evaluation function; `applyOrderStatusTransition()` and its
  existing fulfillment semantics do not change.
- Undo is delayed commit: a shared seller-shell pending-delete owner survives in-app navigation, and
  `Deshacer` cancels before the existing soft-delete. Do not add deleted-object authorization or restore
  channel side effects inside this epic.
- The loading guard derives its population from the route tree. No hand-maintained route count.
- Fix the named current controls/copy; do not turn this into a portal-wide redesign or token sweep.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Every seller route has a truthful loading state | low |
| 1 | 1.2 Named mobile controls meet the thumb floor | low |
| 2 | 2.1 Listing deletes have a real 10-second escape | low |
| 2 | 2.2 Guidance is factual and es-MX | low |
| 3 | 3.1 One read-only order transition plan | high |
| 3 | 3.2 OrdersInbox preview → approve → report | high |

## Deploy order
Sprint 1 → Sprint 2 → Sprint 3 on stacked frontend branches because `CatalogTable`, `OrdersInbox`, and the
seller UX specs are hot across the work. Sprint 3 has a backend PR and a frontend PR: merge/confirm the
backend read-only preview route first (Cloud Run has no branch preview), then merge the frontend that makes
preview the sole bulk-status UI entry. The old frontend continues using the unchanged PATCH while only the
backend half is live. No migration and no feature flag.

## Risk and review
The epic is HIGH only because Sprint 3 extends an authenticated, per-object order/fulfillment route
contract. Sprints 1–2 are LOW UI work. Sprint 3 must run the current one cross-family review for an
authorization boundary; all PRs still require the deterministic gate and every new spec mutation-proven
red once. No runtime flag was requested or scoped: safety is structural (read-only preview before unchanged
apply, delayed delete before unchanged soft-delete) and rollback is `git revert`.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Runtime gate decision preserved: **no new flag**; preview stays read-only and delete stays delayed-
      commit as scoped
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
