# Sprint 3 — Fulfillment, emails & agents

Goal: the personalization the buyer entered is prominently visible to the seller on the order, is
included in the confirmation emails to both parties, and is accessible to AI agents — closing the
loop so fulfillment never has to ask "what did you want it to say?"

Status: ✅ shipped · 🚧 in progress · 📋 planned. **✅ SHIPPED to prod 2026-06-05 — backend PR #4 (`ed3a6c6`) + frontend PR #19 (`2ba94bd`) merged, CI green.**

> **High-risk:** touches the order read-path, confirmation emails (money-adjacent), and the backend
> (`apps/backend`, deploys on merge via Cloud Build us-east4 — no preview). Daniel merges.

Maps to epic acceptance criteria **AC 4.1, AC 4.2, AC 4.3**.

---

## US-1 — Personalization visible on the order ✅
**As a** seller, **I want** the buyer's custom input shown next to the product on my order screen,
**so that** I fulfill it correctly.
- [x] Backend `normalizeMedusaOrder` (`store/sellers/me/orders/route.ts`) + the buyer orders route
      pass the line item's `metadata.personalization` through (today it's dropped as `metadata:
      null`).
- [x] Seller `OrderDetail.tsx` and buyer `OrderTrackingClient.tsx` render a prominent
      "Personalización" block beside the SKU/title (AC 4.1).

## US-2 — Personalization in the confirmation emails ✅
**As a** buyer, **I want** my custom input echoed in the confirmation email, **so that** I have
immediate peace of mind; **as a** seller, the same, so I have the spec in writing.
- [x] `lib/email.ts` `sendOrderConfirmedToBuyer` + `sendNewOrderToSeller` (+ the manual
      `sendCoordinated*` / `sendPickup*` variants) render the personalization (AC 4.2).
- [x] The callers that build the email context (Stripe / MP webhooks + `/api/orders/finalize-manual`)
      read the order line-item metadata and pass it through.

## US-3 — Agent-accessible (UCP/MCP) ✅
**As an** AI agent, **I want** to read a product's custom fields and submit the buyer's answers,
**so that** agentic purchases personalize too — and the payload is clean enough to route to external
inboxes (AC 4.3).
- [x] `/api/ucp/catalog` exposes each product's `custom_fields`.
- [x] `POST /api/ucp/checkout-session` accepts a clean `personalization` structure per line item.

---

## QA / smoke-test stage
- `tsc --noEmit` + `npm run build` green; backend has no preview → API-level **prod** smoke after
  merge + Daniel browser smoke.
- **Playwright spec** (one): the order-detail render shows the personalization given an order whose
  line item carries the metadata.
- Manual: place a test (manual/SPEI) order with personalization → seller + buyer order pages show
  the block; both confirmation emails include the text; `/api/ucp/catalog` exposes the fields. State
  splits in the PR.

## Definition of done (sprint)
The buyer's personalization is visible to the seller on the order, included in both confirmation
emails, and readable/submittable by agents via UCP. Risk tier: **high** → Daniel merge.
