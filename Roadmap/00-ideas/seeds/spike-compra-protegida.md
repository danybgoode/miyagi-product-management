---
title: "Spike — Compra protegida (buyer protection)"
slug: spike-compra-protegida
status: ready
area: "02"
type: spike
priority: null
risk: high
epic: null
build_order: null
updated: 2026-07-10
---

# Spike — Compra protegida: delivery audit + granularity decision

**As** the product owner, **I want** a verified account of what Compra Protegida actually does today
(and whether everything the `/shop/manage/settings/pagos` options promise is delivered), plus a
decision on whether escrow should be scoped per-listing instead of per-shop, **so that** the trust
feature we already ship is honest, documented, and scoped to real use cases before we invest further.

## Class: Spike · time-box: ONE session · deliverable: a WRITTEN DECISION in this doc (no code, no slicing until it lands)

Groomed 2026-07-10 (original seed 2026-06-08, refreshed against current code). The investigation is
read-only + test-mode; the *subject* is the money path, hence `risk: high` stays on the eventual work.

## The two questions

1. **Delivery audit.** How does Compra Protegida work end-to-end at the UX level — buyer and seller,
   where they see it, when, and what it changes about the purchase? Is every promise made by the
   `off / optional / required` options (and the explainer copy) on `/shop/manage/settings/pagos`
   actually delivered?
2. **Granularity.** Escrow is per-shop today. Should it be per-listing? Use case: a shop owner with
   items that warrant escrow (football-pitch reservations) alongside items that don't (merch).
   **Hypothetical for now** — no live prospect; the decision is about the right heuristic, not one
   seller's catalog.

## Verified current state (2026-07-10 — start here, don't re-derive)

Real escrow machinery is live in code; this is NOT greenfield:

- **Seller setting:** `escrow_mode: off | optional | required` — UI in
  `apps/miyagisanchez/app/(shell)/shop/manage/settings/_sections/Pagos.tsx` (+ mirrored in
  `Diseno.tsx` presets and `lib/shop-settings/helpers.ts` shop-type presets); persisted on the
  `checkout` settings slice.
- **Money path (backend, `apps/backend/src/api/store/`):** deferred Stripe capture —
  `sellers/me/orders/[id]/release-escrow/route.ts` runs `capturePaymentWorkflow` (genuine
  authorize-then-capture, not a status flip), guarded by `escrow_captured` metadata;
  `buyer/me/orders/[id]/confirm-delivery`; `internal/autoconfirm-delivered` (cron);
  `return-request` routes on both sides; `sellers/[slug]/checkout-options` reads escrow;
  `modules/payment-stripe-connect/service.ts` is the provider seam.
- **Buyer/seller surfaces:** `isEscrowOrder` rendering in seller `OrderDetail.tsx` and buyer
  `OrderTrackingClient.tsx`; "Pago protegido" trust signals shipped separately (trust-messaging-polish,
  cross-channel-trust-parity) — display components, not the money path.
- **Agent surface:** UCP `checkout-session` exposes `escrow_compatible`, per-mode
  `available/required/mode/description` (`app/api/ucp/checkout-session/route.ts` ~341–557);
  `lib/ucp/schema.ts` carries `trust.escrow_mode`, and `escrow_mode === 'required'` drives
  `identityRequired`.
- **Docs drift (confirmed):** the poster (`Roadmap/README.md` 02) and
  `Roadmap/02-checkout-and-payments/README.md` still list Compra Protegida as **📋 planned/backlog**
  while the above is live. Delivery-money-polish (#3c) explicitly kept escrow OUT of scope; no prior
  spike or epic ever audited this feature. ✅-means-enforced (WAYS-OF-WORKING) requires reconciling.
- **Adjacent shipped context** the granularity question must respect: rental line-item pricing
  (deposits, `lib/rental-pricing.ts`), per-listing types (services/rentals/digital), manual-payment
  state machine (SPEI/cash), arranged-only-delivery epic scaffolded (its Spike 0 already ran — separate).

## Hypotheses to verify (write a verdict on each)

- **H1 — buyer-optional already serves the mixed catalog.** With `escrow_mode: optional`, the buyer
  chooses protection per purchase — pitch buyers opt in, merch buyers skip. If the *choice* placement
  and copy are right, per-listing config may be unnecessary (or reducible to a per-listing *default*).
  This is the Stage-2.5 lightest path — check it first.
- **H2 — the poster lags the code**, not the reverse: the feature works and the fix is documentation
  (poster line → ✅ or 🚧 with named gaps).
- **H3 — escrow is Stripe-only.** `payment-stripe-connect` is the only provider seam found. What does
  checkout actually do when `escrow_mode: required` and the shop has only MercadoPago/SPEI/cash? Is
  the promise "todos los pagos pasan por Compra Protegida sin excepción" honest for manual methods —
  or silently narrowed/blocked? This is the most likely broken-promise site.

## Investigation plan (one session, in order)

1. **Promise inventory.** Extract every claim the UI makes: the three option descriptions, the
   escrow explainer, buyer-facing checkout/PDP copy, order-page copy, emails if any. This list IS the
   audit checklist.
2. **Code trace per promise.** For each claim, find the enforcing code (or its absence). Include the
   timing promises (auto-confirm window — the settings page's own agent-prompt mentions a 3-day
   question), refund interaction with the two-sided refund machine, and the H3 payment-method matrix
   (Stripe / MP / SPEI / cash / DiMo × off/optional/required).
3. **Live walkthrough — test-mode only.** One escrow purchase end-to-end on a disposable test shop
   with Stripe test keys (buyer sees choice → pays → seller ships → buyer confirms → release;
   plus the no-confirm → autoconfirm path if cron cadence allows). **Never exercise release-escrow
   against a real order** — capture moves real money on prod. If prod creds are the only option,
   downgrade to read-only tracing + the local throwaway-Postgres pattern (LEARNINGS 2026-07-06).
4. **Agent path.** One UCP `checkout-session` read against a `required` shop: does an agent get an
   honest, actionable escrow contract?
5. **Granularity analysis.** With H1's verdict in hand: per-shop vs per-listing vs per-listing-*type*
   (services/rentals default-on?) vs buyer-optional-with-listing-default. Name the heuristic (e.g.
   "escrow follows the listing's fulfillment risk, not the shop"), the Medusa-first data shape for
   each option, and the migration/agent-parity cost. Recommend one.
6. **Write the decision** (template below) + **reconcile the docs**: update the poster 02 line and
   `02-checkout-and-payments/README.md` backlog line to the audited truth (✅ / 🚧 with named gaps —
   doc-only, LOW). Any *fix* work discovered becomes new seeds, not silent scope.

## The written decision must answer

1. Verdict per promise: delivered / partial (gap named) / broken (repro named).
2. H1/H2/H3 verdicts with evidence (file:line or walkthrough step).
3. Granularity recommendation + heuristic + rough cost, or "stay per-shop, revisit when a real
   mixed-catalog seller lands."
4. The reconciled poster/README wording (applied).
5. Follow-up seeds to mint (if any), each one-line.

## Out of scope

Building anything (per-listing escrow, new provider support, copy changes beyond the docs
reconciliation); MercadoPago/SPEI escrow *implementation* (the spike only documents today's truth);
the arranged-only-delivery epic (separate, already scaffolded); Compra Protegida marketing.

## Cross-agent planning panel (mandatory offer — spikes)

Advisory second opinion on this brief before the decision lands:
`node scripts/cross-panel.mjs Roadmap/00-ideas/seeds/spike-compra-protegida.md --lens both --agent codex`
(single-pass, print-only, never gates). Run it (or skip) at Daniel's call.

## Kill-switch: n/a (spike — no build). QA: the decision doc itself, reviewed by Daniel; docs reconciliation is doc-only LOW. Smoke: Daniel reads the decision + the reconciled poster line.
