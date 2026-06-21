---
title: "Events — quantity selector on a paid GA listing"
slug: events-quantity-selector
status: scaffolded
area: "10"
type: feature
priority: backlog
risk: high
epic: events-quantity-selector
build_order: null
updated: 2026-06-21
---

# Seed — Events quantity selector (buy N GA tickets)

> **Class:** Feature (light). **Status: READY — not scaffolded.** Routed out of the
> [PDP follow-ups cleanup](../2.%20readyforscope/pdp-followups-cleanup.md) groom (2026-06-21) as the
> near-term piece of the S5 "events aforo / ticket tiers / quantity" follow-up.
> **Stage-2.5 bucket:** mostly orientation — aforo + single-unit purchase already exist; the only gap is a
> quantity control.

## Why / the ask
**As** a buyer of admission to an event, **I want** to buy **N tickets in one go** for a single GA listing,
**so that** I don't have to check out N times to bring friends.

## Current state (verified 2026-06-14, during the PDP-cleanup groom)
- **Aforo already exists** — native Medusa `manage_inventory` on the listing (`lib/listings.ts:103-109`,
  surfaced as `available_quantity` / `in_stock`). The S5 note conflated this with the separate **free-RSVP**
  `MarketplaceEvent.capacity`, which is a different (Supabase) system.
- A paid ticket is **one line-item per order** today; there is no quantity selector on the event PDP.
- **Ticket tiers** (multiple price points) is a *different, heavier* want = Medusa **variants** + a multi-variant
  purchase UI, and is **already a named backlog epic** in `10-events-and-ticketing` ("Multi-tier/multi-session
  tickets"). This seed is **quantity only**, not tiers.

## Likely shape (to confirm in a proper groom)
- Lean on the Medusa cart's native line-item quantity; add a quantity stepper to the event buy CTA, capped by
  `available_quantity` (aforo). Confirm the Stripe/MP webhook issues **one ticket per unit** (the
  `issuePaidTicketsForOrder` path) rather than one per order — this is the one money-path detail to validate.
- **Agent surface (AGENTS #3):** the UCP checkout-session must accept a quantity.

## Risk / open questions
- **MED** if the webhook issues one ticket per order today (then per-unit issuance is a money/fulfillment change →
  Daniel-merge); **LOW** if it already issues per unit. **Validate the issuance path first.**
- Belongs in **domain 10 (Events & Ticketing)**, not PDP redesign.
