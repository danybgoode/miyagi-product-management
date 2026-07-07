# Sprint 1 — The web path (seller declares → buyer checks out arranged-only)

**Epic:** [Arranged-only delivery](README.md) · **Risk: HIGH — Daniel merges** · **Status: 📋 not started**

The thinnest end-to-end slice that ships and is Daniel-testable: a seller marks a listing arranged-only, a
buyer checks out seeing only the coordinated delivery + pago directo, and the order completes. All three
stories are backend-first, then the FE reads them; the whole slice sits behind `shipping.arranged_only_enabled`
(default off) so it merges dark.

---

## Stories

### S1.1 — Backend emits arranged-only *(HIGH — Daniel merges)*
> **As a** buyer on an arranged-only listing, **I want** checkout-options to offer only the coordinated
> delivery + manual payment, **so that** I'm not asked for a shipping address or a card that the seller
> can't honor.
- `checkout-options/route.ts` reads a new per-listing `delivery_mode` query param (`carrier | arranged`,
  default `carrier`), gated by `isEnabled('shipping.arranged_only_enabled')`.
- For `arranged`: push a `coord` delivery method (`{ id:'coord', label:'Entrega acordada con vendedor', note:… }`),
  **suppress** the carrier `shipping` method, and set `onlyCoordinated = true` (the existing branch already
  filters instant/card payments at :185-186 and returns `only_coordinated` at :217).
- Extract the delivery-method + `onlyCoordinated` derivation into a **pure, next-free seam** so it can be
  unit-tested without booting Medusa.
- **Flag OFF (or `delivery_mode` absent) ⇒ byte-identical to today.**
- **`both` (stretch):** if it falls out cheaply, `both` = carrier method **and** coord method, card allowed
  (not `onlyCoordinated`). Only if near-free; else defer.
- **Acceptance:** `GET /store/sellers/:slug/checkout-options?...&delivery_mode=arranged` (flag on) returns a
  single `coord` delivery method, `only_coordinated:true`, and **zero** instant payment methods (manual
  only). Same call with `delivery_mode=carrier` or the flag off is unchanged from today.

### S1.2 — Seller declares `delivery_mode` per listing *(HIGH — Daniel merges)*
> **As a** seller, **I want** to mark a listing as delivered only by coordination, **so that** I can publish
> a service / rental / local-only item without faking a carrier or a pickup spot.
- A per-listing "Entrega" control in the listing create/edit form (a `carrier | arranged` choice) writes
  `delivery_mode` to **product metadata** via `_utils/seller-product-create.ts` / `seller-product-update.ts`.
- The **publish-readiness gate** accepts `arranged` as a valid published state — **no** carrier origin and
  **no** pickup spot required — **but** still requires the seller to have ≥1 manual payment method (SPEI /
  cash) configured, else the arranged listing can't be paid (honors the existing 04-poster claim).
- Control is hidden / inert when `shipping.arranged_only_enabled` is off.
- **Acceptance:** creating/updating a listing with `delivery_mode=arranged` persists it to product metadata;
  a seller **with** a manual method can publish an arranged listing that has no carrier/pickup; a seller
  **without** one is blocked with a clear reason.

### S1.3 — Web checkout honors arranged-only *(HIGH — Daniel merges)*
> **As a** buyer, **I want** the checkout page to show the arranged delivery + pago directo cleanly, **so
> that** I can complete the purchase without a dead-end.
- Options proxy (`app/api/checkout/options/route.ts`) + `checkout/page.tsx` derive `delivery_mode` from the
  listing metadata and pass it through.
- `CheckoutExperience.tsx` renders the `coord` delivery method **first-class** (today `coord` appears only via
  the S3.2 quote-failure fallback); the `only_coordinated` empty-payment copy (:631) becomes reachable; the
  page sends `fulfillment_method:'coord'` (:811) → the existing `start-checkout` 422 guard enforces manual.
- **Acceptance:** on an arranged listing (flag on), the checkout page shows "Entrega acordada" as the delivery
  method and only pago directo (SPEI/efectivo) as payment; selecting card is impossible; placing the order
  routes through `fulfillment_method:'coord'` and completes as a manual order.

---

## Sprint QA
- **Pure-logic spec** on the S1.1 derivation seam: `arranged` ⇒ `coord`-only delivery + `onlyCoordinated:true`
  + zero instant payments; `carrier`/flag-off ⇒ unchanged. (Free coverage, no Medusa boot.)
- **API spec** asserting the `checkout-options` response for an arranged listing (delivery + payment shape),
  and that `delivery_mode=arranged` with the flag **off** is identical to today.
- **API spec** (S1.2) asserting create/update persists `delivery_mode` and the publish gate accepts
  arranged-with-manual / rejects arranged-without-manual.
- **Extend** `e2e/checkout-fallback.spec.ts` (or a sibling) for the S1.3 arranged option shape.
- **Anonymous browser smoke** for the rendered arranged delivery + manual-only payment (works without login).
- **Backend prod smoke** (S1.1/S1.2) — no per-branch preview; API-level curl post-merge by the agent.
- **Money-path browser smoke — OWED TO DANIEL** (placing a real arranged order via pago directo; auth + money).

---

## Sprint 1 — Smoke walkthrough (do these in order)
> _Written at sprint close with real production URLs (preview URLs while pre-merge). Money/publish steps are
> flagged **owed to Daniel** — an automated browser smoke can't fully cover auth + money + a real publish._
>
> _Placeholder — fill at sprint close per WAYS-OF-WORKING Stage 8b._
