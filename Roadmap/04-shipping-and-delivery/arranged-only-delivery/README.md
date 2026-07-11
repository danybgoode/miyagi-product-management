---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: arranged-only-delivery
---

# Epic — Arranged-only delivery

> **Macro-section:** [04 · Shipping & Delivery](../README.md) · **BUILD-ORDER:** #3c · Epic B · B.5 ·
> **Risk: HIGH — Daniel merges** (checkout / fulfillment / payment routing / product publish).
> **Status: ✅ SHIPPED 2026-07-11 — both sprints merged to `main` in both repos.** [Sprint 1](sprint-1.md)
> (web path — PR #84 backend, #223 frontend) and [Sprint 2](sprint-2.md) (agent parity + the card-payment
> hole fix — PR #85 backend, #228 frontend) both live. The `shipping.arranged_only_enabled` kill-switch
> stays OFF/dark (per its own gate — flips only after Daniel's money smoke); the service/rental
> card-payment fix (S2.2) is unconditional and live now, no flag. Deep-groomed from the signed-off spike
> ([`spike-arranged-only-delivery.md`](../../00-ideas/seeds/spike-arranged-only-delivery.md) → **GO with
> constraints**, decision landed `3be3fb2`). Scope doc:
> [`00-ideas/2. readyforscope/arranged-only-delivery.md`](../../00-ideas/2.%20readyforscope/arranged-only-delivery.md).
> Wave context: [`remaining-audit-polish.md`](../../00-ideas/seeds/remaining-audit-polish.md) (#3c Epic B,
> B.5). Parent Epic B ([`02/delivery-money-polish`](../../02-checkout-and-payments/delivery-money-polish/README.md))
> shipped its other four slices 2026-06-09; B.5 was the deferred, spike-blocked slice and now stands alone.

## Why
Today `checkout-options/route.ts:160` hardcodes `const onlyCoordinated = false`, so **every** listing must
offer a carrier quote and "entrega acordada" is only ever an add-on. A seller who genuinely delivers only
in person — a service, a rental, a fridge for local hand-off, an in-person deal — has no way to say so, and
their listing dead-ends at checkout as "este vendedor aún no configura la entrega." The spike confirmed the
capability is **half-built**: the `coord` primitive, the manual-payment guard, and the FE coordinated copy
already exist. This epic adds the **intent** — a per-listing `delivery_mode` — and the branch that emits it,
so arranged-only becomes a first-class, publishable, buyable state. It also corrects a poster over-claim
(04 already ✅-says arranged-only steers to manual payment; that's aspirational until this ships) and closes
a live money-path hole (services/rentals are currently card-payable despite coordinated fulfillment).

## Context

| Question | Answer |
|---|---|
| **Who** | Sellers of services / rentals / bulky-local / in-person goods; buyers + their agents checking such listings out |
| **Job** | Publish a listing delivered only by coordination (no carrier, no pickup spot) and have checkout honor it — arranged delivery, pago directo only |
| **Outcome signal** | A seller marks a listing "arranged-only"; the buyer's checkout shows **only** the coordinated delivery + SPEI/efectivo (no card); the order completes via pago directo; an agent sees the same, with no shipping implied |
| **In v1** | Per-listing `delivery_mode` (`carrier\|arranged`) on product metadata (default carrier, back-compat) · `checkout-options` emits `coord` + `onlyCoordinated` for arranged, behind the kill-switch · seller listing-editor toggle · publish gate accepts arranged-with-manual · web checkout renders arranged first-class · UCP agent delivery hint · service/rental card-payment fix |
| **Out** | `both` mode (carrier **and** arranged) unless near-free · per-shop default `delivery_mode` · online pre-pay / card for arranged · agent-initiated arranged-order *issuance* · delivery-causality copy beyond the arranged path |
| **Risk tier** | HIGH (S1.1–S1.3, S2.2 — Daniel merges); S2.1 MED |
| **Kill-switch** | `shipping.arranged_only_enabled` — enablement, default `false`, created disabled (dark-ship; flip after S1 money smoke) |

## Medusa-first note
`delivery_mode` rides **Medusa product metadata** (per-listing, no new table) — the same grain
`listing_type`/`is_digital` already travel as checkout-options query params. The `coord` fulfillment option
(`miyagi-entrega-acordada`) is **already seeded**; nothing new to provision. Payment coupling is **already
enforced** in `start-checkout` (422 on `coord`/`none` + non-manual). The arranged signal serializes into the
**UCP/MCP** checkout session (additive). Bilingual es-MX for all new copy. Clerk untouched. Supabase not
involved (this is pure commerce, Medusa's lane).

## What already exists (reuse, don't rebuild)
- **`coord` shipping option** — backend `_utils/fulfillment.ts:18` (`miyagi-entrega-acordada`); the
  fulfillment target for arranged. No new option.
- **Fulfillment → option map** — `start-checkout/route.ts:33-40` (`OPTION_KEY_BY_METHOD`): `coord`/`service`/
  `rental`/`none` already resolve to the coord option (with a $0 rate).
- **Card + coordinated 422 guard** — `start-checkout/route.ts:237-247` already enforces manual-only for
  `coord`/`none`. Reuse as-is; S2.2 extends it to catch service/rental.
- **The one line to replace** — `checkout-options/route.ts:160` (`const onlyCoordinated = false`); the
  `onlyCoordinated` branch (:185-186 filters instant payments; :217 returns the flag) is already written.
- **Per-listing param rail** — `checkout-options` `listing_type`/`is_digital`; proxy
  `app/api/checkout/options/route.ts`; `checkout/page.tsx`. `delivery_mode` is an additive query param.
- **FE coordinated UI + copy** — `CheckoutExperience.tsx`: `only_coordinated` empty-payment copy (:631),
  `coordinatedActive` + `fulfillment_method:'coord'` (:811), the S3.2 fallback selector. Render coord
  first-class; the copy becomes reachable.
- **Manual fallback seam** — `lib/checkout-fallback.ts` (`pickManualPaymentId`) + `e2e/checkout-fallback.spec.ts`
  (pure, unit-tested).
- **Product write path** — backend `_utils/seller-product-create.ts` / `seller-product-update.ts` — where
  `delivery_mode` metadata is written from the listing editor.
- **Flag reader** — `checkout-options` already imports `isEnabled(...)`; `shipping.*` namespace exists
  (`shipping.envia_enabled`). `shipping.arranged_only_enabled` drops in with no new plumbing.
- **Agent checkout** — `app/api/ucp/checkout-session/route.ts` `fetchBackendPaymentMethods` reads
  checkout-options but **ignores** `only_coordinated`/`delivery_methods` — add the delivery hint there.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · Web path** | S1.1 `checkout-options` reads per-listing `delivery_mode` (`carrier\|arranged`, default carrier), gated by `shipping.arranged_only_enabled`; arranged ⇒ push `coord`, suppress carrier `shipping`, set `onlyCoordinated`. Pure derivation seam + api spec. Flag OFF ⇒ identical to today | HIGH |
| | S1.2 Seller declares `delivery_mode` per listing (listing editor toggle → product metadata via `seller-product-create/update.ts`); publish gate accepts `arranged` (no carrier/pickup) **but** still requires ≥1 manual payment method | HIGH |
| | S1.3 Web checkout honors arranged — proxy + `checkout/page.tsx` pass `delivery_mode`; `CheckoutExperience` renders `coord` first-class + `only_coordinated` copy; sends `fulfillment_method:'coord'` (existing 422 enforces manual) | HIGH |
| **S2 · Agent + hardening** | S2.1 UCP `checkout-session` adds a `delivery: { arranged, note }` hint from `only_coordinated`/`delivery_methods`; confirms mp/stripe drop out; agent recovery copy | MED |
| | S2.2 Close the service/rental **AND arranged-product** card-payment hole — the `start-checkout` 422 guard keys off client-supplied `body.fulfillment_method`, not the listing's actual `delivery_mode`/type, so a direct API/MCP call sending `fulfillment_method:'shipping'` for an arranged product (not just service/rental) currently bypasses the manual-only guarantee. Re-derive the coordinated signal server-side from the cart's product metadata rather than trusting the client's fulfillment_method + regression spec. **Widened from the original service/rental-only scope by S1's cross-agent + pr-reviewer passes, 2026-07-11** — the same class of gap, one story wider. Must land (or the flag must stay OFF) before any arranged-product money-path smoke. | HIGH |

> **`both` mode (S1.1 stretch):** ships in v1 **only** if it falls out of the multi-method compose cheaply;
> otherwise it defers to its own follow-up. Not a v1 commitment.

## Deploy order (two repos, async)
**Backend-first** (backend ~12 min, no preview — per LEARNINGS). S1.1 (`checkout-options`) + S1.2 (product
write + publish gate) + S2.2 (`start-checkout`) must be live before S1.3/S2.1 (frontend) read/write
`delivery_mode`. The frontend degrades gracefully — `delivery_mode` absent ⇒ `carrier` = today. The
kill-switch keeps the whole feature inert until flipped, so FE + BE merge dark with zero live-commerce risk.

## Epic Definition of Done
- [x] Both sprints' stories merged + smoke-tested (money/auth gaps stated; owed to Daniel by name — he'll
      run the money-path smokes for both sprints in prod).
- [x] Each `sprint-N.md` has a fool-proof smoke walkthrough (real prod URLs once deployed; money/publish
      steps flagged Daniel-owed).
- [x] This README ✅ complete (`status: shipped`); every sprint status ticked with commit refs.
- [x] `RETROSPECTIVE.md` written.
- [x] Product poster (`Roadmap/README.md` + `04/README.md`) updated — flip the arranged-only line from
      aspirational to ✅ enforced; add a Recent highlights entry.
- [x] Team memory + `LEARNINGS.md` updated (durable learning — the half-built-primitive reuse; the
      service/rental guard hole).
- [ ] **Kill-switch verified:** `shipping.arranged_only_enabled` exists (enablement, default `false`,
      created disabled) — done. **Flip to ON still pending Daniel's S1 money smoke** (unchanged gate; this
      is the one item this epic doc leaves genuinely open, by design).
- [x] Branch deleted; PR(s) merged.
