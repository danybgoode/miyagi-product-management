---
title: "Delivery & manual-money polish (#3c Epic B)"
slug: delivery-money-polish
status: scaffolded
area: "02"
type: feature
priority: wave-3
risk: high
epic: "02-checkout-and-payments/delivery-money-polish"
build_order: "#3c-B"
updated: 2026-06-08
---

# Scope — Delivery & Manual-Money Polish (BUILD-ORDER #3c · Epic B)

> **Status: ✅ SIGNED OFF (Daniel, 2026-06-07).** Gate passed. Scaffolded under
> `02-checkout-and-payments/delivery-money-polish/` (epic README + sprint-1..3); kickoff prompts emitted.
> **Next action: Claude Code build, Sprint 1 first** (backend-first). **B.5 arranged-only remains
> deferred behind Spike 0.** Deep-groom of #3c Epic B. Groomed 2026-06-07 off the #3c wave scope
> ([`remaining-audit-polish.md`](remaining-audit-polish.md)) + a fresh Medusa-first code read this pass.
> **Class: Feature/epic** (money-path + fulfillment hardening — extend shipped-but-half-built flows).
> **Stage-2.5 bucket: genuinely-needs-build, but heavily reuse-shrunk** — the refund machine, pickup
> spots, and CP-first lookup all already exist; the work is the *durable middle-states* and a few
> reorders, not new systems. **Risk: HIGH — Daniel merges** (payments / refunds / fulfillment).

## The ask (mirrored back)
*You want the delivery + manual-money tail the #3a audit flagged cleaned up as one epic: the assisted
refund lifecycle made **durable, two-sided, and honest** for off-platform (SPEI/cash) transfers; pickup
upgraded from an external scheduling link to a real **propose-and-confirm appointment**; the checkout
address form actually **CP-first**; and Envía quote failures/hangs given **recovery + a timeout**. The
arranged-only policy work (B.5) stays out, blocked behind Spike 0. Right?*

## Daniel's decisions this groom (2026-06-07)
1. **Refund off-platform confirmation → TWO-SIDED.** Seller marks "ya transferí" → `transferencia_pendiente`
   → buyer confirms "recibí el reembolso" → `confirmado`. Mirrors the #3b shared buyer/seller state; the
   Epic-C ledger shows both sides. (Card/Stripe refunds, which actually execute, auto-confirm.)
2. **Pickup → PROPOSE-AND-CONFIRM appointment.** Buyer proposes a date + time window at checkout; seller
   confirms/reschedules. Persists on the order (Medusa metadata). **No slot-inventory engine.**
3. **Keep Epic B together** — one delivery epic, ~3 sprints, high-risk-first. **B.5 arranged-only stays
   deferred** behind Spike 0 (gets its own slice once the spike decision lands).

## What the code actually shows (Medusa-first reframe — read the model first)
The audit named these as "deferred" items; reading the code re-scopes every one *smaller*:

- **Refund/return is already a working machine, on `order.metadata`.** The Medusa backend
  `…/store/buyer/me/orders/[id]/return-request` (create) + `…/store/sellers/me/orders/[id]/return-request`
  (PATCH: `accept` / `decline` / `seller_refund`, partial via `refund_amount_cents`) persists the
  request on `order.metadata` with statuses `requested → seller_accepted / declined / refunded` (+
  `seller_action`, `refund_status`, `refund_amount_cents`, `refunded_at`) and runs Medusa's
  **`refundPaymentWorkflow`** for provider (card) refunds. The frontend proxies
  (`app/api/orders/[id]/return-request{,/[requestId]}/route.ts`) and the UI is wired in `OrderDetail.tsx`
  (buyer request + seller accept/partial/decline + a seller-initiated refund). **Gap:** no durable
  *off-platform* middle-states — for SPEI/cash there's no `refundPaymentWorkflow` money movement, so
  "refunded/emitido" overstates reality (#3b fixed only the copy). **B.1 = extend this metadata model
  with the two-sided off-platform states; do NOT build a new machine.**
- **Pickup already has spots (WHERE).** `CheckoutExperience.tsx` models `pickup_spots[]`
  (`requires_pickup_spot`, `selectedPickupSpotId`, an external `scheduling_url`) and renders a spot
  picker. **Gap:** no reserved *time* (WHEN). **B.2 = add a proposed date/time-window persisted on the
  order + a seller confirm/reschedule, reusing the existing spot selection — not a pickup system from
  scratch.**
- **CP-first lookup already exists.** `CheckoutExperience.tsx` has the CP-first lookup (`/api/checkout/postal-lookup`,
  `cpResolved`, "Empieza con tu código postal — llenamos estado, alcaldía y colonias"). **Gap:** the
  *visible field order* still renders phone (`:394`) above the CP block (`:400`). **B.3 = a field
  REORDER, near-trivial — the machinery is done.**
- **Envía quoting has no timeout.** `lib/envia.ts:171 quoteShipments` uses `Promise.allSettled` (`:180`)
  with no abort/UI timeout, and the failure path is the weak "coordina con el vendedor" copy. **B.4 =
  add an abort/UI timeout + a *selectable* coordinated fallback.**

## Medusa-first reuse list (reuse, don't rebuild)
- **`order.metadata` is already the refund store** + `refundPaymentWorkflow` (`@medusajs/medusa/core-flows`)
  for card refunds → extend, mirroring **`lib/manual-payment-state.ts`** (#3b's shipped pattern: a pure
  `lib/` state helper + a normalizer projection). Add **`lib/refund-state.ts`**.
- **`normalizeMedusaOrder`** already projects manual-payment sub-states to buyer/seller/agent → add the
  derived `refund_state` the same way (one vocabulary, both sides + UCP/MCP).
- **Existing return-request routes + emails + Telegram** (`sendReturnAccepted/DeclinedToBuyer`,
  `tg.alert`) → add the new transitions' notifications alongside, don't replace.
- **Pickup spot selection** (`CheckoutExperience.tsx` `pickup_spots`/`selectedPickupSpotId`) → hang the
  proposed appointment off the selected spot; persist on order metadata.
- **CP-first lookup** (`/api/checkout/postal-lookup`, `cpResolved`) → reused as-is; only the field order moves.
- **`lib/envia.ts quoteShipments`** → wrap the `allSettled` in an abort/timeout; the coordinated path
  reuses the existing "entrega acordada" delivery option.

AGENTS five-rule check: Medusa owns refund/pickup state (metadata; no new Supabase table for Medusa
orders) ✅ · Supabase only for the legacy `marketplace_return_requests` fallback (untouched, not extended) ✅ ·
Clerk untouched ✅ · **bilingual es-MX** for all new copy ✅ · **Agent surface:** the derived `refund_state`
+ pickup appointment serialize into the UCP/MCP order object (additive — a seller's agent sees the
refund step + the pickup appointment).

## UX heuristics this epic is held to
- **Honest status language.** The UI never says an off-platform refund was "emitido" when only a record
  was written; "Reembolso registrado / Transferencia pendiente / Reembolso confirmado" track reality.
- **Two-sided truth.** The refund (like #3b's payment) is one shared state across buyer, seller, and
  agents — the buyer's "recibí" is the close, not a seller assertion.
- **State causality visible.** Each side always knows the current refund/pickup state, who acts next, and why.
- **No dead ends.** A failed/slow shipping quote always offers a selectable coordinated path, never a hang.

## Proposed slices (skateboard → car) — 3 sprints
> Reference end-state only; the building agent confirms the plan in plan mode. Each story names its QA.

**Sprint 1 — Assisted refund state machine (two-sided, off-platform-aware). All HIGH-risk.**
- **S1.1** *As the system, I want the refund lifecycle persisted as a durable derived state* —
  `solicitado → aceptado → transferencia_pendiente → confirmado` (+ `rechazado`; card rail auto-confirms)
  in **`lib/refund-state.ts`** (pure derive + transition guards + es-MX copy), extending the existing
  return-request `order.metadata` model; `normalizeMedusaOrder` emits the derived `refund_state` to both
  sides + agents. **Acceptance:** state round-trips through the normalizer; an illegal jump
  (`aceptado → confirmado` skipping the transfer step for SPEI/cash) is rejected by the guard. **QA:**
  pure-logic spec on `lib/refund-state.ts`. **Risk: HIGH.**
- **S1.2** *As a seller, I record that I sent an off-platform (SPEI/cash) refund* — an action that sets
  `transferencia_pendiente` (card refunds keep running `refundPaymentWorkflow` → `confirmado`
  automatically); copy never reads "emitido" until `confirmado`. **Acceptance:** accepting a SPEI/cash
  refund shows "Transferencia pendiente," not "emitido"; a card refund shows confirmed once the workflow
  succeeds. **QA:** api spec on the backend transition (422/409 guards); authed money-path browser smoke
  **owed to Daniel**. **Risk: HIGH.**
- **S1.3** *As a buyer, I confirm I received the refund* — a "Recibí el reembolso" action moves
  `transferencia_pendiente → confirmado`; both surfaces + the agent order object read the shared state.
  **Acceptance:** buyer confirm flips both sides to "Reembolso confirmado" and survives reload. **QA:**
  api spec on the buyer confirm endpoint (auth/ownership); authed browser smoke **owed to Daniel**. **Risk: HIGH.**

**Sprint 2 — Pickup propose-and-confirm appointment. HIGH-risk (fulfillment).**
- **S2.1** *As a buyer, I propose a pickup date + time window at checkout* — extend the existing
  `pickup_spots` selection with a proposed datetime persisted on the order metadata (replaces leaning on
  the external `scheduling_url`). **Acceptance:** choosing local pickup lets the buyer propose a slot;
  it's saved on the order and visible to both sides. **QA:** api spec on persistence; browser smoke
  (anonymous where possible). **Risk: HIGH** (fulfillment/order state).
- **S2.2** *As a seller, I confirm or reschedule the proposed pickup* — seller accepts or proposes a new
  window; both sides see the agreed appointment; honest "pendiente de confirmar / confirmada" copy.
  **Acceptance:** seller confirm flips the order to a confirmed appointment shown to the buyer; reschedule
  round-trips. **QA:** api spec; authed browser smoke **owed to Daniel**. **Risk: HIGH.**

**Sprint 3 — CP-first reorder + quote recovery/timeout.**
- **S3.1** *As a buyer on mobile, the address form leads with CP* — reorder `CheckoutExperience.tsx` so
  the CP block precedes name/phone (the lookup logic already exists). **Acceptance:** on checkout, CP is
  the first visible address input; the existing auto-fill still works. **QA:** anonymous browser smoke
  (CP field is first). **Risk: LOW–MED** (presentational reorder; may auto-merge).
- **S3.2** *As a buyer, a failed shipping quote offers a selectable coordinated path* — replace the dead
  "coordina con el vendedor" copy (04-#2) with a selectable "entrega acordada" fallback when Envía
  quoting fails. **Acceptance:** forcing a quote failure shows a selectable coordinated option, not a
  dead end. **QA:** api/unit spec on the fallback branch; browser smoke. **Risk: MED** (checkout
  delivery path — Daniel reviews).
- **S3.3** *As a buyer, shipping quotes can't hang* — add an abort/UI timeout around
  `lib/envia.ts quoteShipments` `allSettled` (04-#3) so "Cotizando…" resolves to a timeout state.
  **Acceptance:** a stalled carrier resolves to the timeout/fallback within the bound, not an infinite
  spinner. **QA:** pure-logic/unit spec on the timeout wrapper. **Risk: MED** (Daniel reviews).

## In / Out of scope (Epic B v1)
**In:** `lib/refund-state.ts` two-sided off-platform refund machine (+ normalizer projection + agent
serialization) with honest copy; seller "ya transferí" + buyer "recibí" transitions; card auto-confirm;
pickup propose-and-confirm appointment on order metadata; CP-first field reorder; quote-failure
coordinated fallback + a quote timeout; one api spec per testable story + extracted `lib/` seams;
bilingual es-MX.
**Out:** **B.5 arranged-only delivery** (`onlyCoordinated`) — **blocked-by Spike 0**, groomed separately
once the decision lands; seller-defined **slot-inventory** booking (chose propose-and-confirm instead);
delivery-causality copy + seller publish-readiness gates (04 tail — defer unless trivially folded);
escrow / Compra Protegida (own spike); the in-chat ledger (Epic C — it *consumes* this refund state).

## Open risks / questions
- **High-risk seam, touched repeatedly.** Refunds + fulfillment + order state. Mitigation (per LEARNINGS):
  extend the existing metadata model (don't re-persist), gate new transitions on presence/state guards so
  the non-refund/non-pickup path is byte-for-byte unchanged, extract pure-logic `lib/` seams for free
  coverage; **Daniel merges every S1/S2 story.**
- **Two repos, async deploy.** S1/S2 span backend (extend the return-request route + normalizer / persist
  the appointment) + frontend (read + act). **Merge backend-first or together**; frontend reads degrade
  gracefully (`refund_state ?? 'none'`, `pickup_appointment ?? null`) across the ~12-min Cloud Run window.
- **One refund vocabulary** across buyer normalizer, seller normalizer, the existing return-request
  statuses, and the UCP/MCP order object — define once in `lib/refund-state.ts`, map the legacy
  `requested/seller_accepted/refunded` onto the derived states, import everywhere.
- **Legacy Supabase `marketplace_return_requests`** is a fallback for pre-Medusa orders — scope the new
  states to the Medusa metadata path; don't extend the legacy table (state it in the PR).
- **B.4 timeout bound** is a product feel choice — pick a sane default (e.g. ~8–10s) at build, confirm with Daniel.
- **No external-fact research needed** — internal state/fulfillment hardening; no payment-provider or
  carrier API capability changed. Verified against current code this pass.

## Definition of Ready check
- [x] As-a/I-want/so-that clear per story; acceptance checks Daniel-runnable.
- [x] Class = Feature/epic; Stage-2.5 bucket = genuinely-needs-build (heavily reuse-shrunk).
- [x] v1 in/out boundary written; Daniel's 3 decisions captured (two-sided refund · propose-and-confirm pickup · keep-together, B.5 deferred).
- [x] Medusa-first reuse list produced (return-request metadata model + `refundPaymentWorkflow` · `lib/manual-payment-state.ts` pattern · `normalizeMedusaOrder` · pickup spot selection · CP-first lookup · `lib/envia.ts`).
- [x] Each story risk-tiered; QA stage named; high-risk (S1/S2) merge owner = Daniel; browser-smoke owner identified.
- [x] **Daniel approved this scope doc (2026-06-07)** ← gate passed. Filed under `02-checkout-and-payments/` (Daniel's call). Scaffolded `delivery-money-polish/` (epic README + sprint-1..3) + committed; kickoff prompts emitted. B.5 arranged-only still open behind Spike 0.
