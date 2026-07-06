---
title: "Rental backend line-item pricing (charge nights × rate + deposit online)"
slug: rental-backend-line-item-pricing
status: scaffolded
area: "02"
type: feature
priority: backlog
risk: high
epic: "02-checkout-and-payments/rental-backend-line-item-pricing"
build_order: null
updated: 2026-07-06
---

# Seed — Rental backend line-item pricing

> **Class:** Feature (backend money path). **Status: READY — not scaffolded.** Routed out of the
> [PDP follow-ups cleanup](../2.%20readyforscope/pdp-followups-cleanup.md) groom (2026-06-21); cross-cutting
> follow-up carried from PDP-redesign **S4** (rentals).
> **Stage-2.5 bucket:** genuinely new — the online-charge path does not exist; today's flow deliberately routes
> to seller coordination.

## Why / the ask
**As** a buyer of a rental, **I want** to pay the **real** total (nights × rate + deposit) online at checkout,
**so that** I can book and pay in one step instead of coordinating the amount with the seller by message.

## Current state (verified 2026-06-14, during the PDP-cleanup groom)
- The S4 rental PDP shows an **exact estimate** (`lib/rental-pricing.ts`, `computeRentalTotal` =
  units × rate + deposit) but **"Reservar estas fechas" opens an AskSeller conversation** — by design, because
  the generic `/checkout` charges a **single unit of `price_cents`** and ignores the date range + deposit
  (`app/l/[id]/RentalBooking.tsx:24-26,122-126`).
- Rentals already expose `rental: { rate_period, deposit_cents }` in the UCP read (so agents don't quote the
  per-period rate as the full price), captured frontend-only into `metadata.attrs` (S4 decision).

## Likely shape (to confirm in a proper groom — AGENTS rule #1, Medusa-first)
- A Medusa-side way to charge a computed total: a custom line-item / price override that honors nights × rate +
  deposit, threaded through cart → order → Stripe/MP. **Read the Medusa cart/line-item + payment model first** —
  it may re-scope smaller (per the LEARNINGS Medusa-first pattern).
- **Agent surface (AGENTS #3):** the UCP checkout-session must be able to quote + charge the same computed total.

## Risk / open questions
- **HIGH** — touches checkout / payments / order line-items / money. **Backend-first deploy** (~12-min Cloud Run
  window, degrade gracefully), **Daniel-merge**, plan behind a kill-switch. Likely its own small epic (probably
  **domain 02 · Checkout & Payments**), not a pre-S6 squeeze.
- Open: deposit handling (hold vs charge vs refund-on-return?) — needs a product decision, possibly a spike.
