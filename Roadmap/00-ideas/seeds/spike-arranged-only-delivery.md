---
title: "Spike — arranged-only delivery policy (#3c Spike 0)"
slug: spike-arranged-only-delivery
status: ready
area: "04"
type: spike
priority: wave-3
risk: high
epic: null
build_order: "#3c-S0"
updated: 2026-06-08
---

# Spike — Arranged-only delivery policy (BUILD-ORDER #3c · Spike 0)

> **Class:** Spike (time-boxed investigation → a **written decision**, no code, no slicing).
> **Status: READY TO INVESTIGATE.** Carved + signed off 2026-06-07 as part of the #3c groom
> (scope: [`remaining-audit-polish.md`](remaining-audit-polish.md)). **This spike blocks Epic B's
> arranged-only slice (B.5)** — the rest of #3c is independent of it.
> **Stage-2.5 bucket:** orientation/decision — the capability is *half-present* (`onlyCoordinated`
> exists as a hardcoded `false`), so the question is policy + blast-radius, not greenfield build.

## Why / the ask
**As** the product owner, **I want** a decision on whether sellers may publish **arranged-only**
listings — items delivered in person / by coordination, with **no shippable carrier** — **so that**
the delivery work in #3c (Epic B) can slice correctly instead of guessing. Today
`backend …/checkout-options/route.ts:160` hardcodes `const onlyCoordinated = false`, so every listing
must offer a carrier quote and "entrega acordada" is only ever an *add-on*, never the sole method.

## Current state (audit finding 04-#4, re-verified on `main`)
- `checkout-options/route.ts:160` — `onlyCoordinated = false` is hardcoded; the branch that would
  serve an arranged-only checkout exists but is never reached.
- Whether a seller *intends* arranged-only (e.g. a service, a fridge for local pickup, a haircut) is
  not modeled — they must still configure shipping, or the listing is ambiguous.
- The quote-failure path already says "coordina con el vendedor" (04-#2) but offers **no selectable
  coordinated checkout** — so even the fallback can't currently complete arranged-only.

## What to investigate (the spike's questions)
1. **Demand:** which seller/listing types genuinely need arranged-only? (services, rentals, bulky/local
   goods, in-person deals). Is it per-listing or a per-shop default?
2. **Blast radius of allowing `onlyCoordinated = true`:** trace every consumer of `checkout-options`
   — the checkout UI (does it gracefully show the manual/arranged path with no carrier?), the Envía
   quote path (skipped cleanly?), the **agent/UCP checkout** (`app/api/ucp/checkout-session/route.ts`
   — does an agent buying an arranged-only listing get a coherent flow?), and the "coordina con el
   vendedor" recovery copy.
3. **Model:** a per-listing flag (`delivery_mode: carrier | arranged | both`) on the Medusa product
   metadata vs. a per-shop setting — which is least-surprising and Medusa-first?
4. **Payment coupling:** arranged-only today implies manual payment (no online capture before an
   in-person handoff) — confirm that's the intended pairing, or whether online pre-pay is allowed.

## Output (Definition of Done for this spike)
A **written decision** appended below (Go / No-go / Go-with-constraints), naming: the model
(per-listing vs per-shop), the consumers that must change, the payment coupling, and the v1 boundary.
**No code, no branch.** On a "Go", Epic B's B.5 slice unblocks and gets deep-groomed with this decision
as its input. On a "No-go", Epic B keeps `onlyCoordinated=false` and only fixes the delivery-causality
copy + quote-failure recovery.

## Decision
_(to be filled by the investigation — pending.)_
