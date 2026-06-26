---
title: "Spike — BYO Envía accounts (per-seller shipping credentials)"
slug: spike-envia-byo
status: seed
area: "04"
type: spike
priority: tbd
risk: high
updated: 2026-06-25
---

# Spike — BYO Envía accounts (sellers fund + connect their own Envía)

> **Class:** Spike (time-boxed investigation → a **written decision**, no code, no slicing until the decision lands).
> **Status:** Seed, awaiting groom. Routed out of the 2026-06-25 Envía kill-switch groom (see
> [`envia-flagsmith-killswitch.md`](../2.%20readyforscope/envia-flagsmith-killswitch.md) appendix). **Build the
> kill-switch epic first** ([`04-shipping-and-delivery/envia-killswitch`](../../04-shipping-and-delivery/envia-killswitch/README.md)) — BYO reuses its gating + fallback.

## Why / the ask
**As** the platform owner, **I want** a decision on whether sellers should **bring + fund their own Envía
account** (paste their own API token) instead of shipping on a single platform-funded Envía account, **so
that** the shipping-funding burden can move to sellers — and I know the funding-model trade-off before building.

## Feasibility — already validated (2026-06-25)
**Yes, feasible.** Each Envía user signs up (`accounts.envia.com/signup`) and generates their **own Bearer API
token** (Developer → API Keys, per-environment); Envía publishes a **"Marketplace Multi-Seller Shipping"** use
case. BYO = each seller funds their own account + pastes their token; the platform stores it (encrypted,
per-seller) and routes that seller's quotes/labels through their token.
Sources: <https://docs.envia.com/docs/authentication> · <https://docs.envia.com/docs/marketplace-multi-seller>.

## The decision the spike must land
1. **Funding model (the core product call):** BYO (sellers fund their own) **vs** keep a funded platform
   account with a markup **vs** hybrid (platform default + optional BYO).
2. **Credential model + storage:** where the per-seller Envía token lives (Supabase non-commerce vs Medusa
   seller metadata) and how it's encrypted at rest; rotation/revocation.
3. **Client refactor shape:** `envia-client.ts` reads a single `ENVIA_API_KEY` today → thread a per-seller key
   from the listing's owning seller through quote + label paths.
4. **Onboarding/validation UX:** settings field to enter + **test-validate** the token; error states; what
   happens for sellers who haven't connected (→ arranged delivery / manual carrier — already wired by the
   kill-switch epic).
5. **Composition with the kill-switch:** the platform `shipping.envia_enabled` flag stays the **master off**;
   BYO is per-seller on top.
6. **Agent surface (AGENTS #3):** how UCP/MCP quote + ship behave per-seller under BYO.
7. **Go/no-go + a thin first slice** (NOT built in the spike).

## In / out (spike)
**In:** funding-model recommendation · credential/storage/encryption decision · client-refactor + onboarding
shape · composition with the flag · agent surface · go/no-go + thin slice.
**Out:** building it · multi-currency/markup billing mechanics beyond the funding-model call.

## Risk
Spike itself low-risk (research/decide). **When built: HIGH** — per-seller credentials on the money path →
Daniel-merge. How it closes: the written decision lands in this file (sections above filled) + Daniel signs off.
