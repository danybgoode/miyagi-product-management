# Seller-portal depth pass — Sprint 3: Order preview contract

**Status:** ⬜ not started

## Stories

### Story 3.1 — One read-only order transition plan
**As a** seller preparing a batch of orders, **I want** the platform to evaluate each proposed status before
anything changes, **so that** unsafe or stale rows are explained rather than silently advanced.

**Acceptance:** extract one pure transition-plan/evaluation function beside the existing status seam;
`POST /store/sellers/me/orders/bulk-status/preview` proves every order belongs to the caller and returns
identity, current → proposed state, eligible/refused, and the exact refusal reason; preview performs zero
Medusa workflows or writes; the existing PATCH consumes the same plan and re-checks live state after
approval; caps, mixed native/ML support, manual-payment refusal, and US manual-carrier tracking refusal stay
unchanged; a cross-seller order is never disclosed in preview or touched by apply.

**Risk:** high — authenticated per-object order/fulfillment contract.

### Story 3.2 — OrdersInbox preview → approve → report
**As a** seller processing a batch of orders, **I want** to see what will change before I approve, **so that**
one bulk click cannot silently advance the wrong fulfillment state.

**Acceptance:** choosing Procesando/Enviado/Entregado opens the staged preview instead of PATCHing; every row
shows order/listing identity, current → proposed state, and `Listo` or the backend refusal; the approval CTA
names the eligible count; cancelling writes nothing; applying calls the unchanged PATCH, reports every
advanced/stale/skipped row, and clears only completed selection; preview is the sole UI entry after the
backend half is live. Use catalog's staged interaction language but no Supabase batch table or confirm token.

**Risk:** high — consumer of the authenticated preview/apply boundary.

## Sprint QA
- **backend unit spec(s):** planner covers eligible, manual-payment-blocked, tracking-blocked, stale/current-
  state, cap, and cross-seller ownership; preview cannot invoke workflows/update; PATCH still re-evaluates.
- **frontend api spec(s):** Clerk gating for preview and apply, malformed/cross-seller inputs never 500 or
  disclose another order, preview response normalization, and zero-write cancel path.
- **browser spec:** select mixed rows, preview, cancel, preview again, approve, then render a partial-success
  report with explicit skips.
- **browser smoke owed:** Daniel's authenticated mixed-order production walkthrough if no disposable native
  + ML/manual-payment fixture exists. This is fulfillment/auth, not a real-money charge.
- **red proof:** bypass the planner in PATCH and allow a cross-seller preview fixture; observe the new backend
  specs fail before restoring the implementation.
- **deterministic gate:** backend `npm run build` → `npx tsc --noEmit` → `npm run lint` → `npm run test:unit`;
  frontend `npx tsc --noEmit` → `npm run lint` → `npm run build` → Playwright `api`, all green before merge.
- **review:** run the current one cross-family HIGH-tier review on the authorization-boundary PR(s), then
  re-run the deterministic gate on the fixed tips.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (frontend preview after backend production deploy pre-merge)

1. Sign in as a seller with disposable mixed-status orders and go to
   https://miyagisanchez.com/shop/manage/orders.
   → The inbox renders the existing native and Mercado Libre orders with bulk selection controls.
2. Select an eligible paid order plus an unpaid manual-payment order; choose `Enviado`.
   → A preview opens before any write: the paid order is `Listo`; the unpaid order states that payment must
   be confirmed. The CTA names only the eligible count.
3. Close the preview, then reload the inbox.
   → Neither order changed; cancelling preview performs no write.
4. Open the preview again and approve.
   → The eligible order advances once; the unpaid order remains unchanged; the final report names both
   outcomes and the inbox refreshes without losing unresolved selection.
5. If a disposable US manual-carrier order is available, include it in an `Enviado` preview without carrier
   and tracking data.
   → It is refused with the existing tracking requirement; no fulfillment workflow runs for that row.
6. Attempt the preview/API with an order belonging to another seller using the negative test fixture.
   → The order is neither disclosed nor updated; the request produces an explicit refusal, never a 500.

If any step fails, note the step number + what you saw — that's the bug report.
