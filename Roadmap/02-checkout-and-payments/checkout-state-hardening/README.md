---
status: shipped
slug: checkout-state-hardening
---

# Epic — Checkout & Manual-Payment State Hardening

> **Macro-section:** [02 · Checkout & Payments](../README.md) · **BUILD-ORDER:** #3b ·
> **Risk: HIGH — Daniel merges every story** (payments / checkout / fulfillment / money).
> **Status: ✅ COMPLETE — all 3 sprints shipped to prod 2026-06-07.** (S1 BE #13/FE #36, S2 BE #14/FE #38,
> S3 FE #39.) Money/auth browser smokes owed to Daniel (per-sprint walkthroughs). Scope doc:
> [`00-ideas/seeds/checkout-state-hardening.md`](../../00-ideas/seeds/checkout-state-hardening.md).
> Driven by the #3a refresh: [`results-refresh-2026-06/`](../../00-ideas/audits/results-refresh-2026-06/)
> (pinned frontend `origin/main@ed447bd` / backend `origin/main@0980253`).

## Why
The manual-payment lifecycle the product already advertises — *"payment pending → buyer marks paid →
seller confirms → confirmed"* — is **shipped but half-built**. The #3a re-audit confirmed three
money-path P0s on current `main`: the buyer's "ya pagué" isn't durable (lost on reload), a seller can
ship before payment is confirmed (no UI **or** API gate), and the pay button shows a different total
than the summary when a coupon is applied. This epic makes the money path **durable, foolproof, and
honest** — the biggest trust win in the product, and the prerequisite for #5 (the durable
`buyer_reported_paid` event is #5's first canonical trigger).

## Context

| Question | Answer |
|---|---|
| **Who** | Buyers + sellers on the manual-payment path (SPEI / DiMo / cash) |
| **Job** | Know the real payment state, the next actor, and a total that never changes — at every step |
| **Outcome signal** | "ya pagué" survives reload · no ship action before payment confirmed (UI + API) · CTA total = summary total · honest refund language |
| **In v1** | 3 P0s + **all 02 P1s** (who-acts-next copy + inbox fix, preview-before-placement, async-success recovery) + refund-language copy-only fix |
| **Out (→ #3c)** | Full assisted-refund state machine · pickup reserved-slot scheduling · CP-first capture · in-chat ledger (consumes this epic's state) · arranged-only policy decision |
| **Risk tier** | HIGH (all stories) — Daniel merges each |

## Medusa-first note
Commerce state lives in **Medusa** — the manual-payment sub-states ride `order.metadata`, **no Supabase,
likely zero new tables** (mirrors the print `payment_reported` pattern). Bilingual es-MX strings for all
new copy. The durable state serializes into the order object the **UCP/MCP** order tools already expose
(additive — a seller's agent sees `buyer_reported_paid` too). Clerk untouched.

## What already exists (reuse, don't rebuild)
- **`paymentSettled` predicate** — `OrderDetail.tsx:709` (`!isSpeiOrder || paymentReceived`), today wired only to refunds → re-point at the shipping affordance.
- **Durable reported-paid pattern (print)** — `app/api/print/submissions/[id]/payment-reported/route.ts:35` persists `payment_reported` + timestamp → mirror for marketplace orders on `order.metadata`.
- **`confirm-payment` route** — `backend …/sellers/me/orders/[id]/confirm-payment/route.ts` already sets `payment_received` → build the state model *around* it.
- **Telegram primitive** — `lib/telegram.ts` → keep the nudge, add durable persistence alongside.
- **Coupon-aware total** — `CheckoutExperience.tsx:222` computes `totalCents` → extract to `lib/checkout-total.ts`, share with `CheckoutPayButton`.
- **`normalizeMedusaOrder`** — `backend …/sellers/me/orders/route.ts` → extend to project the new sub-states to both sides.
- **Manual-method availability** — resolved at `checkout-options` / `start-checkout` → reuse for the pre-placement preview.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · Durable state machine** | S1.1 Persist `pending_payment → buyer_reported_paid → payment_confirmed → processing` on order metadata (`lib/manual-payment-state.ts`) | HIGH |
| | S1.2 `report-payment` durably writes `buyer_reported_paid` (+ keeps Telegram); both sides read it | HIGH |
| | S1.3 "Who acts next" copy keyed to state; inbox no longer says "Listo para enviar" on unpaid orders | HIGH |
| **S2 · Block ship before paid** | S2.1 Seller ship affordance gated on `paymentSettled`; confirm-payment reordered before shipping; "Esperando pago" reason | HIGH |
| | S2.2 Server gate on **both** ship routes (backend `ship` + frontend `ship-manual`) → 422 for unpaid manual orders | HIGH |
| **S3 · One total + trust polish** | S3.1 `lib/checkout-total.ts` single source of truth; CTA = summary (coupon/bundle/shipping) | HIGH |
| | S3.2 Manual-payment instructions preview **before** placement (close the trust cliff) | HIGH |
| | S3.3 Async-success recovery state on `/payment/success` (no false success on null completion) | HIGH |
| | S3.4 Refund-language honesty (copy-only): "Reembolso registrado / Transferencia pendiente" for SPEI/cash | HIGH |

## Deploy order (two repos, async)
S1 spans **backend** (persist + normalize state) and **frontend** (read it). Per LEARNINGS, **merge
backend-first or together**, and make the frontend **degrade gracefully** (`?? 'pending_payment'`)
across the ~12-min Cloud Run window. S2.2 likewise touches backend `ship` + frontend `ship-manual` —
land the backend gate first. S3 is mostly frontend. Rebase latest `main` before each PR (parallel agents).

## Definition of Done (epic close-out checklist)
- [x] All 3 sprints' stories merged to `main` + smoke-tested (money-path gaps stated, owed to Daniel).
- [x] Each `sprint-N.md` has a fool-proof smoke walkthrough with **real production URLs**; money/auth steps flagged as owed to Daniel.
- [x] This README marked ✅ complete; every `sprint-N.md` status ticked with commit refs.
- [x] `RETROSPECTIVE.md` written.
- [x] **Product poster updated** (`Roadmap/README.md` — 02 line + Recent highlights: durable manual-payment state, ship gating, single total).
- [x] Team memory updated (epic memory + `MEMORY.md` index).
- [x] **`Roadmap/LEARNINGS.md` updated** — promote durable learnings (the metadata state-machine pattern; curated top-level normalized fields; server-gate-both-mutations).
- [x] Feature branches deleted; PRs merged.
