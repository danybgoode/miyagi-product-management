---
title: "Spike — arranged-only delivery policy (#3c Spike 0)"
slug: spike-arranged-only-delivery
status: shipped
area: "04"
type: spike
priority: wave-3
risk: high
epic: null
build_order: "#3c-S0"
updated: 2026-07-07
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

> **Validated still-open 2026-07-06** (grooming close-out): `onlyCoordinated = false` is still hardcoded
> (`checkout-options/route.ts:161` on backend `origin/main`), so the spike's core question — may a seller
> *intentionally* publish an arranged-only listing — remains undecided and this spike stands. **Partially
> superseded since scoping:** delivery-money-polish S3.2 (2026-06-09) shipped a selectable "Entrega
> acordada" fallback when quoting fails or returns no coverage (`lib/checkout-fallback.ts`), so the third
> current-state bullet below is stale — the fallback CAN now complete checkout, paid via pago directo. That
> also answers question 4's payment coupling in code: the backend rejects card + coordinated delivery ⇒
> manual payment only. Remaining blast radius = questions 1–3 (demand, `checkout-options` consumers incl.
> UCP, per-listing vs per-shop model). The poster's 04 section tracks this as "arranged-*only* enforcement
> pending Spike 0".

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

**Verdict: GO — with constraints.** Investigated on backend + frontend `origin/main` 2026-07-07.
Model: **per-listing `delivery_mode` on Medusa product metadata**. Payment coupling: **manual only,
already enforced in code**. This unblocks Epic B's B.5.

### Why Go (Q1 — demand + model)
The capability is genuinely wanted and already **half-built** — this is a policy + wiring decision, not
a greenfield build.
- **Who needs it (per-listing, not per-shop):** services (repair, haircut, install), rentals,
  bulky/local goods handed off in person (fridge, furniture) where the seller wants **no carrier and no
  named pickup spot**, perishables, and in-person deals. Demand is inferred from catalog composition +
  the fact that `listing_type` already carries `service`/`rental` as first-class types — not from hard
  usage data (a spike-honest gap; B.5 grooming can sample the live catalog).
- **Per-listing wins decisively.** A single shop routinely mixes shippable goods with a local-only item,
  so a per-shop toggle would be surprising and wrong. `listing_type` + `is_digital` **already flow
  per-listing** as query params through the whole stack (PDP → `checkout/page.tsx` →
  `app/api/checkout/options` → backend `checkout-options` → `start-checkout`); a new
  `delivery_mode: 'carrier' | 'arranged' | 'both'` on **product metadata** follows that exact grain and
  is the Medusa-first home (the route already reads product/seller metadata). A per-shop *default* is a
  post-v1 nicety, not v1.

### Blast radius (Q2 — every consumer of `checkout-options`, traced on `origin/main`)
The `coord` delivery primitive **already exists end-to-end** — seeded shipping option
`miyagi-entrega-acordada` (`_utils/fulfillment.ts:18`), `OPTION_KEY_BY_METHOD` maps
`coord`/`service`/`rental`/`none`→`coord` (`start-checkout/route.ts:33-40`), and the FE already renders
`only_coordinated` copy (`CheckoutExperience.tsx:631`) + an S3.2 coordinated-fallback selector. What's
missing is only the **intent signal** and the branch that emits it. Consumers that must change:
1. **`backend .../checkout-options/route.ts`** — replace the hardcoded `const onlyCoordinated = false`
   (:160) with a read of the new per-listing `delivery_mode` (passed like `is_digital`). When
   `arranged`: **push a `coord` delivery method** (today *nothing* ever pushes `coord` — the `DeliveryMethod`
   type allows it but no code path creates it), suppress the carrier `shipping` method, and set
   `onlyCoordinated = true` (which already filters the instant/card payments, :185-186 & :217). This also
   removes the false "delivery not configured" dead-end for an *intentional* arranged listing.
2. **`app/api/checkout/options/route.ts`** (proxy) + **`app/(shell)/checkout/page.tsx`** — derive
   `delivery_mode` from the listing metadata and pass it through as a new query param.
3. **`CheckoutExperience.tsx`** — render the `coord` method as a **first-class** delivery option for an
   arranged listing (today `coord` only appears via the S3.2 quote-failure *fallback*, `coordinatedActive`);
   the `only_coordinated` empty-payment copy (:631) becomes reachable for the first time. It already sends
   `fulfillment_method: 'coord'` on that path (:811), so the money path is wired.
4. **`start-checkout/route.ts`** — the card+coordinated **422 guard already exists and is correct**
   (:237-247, trips on `none`/`coord` + non-manual). ⚠️ **Latent inconsistency to fold into B.5:**
   `service`/`rental` listings send `fulfillment_method:'service'|'rental'`, which the guard does **not**
   catch, so they can currently be **card-paid** even though `OPTION_KEY_BY_METHOD` routes them to `coord`
   fulfillment. If `delivery_mode:'arranged'` is the new canonical arranged signal, either map
   service/rental → arranged, or extend the guard — decide in grooming.
5. **`app/api/ucp/checkout-session/route.ts` (agent/UCP)** — `fetchBackendPaymentMethods` reads
   `checkout-options` but **ignores `only_coordinated` and `delivery_methods` entirely**. For an arranged
   listing the backend already drops the instant methods, so `mpAvailable`/`stripeAvailable` compute
   `false` and the agent correctly sees only `bank_transfer`/`cash` — **payment degrades gracefully with
   no change.** But the agent gets **no delivery signal**, so it could still imply shipping. v1 must add a
   small `delivery: { arranged: true }` hint to the UCP session so an agent presents "coordina la entrega
   con el vendedor" instead of a carrier flow. (Agent-initiated *issuance* stays deferred — the UCP
   session is surface-parity only, per its own `quantity` note.)
6. **Recovery copy** — the "coordina con el vendedor" empty-state (`CheckoutExperience.tsx:631` and the
   `delivery_methods.length === 0` notice :395-408) already exists; for arranged-only it must read as the
   *intended* state, not a misconfiguration.
7. **Seller listing editor + publish gate (net-new, out of spike scope):** a per-listing toggle to declare
   `delivery_mode`, and relaxing the publish gate so "no carrier + no pickup" is a **valid** published
   state when `arranged` (today it's treated as misconfigured).

### Payment coupling (Q4 — confirmed, already coded)
Arranged-only ⇒ **manual payment only (SPEI / efectivo)**; card is rejected. This is already the intended
and *enforced* pairing: `start-checkout/route.ts:237-247` 422s on `coord`/`none` + non-manual, and
`lib/checkout-fallback.ts` (S3.2) steers the buyer to a manual method when coordinated is active. **v1
keeps this coupling — no online pre-pay for arranged listings** (no card capture before an in-person
handoff). Online pre-pay for arranged is explicitly out of scope.

### v1 boundary
- **In:** per-listing `delivery_mode` on product metadata (values `carrier` | `arranged` | `both`;
  **default = today's behavior**, so every existing listing is unaffected — backwards-compatible);
  `checkout-options` emits `coord` + `onlyCoordinated` for `arranged`; web checkout renders it first-class;
  UCP session carries a delivery hint; the service/rental payment-guard inconsistency resolved; publish
  gate accepts arranged as valid; manual-only payment (already coded).
- **Out (post-v1):** per-shop default `delivery_mode`; any online pre-pay for arranged listings;
  agent-initiated arranged-order *issuance* (Medusa cart open from UCP); `both` may ship in v1 only if the
  multi-method compose in `checkout-options` makes it near-free — otherwise defer.

_Investigated by Claude (Opus 4.8), 2026-07-07, against backend + frontend `origin/main`. No code, no
branch — on this Go, Epic B's B.5 gets deep-groomed with this decision as input._
