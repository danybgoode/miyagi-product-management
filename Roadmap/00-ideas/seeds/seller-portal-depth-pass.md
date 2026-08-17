---
title: "Seller-portal depth pass — visible, reversible, honest, thumb-safe"
slug: seller-portal-depth-pass
status: scaffolded
area: "03"
type: feature
priority: wave-1
risk: high
epic: "03-selling-and-shops/seller-portal-depth-pass"
build_order: null
updated: 2026-08-17
---

# Scope — Seller-portal depth pass (P2·E of the seller-portal UX audit · F8–F11)

> **Status: ✅ SIGNED OFF (Daniel, 2026-08-17) — SCAFFOLDED.** Gate passed. The build contract is
> [`seller-portal-depth-pass`](../../03-selling-and-shops/seller-portal-depth-pass/README.md). This is
> the final unshipped workstream from the [`seller-portal-ux-audit`](./seller-portal-ux-audit.md)
> umbrella. P0·A (rails), P0·B (setup guide), P1·C (IA remainder, folded into catalog management),
> and P1·D (three-doors onboarding) are shipped.
>
> Current-code audit run 2026-08-17 against storefront `main` (`77541b5`) and backend `main`: there are
> zero `loading.tsx` files in the storefront; `OrdersInbox.handleBulkStatus()` applies immediately;
> catalog pause/channel toggles have undo but listing deletion and catalog bulk deletion do not; the four
> prohibited claims remain in `SellWizard.tsx` (`4×`, `3×`, `70%`) and `OrdersInbox.tsx` (`23%`); and the
> named 14–16px checkboxes / compact row-action clusters remain. The audit's canonical mapping is
> **F8 loading · F9 undo/bulk preview · F10 honest copy · F11 mobile ergonomics**.

## The ask (mirrored back)
*You want the last seller-portal audit workstream to make waiting visible, destructive actions reversible,
bulk order changes reviewable before they run, guidance factual and es-MX, and mobile controls reliably
thumb-sized — using the rails and commerce seams that already shipped. Right?*

## Class, lane, and Stage-2.5 bucket
**Feature / Builder · fixed-scope lane.** This is a bounded, code-verified audit remainder, not a new
strategic bet. Per the current operating posture, appetite/validation framing is opt-in and was not added.

**Stage-2.5 bucket: light enhancement over shipped machinery.** The product can already load every route,
soft-delete a listing, apply a source-agnostic bulk order transition, render shared feedback, and stage
catalog bulk diffs. What is missing is the seller-facing safety/communication layer around those abilities.
The only genuinely-new surface is a read-only order-status preview response; it introduces no new order
state or write path.

## Outcome
After this ships, a seller never gets a silent route transition, never commits a listing delete without a
10-second escape, and never advances a group of orders without first seeing each current → proposed state
and any refusal reason. The portal contains none of the audit's invented claims or bilingual label leaks,
and the named mobile controls meet the 44px interaction floor with row actions consolidated behind one
mobile sheet.

## What already exists (reuse, don't rebuild)
- **Next.js App Router loading boundary** — co-located `loading.tsx` files are the native route-transition
  seam. Build them from a small shared seller-skeleton component over the existing `.skeleton` class; no
  client-side global spinner and no second shell.
- **P0·A feedback rails** — `components/feedback/Toast`, `Banner`, and `useToast`; reuse the action slot for
  `Deshacer` and keep exactly one feedback implementation.
- **Existing soft-delete** — frontend `lib/listing-status.ts::deleteListing()` calls the seller-owned
  Medusa DELETE route, which uses `productService.softDeleteProducts()`, then maintains the Supabase read
  mirror and ML-close cascade. Keep that orchestration unchanged.
- **Lighter undo seam** — place the delete in a 10-second client-side pending state and call the existing
  soft-delete only when the window expires. `Deshacer` cancels before any write; this avoids a new restore
  token, deleted-object authorization path, or channel-republication contract. Medusa's product service
  exposes native [`restoreProducts()`](https://github.com/medusajs/medusa/blob/develop/packages/core/types/src/product/service.ts),
  but using it here would be the heavier path because this app must also restore the mirror and prior
  channel side effects.
- **Catalog staged-apply reference** — `CatalogTable` → `BulkActionBar` → `BulkDiffPreview`, with a pure
  diff seam and per-row validation/reporting. Reuse its interaction language, not its Supabase batch tables:
  an order preview is ephemeral and apply must re-read/re-check every order anyway.
- **One order transition seam** — backend `lib/order-status-transition.ts` already centralizes manual-
  payment eligibility, manual-carrier tracking admission, and the Medusa fulfillment workflows. The seller
  bulk route already proves every selected order belongs to the caller before applying. Preview and apply
  must consume one extracted plan/evaluate function; preview performs zero workflows/writes and apply
  re-checks after approval so stale rows become explicit skips.
- **Current mobile targets** — `OrdersInbox` owns the bulk checkboxes; `CatalogTable` now owns the listing
  row actions that the audit originally located in `ManageDashboard`; `SellWizard` owns subscription-tier
  and price-on-request checkboxes. Fix those current seams, not the audit's stale file location.
- **es-MX contract** — seller surfaces are Spanish-only (AGENTS rule 5). No dictionary expansion is owed.

## UX heuristics & rails check
- **Audit findings:** F8 (visibility), F9 (control/freedom), F10 (match/honesty), F11 (mobile ergonomics).
- **Rails:** R5 loading language · R6 before/during/after · R7 undo · R10 factual copy · R11 staged preview
  · R14 44px/mobile sheet · R15 complete, honest es-MX.
- **CI guards covering this surface:** the shipped design-token audit and swept-path enforcement remain;
  extend coverage only for files changed here. Add a loading-boundary population guard derived from the
  actual `app/(shell)/shop/manage/**/page.tsx` tree so a new route cannot silently land without a boundary.
- **Design-language debt:** build with existing semantic tokens and shared feedback/sheet primitives. This
  epic does not reopen the broader raw-token debt outside its changed files.

## Stories (smallest shippable slices)

### E.1 — Every seller route has a truthful loading state (F8 · R5/R6) — LOW
**As a** seller moving through my workspace, **I want** the next page to acknowledge my click with a layout-
shaped placeholder, **so that** I know the portal is working and what kind of page is coming.

**Acceptance:** every `page.tsx` under `/shop/manage` resolves to a co-located or explicitly-shared
`loading.tsx`; the fallback matches one of a small set of real page shapes (dashboard, table/list, form,
detail) and uses `.skeleton`; seller shell/nav stay stable; no fake completion percentage or indefinite
full-screen spinner; action buttons touched by this epic carry their own progressive busy label.

**QA:** pure/source spec derives the route population and fails if any current or future seller page lacks
a loading boundary; browser smoke throttles navigation to dashboard, orders, catalog, settings, and one
detail route and observes the skeleton before content. The new spec must be mutation-proven red.

### E.2 — Listing deletes have a real 10-second escape (F9 · R6/R7/R11) — LOW
**As a** seller cleaning my catalog, **I want** a short undo window after choosing delete, **so that** a
mis-tap does not remove a live listing.

**Acceptance:** single-row and staged bulk listing delete enter a visible 10-second pending state before the
existing soft-delete request runs; the row(s) disappear optimistically with one shared toast naming the
object/count and `Deshacer`; undo cancels the timer and restores the row(s) without any network write;
expiry invokes the existing `deleteListing` / catalog-batch apply path exactly once; failure restores the
rows and explains the next action. Remove copy claiming a soft-delete "no se puede deshacer". Pausing and
channel toggles keep their existing undo behavior.

**QA:** pure timer/state reducer spec covers schedule → undo → no write, schedule → expire → one write, and
write failure → restore; browser spec exercises both single and bulk delete with a stubbed request and
proves `Deshacer` prevents it. Mutation-prove the new spec red.

### E.3 — Bulk order status is preview → approve → report (F9 · R11) — HIGH
**As a** seller processing a batch of orders, **I want** to see what will change and which orders are unsafe
before I approve, **so that** one bulk click cannot silently advance the wrong fulfillment state.

**Acceptance:** choosing Procesando/Enviado/Entregado opens a staged preview instead of PATCHing; each row
shows order/listing identity, current → proposed state, and either `Listo` or the backend's refusal reason;
the approval CTA states the eligible count; preview performs zero writes/workflows; apply re-fetches and
re-evaluates ownership + eligibility through the same backend seam, advances eligible rows once, reports
stale/skipped rows individually, and never turns a preview into authority. Existing caps, mixed native/ML
support, manual-payment refusal, and US manual-carrier tracking refusal remain unchanged.

**Implementation boundary:** extract a pure transition-plan/evaluation function beside
`isOrderEligibleForBulkStatus`; add a read-only seller-owned preview method/route and a thin frontend proxy;
leave `applyOrderStatusTransition()` and the existing PATCH mutation semantics unchanged. No Supabase batch
table: order state can change between preview and approval, so apply must always re-check live Medusa data.

**QA:** backend unit specs cover eligible, manual-payment-blocked, tracking-blocked, stale/current-state,
and per-object ownership filtering; a mutation proves preview cannot call workflows/update; frontend API
spec proves Clerk gating and zero-write preview; browser spec selects mixed rows, previews, approves, and
renders a partial-success report. Authenticated mixed-order smoke is owed to Daniel if no disposable order
fixture exists. Every new spec is observed red once.

### E.4 — Guidance is factual and es-MX (F10 · R10/R15) — LOW
**As a** seller setting up and operating my shop, **I want** guidance based on my own state instead of threats
or made-up benchmarks, **so that** I can trust the portal's advice.

**Acceptance:** remove the exact `4×`, `3×`, `70%`, and `23%` claims; replace photo/description/REPUVE
guidance with concrete actions; replace the Orders threat with factual urgency derived from the seller's own
oldest waiting order; remove `State`, `Municipality`, and `Listing location` leaks from `SellWizard`; preserve
brand names and genuine values such as prices, counts, and `100% gratis` where they describe the product's
actual contract rather than a fabricated performance claim.

**QA:** copy-completeness/source spec bans the four claims and the named bilingual labels across the seller
surface; pure spec proves the urgency sentence derives from real order age/count and handles zero orders.
Mutation-prove the new spec red.

### E.5 — Named mobile controls meet the thumb floor (F11 · R14) — LOW
**As a** seller working from my phone, **I want** selection and row actions I can hit reliably without
opening the wrong order/listing, **so that** routine catalog and fulfillment work is safe on mobile.

**Acceptance:** OrdersInbox and CatalogTable selection controls expose at least a 44×44 hit area without
making the glyph itself oversized; SellWizard's subscription-tier, remove-plan, and price-on-request
controls meet the same floor; catalog row pause/channel/delete clusters collapse to one labelled `Más`
trigger on mobile and open the existing sheet pattern with the same actions/outcome copy; desktop retains
the efficient inline actions; no action disappears at either breakpoint.

**QA:** browser spec at 390px measures the rendered hit rectangles, opens the row-action sheet, and proves
each action is reachable; desktop assertion proves the inline controls remain. Mutation-prove the spec red.

## Suggested sprinting
- **Sprint 1 — Visible and thumb-safe:** E.1 + E.5. Frontend-only, LOW.
- **Sprint 2 — Reversible and honest:** E.2 + E.4. Frontend-only, LOW.
- **Sprint 3 — Order preview contract:** E.3. Backend + frontend, HIGH because it touches a seller-owned
  order/fulfillment route and its authorization boundary; one cross-family review is required by the
  current review policy. Backend deploys first; frontend degrades by retaining the current apply path only
  until both halves are live, then the preview becomes the sole UI entry.

Epic mode remains the default: stack the sprint branches because `OrdersInbox`, `CatalogTable`, and the
seller UX specs are shared hot files.

## Scope
**In v1:** all current `/shop/manage` page routes covered by content-shaped loading boundaries; durable
route-population guard; delayed-commit undo for single and catalog-bulk listing soft-delete; read-only bulk
order preview + approve + per-row report over the existing transition/ownership seams; the four prohibited
claims, Orders threat framing, and named es-MX leaks removed; 44px targets and the mobile catalog-row sheet
on the audit's current code paths; one api/pure/browser spec per testable story; smoke walkthroughs.

**Out of v1:** a global progress spinner; a new feature flag (not requested, contrary to current default);
new order states, fulfillment rules, agent/MCP actions, or catalog batch tables; a Medusa restore endpoint or
deleted-object token; a portal-wide redesign/token sweep; autosave for the full SellWizard; undo for truly
external/re-auth actions such as disconnecting Mercado Libre or Mercado Pago; buyer/admin surfaces.

## Risk and runtime gate
**Epic risk: HIGH only because E.3 changes an authenticated order/fulfillment route contract.** E.1/E.2/
E.4/E.5 are LOW. The hard boundary is behavior preservation: preview is read-only; apply continues to
enforce seller ownership and every payment/fulfillment refusal on live data. Any proposal to trust the
client preview, weaken per-order ownership, or change `applyOrderStatusTransition()` is out of scope and
must stop for a new product/architecture decision.

**No runtime flag.** The product owner did not request one, the project defaults to no new flags, and there
is no independently-failing third-party integration here. The safe seams are structural: read-only preview
before the unchanged apply, deferred delete before the unchanged soft-delete, and ordinary `git revert`.

## Rabbit holes patched in advance
- **Do not implement undo as restore-after-delete.** Native `restoreProducts()` exists, but a complete
  restore also needs deleted-object authorization, mirror status, and prior ML/publication side effects.
  Delaying the existing delete for 10 seconds gives the seller the promised escape with no partial restore.
- **Preview is not authorization.** It never mints a durable confirm token and never permits a later apply;
  PATCH re-reads the orders and re-runs ownership/eligibility. A state change between screens is a named
  skip in the report, not a stale success.
- **Do not hand-maintain a route count.** The loading guard derives its population from files so it stays
  accurate as seller routes change.
- **Fix current owners, not stale audit paths.** Catalog management moved listing actions out of
  `ManageDashboard` into `CatalogTable`; the depth pass follows the live code.
- **No copy overreach.** Remove unsupported performance claims, not real product facts (`0%` commission,
  `100% gratis`) or merchant-derived counts/times.

## Product-owner acceptance (run on a preview, then production)
1. Navigate among Resumen, Pedidos, Catálogo, Configuración, and an order detail on a throttled connection.
   Each transition immediately shows a content-shaped skeleton inside the stable seller shell.
2. Delete one disposable listing, then press `Deshacer` within 10 seconds. It remains live and no DELETE
   request occurs. Repeat without undo; it disappears after the timer and stays absent after reload.
3. Stage a bulk catalog delete and undo it; no selected listing is deleted. Repeat and let it expire; the
   existing per-row apply report appears.
4. Select a mix of order states, choose a target status, and review the old → new preview. An unpaid manual
   order and any tracking-incomplete US manual-carrier order show why they cannot advance. Approve; only
   eligible orders advance and the final report names every skip.
5. Open `/sell` and `/shop/manage/orders`: none of `4×`, `3×`, `70%`, `23%`, `State`, `Municipality`, or
   `Listing location` appears; urgency refers only to the seller's real waiting orders.
6. At 390px, tap the order/catalog checkboxes, subscription controls, and the catalog row `Más` control.
   Each target is easy to hit, the sheet exposes every row action, and desktop still shows inline actions.

## Open risks / research
- The storefront working copy inspected for this groom is detached and behind local `main`; all code claims above
  were therefore verified with `git show main:…`, not the dirty checkout. Re-derive against `origin/main`
  during the architecture-lock pass before builders start.
- The backend preview route is HIGH by project policy because per-object seller authorization sits beside
  it. Keep ownership resolution shared and add a negative cross-seller case; a signed-in-only preview is an
  IDOR even if it writes nothing.
- A real mixed-order browser smoke may be unavailable without disposable native + ML/manual-payment orders.
  The deterministic backend planner specs and authenticated API smoke remain the gate; name the fixture gap
  rather than treating unavailable as no defect.
- Medusa's product module documents `restoreProducts()` for soft-deleted products, but v1 deliberately does
  not use it. If delayed commit proves incompatible with navigation semantics during build, stop and re-scope
  the restore authorization/channel contract instead of quietly adding it.

## Definition of Ready check
- [x] User outcome and Daniel-runnable acceptance are explicit.
- [x] Class/lane and Stage-2.5 bucket named; current project posture makes appetite opt-in, not required.
- [x] v1/in-out boundary written; no new feature flag, module, table, or order state.
- [x] Platform-first reuse list produced from current frontend + backend code.
- [x] Canonical audit IDs and moved current file ownership corrected.
- [x] Every story risk-tiered; pure/API/browser QA and smoke owner named; new specs must be observed red.
- [x] HIGH runtime-gate decision recorded: no flag; structural read-only/deferred-write seams instead.
- [x] **Daniel approved this scope doc (2026-08-17).** Epic + three sprint docs scaffolded at
      [`03-selling-and-shops/seller-portal-depth-pass`](../../03-selling-and-shops/seller-portal-depth-pass/README.md);
      the generated build-order view and epic-mode kickoff are emitted from that contract.
