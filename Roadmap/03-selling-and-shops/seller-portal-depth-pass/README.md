---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
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

**Shipped 2026-08-17.** Backend PR [#161](https://github.com/danybgoode/medusa-bonsai-backend/pull/161)
merged first at `41468b1`; frontend PR [#388](https://github.com/danybgoode/miyagisanchezcommerce/pull/388)
merged at `31ea042`.

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

## Architecture lock (2026-08-17)
Verified against frontend `origin/main` `f5081c3` and backend `origin/main` `a741920`. No new table,
migration, flag, entitlement, or provider is introduced, so production row counts cannot change any
decision in this build; the live-data migration gate is therefore not applicable rather than assumed
empty.

- **D1 — Loading ownership:** `app/(shell)/shop/manage` currently has no `loading.tsx` anywhere. Add one
  inherited manage fallback built from a shared `SellerPageSkeleton`, then shape-specific overrides for
  orders, order detail, catalog, and settings. A source guard walks the real route tree and proves every
  manage `page.tsx` reaches an ancestor boundary; it never stores a hand-counted route total.
- **D2 — Loading design:** keep the existing seller shell, tokens, type, radii, and `.skeleton` animation.
  The skeleton describes page geometry only—title, controls, cards/rows/form fields—with no fake progress,
  invented data, second shell, or global spinner.
- **D3 — Mobile action ownership:** `OrdersInbox`, `CatalogTable`, and `SellWizard` remain the owners of
  the named controls. Checkbox glyphs stay visually small inside 44×44 labels. Catalog desktop actions
  remain inline; mobile gets one labelled `Más` trigger and an operational bottom sheet containing the
  same pause, channel/publication, and delete actions. No action or entitlement rule is forked.
- **D4 — Delete undo:** a client provider mounted inside `SellerShellChrome` owns exactly one pending
  delete for 10 seconds, so it survives nested seller navigation. Scheduling hides affected rows and
  shows the shared `Toast` with `Deshacer`; undo clears the timer before any request, reload/unmount clears
  it, expiry calls the unchanged single DELETE or catalog-batch apply endpoint once, and failure releases
  the pending ids so rows return. Medusa restore remains out of scope.
- **D5 — Honest copy:** remove only the four unsupported performance figures and the named bilingual
  leaks. Replace them with concrete photo, description, REPUVE, and order-age guidance derived from the
  seller's actual oldest waiting order. Preserve real product facts and brand names.
- **D6 — One order planner:** backend `order-status-transition.ts` owns a pure plan containing current
  status, proposed status, eligibility, and refusal reason. It composes the already-shipped manual-payment
  and US manual-carrier guards. Both preview and apply call that planner; workflow/update code stays only
  in `applyOrderStatusTransition()` after an eligible plan.
- **D7 — Preview is not authority:** `POST /store/sellers/me/orders/bulk-status/preview` authenticates,
  resolves the seller product set once, re-reads each order, and returns identity plus its plan only after
  per-object ownership succeeds. Missing and foreign ids share one non-disclosing refusal. Preview never
  runs a workflow or update and mints no token.
- **D8 — Staleness contract:** the frontend sends the previewed `current_status` map with the existing
  PATCH. PATCH re-reads ownership and live order state, calls the same planner, and reports a changed row
  as skipped; the baseline is evidence of what the seller reviewed, never authorization. Callers that omit
  the optional baseline retain the existing PATCH contract.

### Sprint 1 build contract (locked before implementation)
Implement D1–D3 only. Reuse the current token system and SellerNav sheet language. The visual signature is
operational rather than decorative: at mobile width, one quiet `Más` control opens a complete action ledger
for the row. Do not redesign the table, nav, typography, or palette.

### Sprint 2 build contract (locked before implementation)
Implement D4–D5. The seller-shell provider is the sole timer/request owner; CatalogTable and
BulkDiffPreview only schedule and render pending state. Never call a restore endpoint and never write before
the timer expires.

### Sprint 3 build contract (locked before implementation)
Implement D6–D8. Backend deploy order remains first. The frontend must not expose the apply control until a
successful backend preview exists, and it must retain skipped rows in selection for correction/retry.

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
- [x] All sprints merged to `main` + smoke-tested (gaps stated)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory updated through this retrospective and the promoted `Roadmap/LEARNINGS.md` rule (no tracked `MEMORY.md` exists in this root repo)
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Runtime gate decision preserved: **no new flag**; preview stays read-only and delete stays delayed-
      commit as scoped
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
