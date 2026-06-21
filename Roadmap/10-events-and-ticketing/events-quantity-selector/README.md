---
status: scaffolded
slug: events-quantity-selector
---

# Epic — Events: quantity selector (buy N admissions in one order)

> **Macro-section:** [10 · Events & Ticketing](../README.md) ·
> **Risk: HIGH** (money + fulfillment + checkout — per-unit ticket issuance; backend-first deploy; **Daniel merges**).
> Plan quantity > 1 behind a kill-switch until the live money/door smoke passes.
> **Status: 🚧 SCAFFOLDED — awaiting build.** Planned 2026-06-21. Scope doc:
> [`00-ideas/2. readyforscope/events-quantity-selector.md`](../../00-ideas/2.%20readyforscope/events-quantity-selector.md).
> Source: the [events-quantity-selector seed](../../00-ideas/seeds/events-quantity-selector.md), routed out of the
> PDP follow-ups groom (the S5 "events aforo / ticket tiers / quantity" follow-up).

## Why
**As** a buyer of admission to an event, **I want** to buy N tickets in one checkout for a single GA listing,
**so that** I can bring guests without checking out N times. Today the event PDP has no quantity control
(`app/l/[id]/page.tsx:304`), and — the validate-first finding that sets this epic's risk — the backend mints
**one token per line-item and ignores `quantity`** (`apps/backend/src/api/internal/events-ticketing/orders/[id]/issue/route.ts:70-77`),
so buying N today would **charge for N but issue 1 ticket**. This epic makes a quantity purchase real and
issues one scannable ticket per unit.

## Context
| Question | Answer |
|---|---|
| **Who** | Buyers (and AI agents) of paid event admission · the seller at the door |
| **Job** | Buy N admissions in one order; each guest gets a unique QR that's redeemed once at the door |
| **Outcome signal** | A buyer picks a quantity (capped by remaining seats), pays N × price, and gets N distinct QRs on the order; the seller scans each once; aforo decrements by N |
| **In v1** | Quantity stepper (aforo-capped) · per-unit issuance (N idempotent tokens) · N-QR display (reuse) · agent quantity over UCP · **all N tokens under the buyer's email** |
| **Out (deferred)** | Per-guest attendee names · multi-price **tiers/variants** (separate domain-10 backlog epic) · assigned seating · resale/transfer · per-order max cap beyond aforo |
| **Risk tier** | HIGH (money/fulfillment/checkout) — Daniel-merge |

## Medusa-first note
Commerce stays in Medusa (rule #1): quantity is native cart/line-item; aforo is native `manage_inventory`;
tokens ride order/line-item metadata as today. No new tables, no Supabase (rule #2). Agent parity via the UCP
checkout-session (rule #3). Clerk untouched (#4); new copy es-MX (#5). **Backend-first deploy** with graceful
degrade — S1.1 ships first and defaults to quantity 1 if the FE isn't yet sending `qty`, so the ~12-min Cloud
Run window is safe.

## What already exists (reuse, don't rebuild) — verified 2026-06-21
- **Per-line-item mint** — `apps/backend/…/orders/[id]/issue/route.ts` + `_utils.ts` `mintTicketToken` → change the
  loop to per-unit (S1.1). **The only real backend change.**
- **N-QR buyer display** — `app/account/orders/[id]/OrderTrackingClient.tsx:538-546` already maps `event_tickets`. No change.
- **N-ticket roster** — `lib/paid-event-tickets.ts:87-105` already flat-maps. No change.
- **Per-token redeem-once door scan** — `apps/backend/…/events-ticketing/redeem/route.ts`. No change (each token burns once).
- **Aforo** — native `manage_inventory` → `available_quantity` (`lib/listings.ts:144-146`). Stepper cap + decrements by N.
- **Checkout entry** — `/checkout?listingId=…` link (`app/l/[id]/page.tsx:479,483`) + `lib/checkout-hop.ts` → thread `qty` (S1.2).
- **Agent checkout** — `app/api/ucp/checkout-session/route.ts` → accept `quantity` (S1.3).

## Scope — stories by sprint
| Sprint | Story | Risk |
|---|---|---|
| **S1 · Quantity purchase, made real** | S1.1 (BE) Mint one token **per unit**, idempotent per unit (reconcile cron + webhooks re-call issue) | **HIGH** |
| | S1.2 (FE) Quantity stepper on the event buy CTA, clamped to `available_quantity`; thread `qty` through checkout | MED–HIGH |
| | S1.3 (Agent) UCP checkout-session accepts `quantity` (surface parity, AGENTS #3) | MED |

## Deploy order (two repos, async)
**S1.1 → S1.2 → S1.3.** Backend issuance first (degrades gracefully to quantity 1 while the FE hasn't shipped),
then the FE stepper, then the agent surface. Where issuance writes order metadata, merge backend-first and
degrade across the ~12-min Cloud Run window.

## Kill-switch
Consider gating **quantity > 1** behind a flag (default off / max 1) until the live money + door smoke passes;
flip on once Daniel has run the owed walkthrough.

## Epic Definition of Done
- [ ] All S1 stories merged to `main` + smoke-tested. **Owed to Daniel:** buy N → N distinct QRs → scan each once
      (no reuse) → roster shows N → aforo decremented by N (money/auth/door path).
- [ ] `sprint-1.md` has a fool-proof smoke walkthrough (real prod URLs; the money/door steps flagged owed to Daniel).
- [ ] Epic `README.md` marked ✅; `sprint-1.md` status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] Product poster (`Roadmap/README.md`) updated — §10 line + a Recent-highlights entry.
- [ ] Team memory + `LEARNINGS.md` updated with any durable learning (esp. the per-unit idempotent issuance pattern).
- [ ] Kill-switch verified (quantity > 1 gated until the live smoke passes, if used).
- [ ] Feature branch deleted; PR merged.
