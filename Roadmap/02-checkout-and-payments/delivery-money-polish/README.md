# Epic — Delivery & Manual-Money Polish

> **Macro-section:** [02 · Checkout & Payments](../README.md) · **BUILD-ORDER:** #3c · Epic B ·
> **Risk: HIGH — Daniel merges** (refunds / payments / fulfillment / order state).
> **Status: 📋 PLANNED — not started.** Groomed + signed off (Daniel, 2026-06-07); scaffolded under
> `02-checkout-and-payments/`. Scope doc:
> [`00-ideas/seeds/delivery-money-polish.md`](../../00-ideas/seeds/delivery-money-polish.md).
> Wave context: [`remaining-audit-polish.md`](../../00-ideas/seeds/remaining-audit-polish.md).
> Driven by the #3a refresh ([`results-refresh-2026-06/`](../../00-ideas/audits/results-refresh-2026-06/), 02 + 04).

## Why
The #3a re-audit's delivery + manual-money tail (everything #3b deferred): the assisted refund lifecycle
overstates reality for **off-platform SPEI/cash** transfers ("Reembolso emitido" when only a record was
written — #3b fixed only the copy); pickup is an external scheduling **link**, not a real appointment; the
checkout address form isn't visually **CP-first** despite having the CP-lookup; and Envía quote failures
hang or dead-end. Reading the code re-scopes all of it **smaller** — the refund machine, pickup spots, and
CP-first lookup already exist; this epic adds the **durable middle-states** and a few reorders, mirroring
the #3b pattern (`lib/manual-payment-state.ts` → `lib/refund-state.ts`, state on `order.metadata`).

## Context

| Question | Answer |
|---|---|
| **Who** | Buyers + sellers on the manual/off-platform money path (SPEI / cash) and local-pickup / arranged delivery |
| **Job** | A refund that's durable, two-sided, and honest; a real pickup appointment; a CP-first address; a shipping quote that never hangs |
| **Outcome signal** | SPEI/cash refunds read "registrado → transferencia pendiente → confirmado" (buyer confirms receipt) · pickup is a proposed-and-confirmed appointment · CP is the first address field · a stalled quote resolves to a selectable coordinated fallback |
| **In v1** | Two-sided off-platform refund machine · pickup propose-and-confirm appointment · CP-first reorder · quote recovery + timeout |
| **Out** | **B.5 arranged-only (blocked-by Spike 0)** · slot-inventory booking · delivery-causality copy / publish gates · escrow · the in-chat ledger (Epic C consumes this state) |
| **Risk tier** | HIGH (S1/S2) — Daniel merges; S3 LOW–MED/MED |

## Medusa-first note
Refund + pickup state ride **`order.metadata`** (Medusa-first; **no new table** for Medusa orders) —
the return-request model already persists there and runs **`refundPaymentWorkflow`** for card refunds.
The new derived `refund_state` + pickup appointment serialize into the **UCP/MCP** order object (additive).
Bilingual es-MX for all new copy. Clerk untouched. The legacy Supabase `marketplace_return_requests`
fallback (pre-Medusa orders) is **not** extended.

## What already exists (reuse, don't rebuild)
- **Refund/return machine on `order.metadata`** — backend `…/store/buyer/me/orders/[id]/return-request`
  (create) + `…/store/sellers/me/orders/[id]/return-request` (PATCH `accept`/`decline`/`seller_refund`,
  partial via `refund_amount_cents`); statuses `requested → seller_accepted/declined/refunded`; runs
  `refundPaymentWorkflow` for card. Frontend proxies + `OrderDetail.tsx` UI. **Extend it; don't replace.**
- **`lib/manual-payment-state.ts`** (#3b) — the pattern to mirror for `lib/refund-state.ts` (pure derive
  + transition guards + es-MX copy).
- **`normalizeMedusaOrder`** — already projects manual-payment sub-states to both sides + agents → add `refund_state`.
- **Return emails + Telegram** — `sendReturnAccepted/DeclinedToBuyer`, `tg.alert` → add new-transition notifications alongside.
- **Pickup spot selection** — `CheckoutExperience.tsx` `pickup_spots[]` / `selectedPickupSpotId` / `scheduling_url` → hang the proposed appointment off the selected spot.
- **CP-first lookup** — `CheckoutExperience.tsx` + `/api/checkout/postal-lookup` / `cpResolved` → reused as-is; only the field order moves.
- **`lib/envia.ts quoteShipments`** (`:171`, `allSettled :180`) → wrap in an abort/timeout; the coordinated fallback reuses the existing "entrega acordada" option.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · Two-sided refund state machine** | S1.1 `lib/refund-state.ts` (`solicitado → aceptado → transferencia_pendiente → confirmado` + `rechazado`; card auto-confirm) extending the return-request metadata; normalizer emits `refund_state` | HIGH |
| | S1.2 Seller "ya transferí" → `transferencia_pendiente` for SPEI/cash (card keeps `refundPaymentWorkflow` → `confirmado`); honest copy (no "emitido" until confirmed) | HIGH |
| | S1.3 Buyer "recibí el reembolso" → `confirmado`; shared across buyer/seller/agents; survives reload | HIGH |
| **S2 · Pickup propose-and-confirm** | S2.1 Buyer proposes a pickup date + time window at checkout; persisted on order metadata (reuse spot selection) | HIGH |
| | S2.2 Seller confirms / reschedules; both sides see the agreed appointment; "pendiente / confirmada" copy | HIGH |
| **S3 · CP-first + quote recovery/timeout** | S3.1 Reorder the address form so CP leads (lookup already exists) | LOW–MED |
| | S3.2 Selectable coordinated ("entrega acordada") fallback on Envía quote failure | MED |
| | S3.3 Abort/UI timeout around `lib/envia.ts quoteShipments` so "Cotizando…" can't hang | MED |

## Deploy order (two repos, async)
S1/S2 span **backend** (extend the return-request route + normalizer; persist the appointment) +
**frontend** (read + act). **Merge backend-first or together**; frontend reads degrade gracefully
(`refund_state ?? 'none'`, `pickup_appointment ?? null`) across the ~12-min Cloud Run window. S3 is
frontend-only (`lib/envia.ts` + `CheckoutExperience.tsx` live in the frontend app).

## Epic Definition of Done
- [ ] All three sprints' stories merged + smoke-tested (money/auth gaps stated; owed to Daniel by name).
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough (real prod URLs once deployed; money/refund steps flagged Daniel-owed).
- [ ] This README ✅ complete; every sprint status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] Product poster (`Roadmap/README.md`) updated — 02 refund line + 04 pickup line reflect what shipped.
- [ ] Team memory + `LEARNINGS.md` updated (durable learning — esp. the refund-state mirror of the #3b pattern).
- [ ] Branch deleted; PR(s) merged. **B.5 arranged-only remains open behind Spike 0.**
