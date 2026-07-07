---
title: "Arranged-only delivery (Epic B · B.5 — spike-unblocked)"
slug: arranged-only-delivery
status: readyforscope
area: "04"
type: feature
priority: wave-3
risk: high
epic: null
build_order: "#3c-B.5"
updated: 2026-07-07
---

# Scope — Arranged-only delivery (BUILD-ORDER #3c · Epic B · B.5)

> **Status: READY FOR SCOPE REVIEW.** Deep-groomed 2026-07-07 off the signed-off spike decision
> ([`spike-arranged-only-delivery.md`](../seeds/spike-arranged-only-delivery.md) → **GO with
> constraints**). The spike already resolved classification, demand, the data model, the payment
> coupling, and traced every consumer on `origin/main` — this doc turns that decision into sliced,
> risk-tiered, buildable stories. Parent Epic B (`02/delivery-money-polish`) shipped its other four
> slices 2026-06-09; B.5 was the one deferred slice, blocked by the spike. It now stands as its own
> single-epic unit under macro-section **04 · Shipping & Delivery**.
>
> **Stage-2.5 bucket: genuinely-new, but half-built** — the `coord` delivery primitive already exists
> end-to-end (seeded shipping option, fulfillment mapping, start-checkout manual-payment guard, the
> FE `only_coordinated` copy + S3.2 coordinated fallback). The missing piece is **intent**: a per-listing
> way to *declare* arranged-only, plus the branch that emits it. So this is wiring + one net-new toggle,
> not a greenfield build.

## The ask (mirrored back)
*You want a seller to be able to publish a listing that is delivered **only** in person / by coordination
— no shippable carrier, no named pickup spot — so that services, rentals, bulky local goods, and
in-person deals stop looking "misconfigured" at checkout. And a buyer (or their agent) checking out such
a listing should see only the arranged (coordinated) delivery path, paid via **pago directo** (SPEI /
efectivo), never card. Right?*

## Decisions inherited from the spike (not re-litigated here)
1. **Model = per-listing `delivery_mode` on Medusa product metadata** (`carrier | arranged`; `both`
   deferred — see Out of scope). Default = `carrier` (today's behavior), so **every existing listing is
   unaffected** — backwards-compatible. Per-listing wins because one shop mixes shippable + local-only
   items; a per-shop default is post-v1. This follows the exact grain `listing_type`/`is_digital` already
   travel (per-listing query params through the whole checkout stack). Medusa-first: product metadata is
   the native home.
2. **Payment coupling = manual only, already enforced in code.** Arranged ⇒ SPEI / efectivo; card is
   rejected. `start-checkout/route.ts:237-247` 422s on `coord`/`none` + non-manual;
   `lib/checkout-fallback.ts` (S3.2) steers to a manual method. **No online pre-pay for arranged in v1.**
3. **The `coord` primitive already exists** — seeded shipping option `miyagi-entrega-acordada`
   (`_utils/fulfillment.ts:18`), `OPTION_KEY_BY_METHOD` maps `coord`/`service`/`rental`/`none`→`coord`
   (`start-checkout/route.ts:33-40`). Nothing new to seed.

## Poster drift this epic corrects
`Roadmap/04-shipping-and-delivery/README.md` **already ✅-claims** "arranged-only listings steer checkout
to manual payment; sellers need a manual payment method to publish arranged-only listings." That is
**aspirational, not enforced** — code still hardcodes `onlyCoordinated = false` and there is no way to
publish an arranged-only listing today. Per the poster rule (✅ = enforced in code), this line should be
🚧 until this epic ships. **This epic makes the ✅ true**; flip it to enforced at epic close.

## What already exists (reuse, don't rebuild) — Medusa-first
| Piece | Where (`origin/main`) | Reuse |
|---|---|---|
| Coordinated shipping option | backend `_utils/fulfillment.ts:18` (`miyagi-entrega-acordada`) | Already seeded — the `coord` fulfillment target. No new option. |
| Fulfillment → option map | backend `start-checkout/route.ts:33-40` (`OPTION_KEY_BY_METHOD`) | `coord`/`service`/`rental`/`none` already map to the coord option. |
| Card + coordinated guard | backend `start-checkout/route.ts:237-247` (422) | Already enforces manual-only for `coord`/`none`. No change (except S2.2 hole). |
| Checkout-options SSOT | backend `checkout-options/route.ts:160` (`onlyCoordinated=false`) | The single hardcoded line to replace; `onlyCoordinated` branch (:185-186,:217) already filters instant payments + returns the flag. |
| Per-listing param plumbing | `checkout-options` `listing_type`/`is_digital` query params; proxy `app/api/checkout/options/route.ts`; `checkout/page.tsx` | `delivery_mode` rides the same rail — additive query param. |
| FE coordinated UI + copy | `CheckoutExperience.tsx` (`only_coordinated` copy :631; `coordinatedActive`/`fulfillment_method:'coord'` :811; S3.2 fallback selector) | Render `coord` first-class; the empty-payment copy becomes reachable. |
| Manual fallback seam | `lib/checkout-fallback.ts` (`pickManualPaymentId`, `shouldOfferCoordinatedFallback`) + `e2e/checkout-fallback.spec.ts` | Pure, unit-tested; reuse for arranged steering. |
| Product write path | backend `_utils/seller-product-create.ts` / `seller-product-update.ts` | Where `delivery_mode` metadata is written from the listing editor. |
| Flag reader | backend `checkout-options` already imports `isEnabled(...)`; `shipping.*` namespace (`shipping.envia_enabled`) | Kill-switch `shipping.arranged_only_enabled` drops in with zero new plumbing. |
| Agent checkout | `app/api/ucp/checkout-session/route.ts` (`fetchBackendPaymentMethods`) | Reads checkout-options but **ignores** `only_coordinated`/`delivery_methods` — add a delivery hint. |

## Slice outline (skateboard → car) — 2 sprints

### Sprint 1 — The web path (seller declares → buyer checks out arranged-only)
The thinnest end-to-end slice that ships and is Daniel-testable: a seller marks a listing arranged-only,
a buyer checks out seeing only the coordinated path + pago directo, and the order completes.
- **S1.1 — Backend emits arranged-only.** `checkout-options` reads a per-listing `delivery_mode` query
  param (`carrier|arranged`, default `carrier`), gated by `shipping.arranged_only_enabled`. For
  `arranged`: push a `coord` delivery method, suppress the carrier `shipping` method, set
  `onlyCoordinated=true` (existing branch filters instant/card + returns `only_coordinated`). Extract the
  delivery-method derivation into a pure, next-free seam for unit testing. **Flag OFF ⇒ byte-identical to
  today.** *(**HIGH — checkout/fulfillment. Daniel merges.**)* **QA:** pure-logic spec on the derivation
  (arranged ⇒ coord-only + `onlyCoordinated` + zero instant payments; carrier ⇒ unchanged); api spec
  asserting the arranged route response. Backend prod smoke owed to Daniel.
- **S1.2 — Seller declares `delivery_mode` per listing.** A per-listing "Entrega" control in the listing
  create/edit form writes `delivery_mode` to product metadata via `seller-product-create/update.ts`. The
  publish-readiness gate accepts `arranged` as a **valid** published state (no carrier origin / no pickup
  spot required) **and** still requires ≥1 manual payment method configured (honors the existing poster
  claim). *(**HIGH — writes product metadata + publish gate. Daniel merges.**)* **QA:** api spec asserting
  create/update persists `delivery_mode` + publish gate accepts arranged-with-manual and rejects
  arranged-without-manual; **seller browser smoke owed to Daniel.**
- **S1.3 — Web checkout honors arranged-only.** Options proxy + `checkout/page.tsx` pass `delivery_mode`;
  `CheckoutExperience.tsx` renders the `coord` method first-class (not just the S3.2 fallback); the
  `only_coordinated` empty-payment copy becomes reachable; sends `fulfillment_method:'coord'` → the
  existing 422 guard enforces manual. *(**HIGH — checkout. Daniel merges.**)* **QA:** extend
  `checkout-fallback.spec` / add an api spec for the arranged option shape; anonymous browser smoke for
  the rendered arranged delivery + manual-only payment; **money-path smoke owed to Daniel.**

### Sprint 2 — Agent parity + consistency hardening (the car)
- **S2.1 — Agent/UCP arranged-only surface.** `checkout-session` adds a `delivery: { arranged, note }`
  hint derived from checkout-options' `only_coordinated`/`delivery_methods` (today both ignored), so an
  agent presents "coordina la entrega con el vendedor" instead of implying shipping; confirm mp/stripe
  already drop out so the agent sees only manual methods. *(**MED — additive agent surface; reads the
  money-path SSOT but mutates nothing. Reviewer may merge on green CI.**)* **QA:** api spec asserting an
  arranged listing's UCP session omits instant `checkout_url`s and carries the arranged delivery hint.
- **S2.2 — Close the service/rental card-payment hole.** Today `service`/`rental` listings send
  `fulfillment_method:'service'|'rental'`, which the start-checkout 422 guard (`none`/`coord` only) does
  **not** catch → they are **card-payable** despite routing to `coord` fulfillment. Make the arranged
  signal canonical: map service/rental to arranged in checkout-options, or extend the guard to treat them
  as coordinated. *(**HIGH — fixes a live money-path inconsistency. Daniel merges.**)* **QA:** api spec
  asserting card + service/rental now 422s (or is filtered out); regression spec so it can't silently
  return.

## Kill-switch (high-risk epic — decided at grooming per WAYS-OF-WORKING §6b)
`shipping.arranged_only_enabled` — **enablement flag, default `false`, created disabled.** When off,
`checkout-options` ignores `delivery_mode` (everything behaves as `carrier` = today) and the seller toggle
is hidden / no-op. FE + BE merge **dark**; flip on after the S1 money-path smoke. Fail-open to the current
behavior (absent flag ⇒ carrier), matching `isEnabled`'s default-off semantics.

## Deploy order
**Backend-first** (per LEARNINGS — backend ~12 min, no preview). `checkout-options` + the product
write/publish gate + the start-checkout hole fix must be live before the FE reads/writes `delivery_mode`;
the FE degrades gracefully (`delivery_mode` absent ⇒ carrier). S1.1 + S1.2 (backend) land and deploy
before S1.3 (FE) reads them.

## In / Out of scope (v1)
**In:** per-listing `delivery_mode` (`carrier|arranged`) on product metadata (default carrier,
back-compat); `checkout-options` emits `coord` + `onlyCoordinated` for arranged behind the kill-switch;
seller listing-editor toggle; publish gate accepts arranged-with-manual; web checkout renders arranged
first-class; UCP agent delivery hint; the service/rental card-payment fix; manual-only payment (already
coded); bilingual es-MX copy; one pure-logic seam + api spec per testable story; `shipping.arranged_only_enabled`.
**Out (deferred):** `both` mode (carrier **and** arranged on one listing) — ships in v1 **only** if it
falls out near-free from S1.1's multi-method compose, otherwise its own follow-up; per-shop default
`delivery_mode`; any online pre-pay / card capture for arranged listings; agent-initiated arranged-order
*issuance* (UCP session stays surface-parity, per its own `quantity` note); delivery-causality copy beyond
the arranged path.

## Open risks / questions
- **Money/fulfillment epic — HIGH throughout.** S1.1/S1.2/S1.3/S2.2 are Daniel-merge; authed money-path
  browser smokes owed to Daniel by name in each sprint doc.
- **Kill-switch dark-ship is the guardrail** — with the flag off, arranged is inert and existing checkout
  is untouched, so the blast radius on live commerce before flip is zero.
- **`both` mode is the one genuine open v1 call** — include only if cheap; otherwise defer to keep the
  slice honest (spike guidance).
- **No external-fact research needed** — the payment coupling, Medusa fulfillment options, and every
  consumer were verified against current code in the spike + this pass.

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance checks Daniel-runnable per story.
- [x] Stage-2.5 bucket named (genuinely-new, half-built — reuse head-start documented).
- [x] v1 in/out boundary written; model + payment coupling inherited from the signed-off spike.
- [x] Medusa-first reuse list produced (concrete files/routes on `origin/main`).
- [x] Each story risk-tiered; QA stage named; high-risk merge owner = Daniel; kill-switch decided.
- [x] **Daniel approved this scope doc (2026-07-07)** ← gate passed. Scaffold as scoped (2 sprints under 04);
      service/rental hole folded in as S2.2; `both` v1-only-if-near-free. Epic scaffolded under
      `04-shipping-and-delivery/arranged-only-delivery/`; kickoff prompts emitted.
