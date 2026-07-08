---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Sprint 1 (backend charge rail) MERGED 2026-07-07: PR #67 squash 8e41d18, HIGH-risk Daniel-authorized merge-on-green, ships dark behind checkout.rental_pricing_enabled (default false). Clean gating pr-review + codex advisory addressed pre-merge (ad90a71). Flag-OFF prod smoke PASSED 2026-07-08. Sprint 2 (web checkout rental mode + PDP flag flip + order-surface rendering, 3 stories incl. Story 2.3 added at kickoff) MERGED 2026-07-08: PR #190 squash c5c25a3 (danybgoode/miyagisanchezcommerce), HIGH-risk Daniel-authorized merge-on-green. Codex cross-review caught + fixed a real MX-timezone past-date bug + a URL-encoding nit pre-merge (267143e); fresh pr-reviewer approved with no further changes. Sprint 3 (agent parity — checkout-session + MCP get_checkout_options accept check_in/check_out → rental_quote + dated checkout URLs; date-less calls labeled per-period) MERGED 2026-07-08: PR #191 squash a2a2cf5 (danybgoode/miyagisanchezcommerce), LOW-risk Daniel-authorized merge-on-green, quoting-only (no charge code touched). Codex cross-review caught + fixed 2 real gaps pre-merge (94f1691): a rejected dated request still exposing a date-blind MP/Stripe mischarge path, and create_checkout callable on a rental despite its doc warning. **EPIC SHIPPED 2026-07-08 — all 3 sprints merged.** Kill-switch `checkout.rental_pricing_enabled` verified: enablement flag, default `false`, created disabled — confirmed on current main. Owed (Daniel): flag-ON money smoke — needs a disposable test rental listing first (none in prod); S3's own MCP round-trip smoke + fixture-gated specs share this same gap.
slug: rental-backend-line-item-pricing
---

# Epic: Rental line-item pricing — charge nights × rate + deposit online

> **Area:** 02 · Checkout & Payments · **Risk:** HIGH (checkout / payments / money; display + agent-quoting stories LOW) · **Scope doc:** [`00-ideas/2. readyforscope/rental-backend-line-item-pricing.md`](../../00-ideas/2.%20readyforscope/rental-backend-line-item-pricing.md)

**Tagline:** *Elige tus fechas, paga el total real — noches × tarifa + depósito — en un solo paso.*

## Why
The S4 rental PDP already shows the exact total (`días × precio + depósito`, spec-proven in
`lib/rental-pricing.ts`) — but "Reservar estas fechas" deliberately opens an AskSeller conversation,
because the generic checkout charges a single unit of the listing price and ignores the date range
and deposit. This epic makes the shown total the *charged* total: the buyer books and pays in one
step; the seller receives the order with dates and an itemized deposit; agents quote and charge the
same number. Booking a rental stops being a chat negotiation about arithmetic.

## Context
| | |
|---|---|
| **Role** | Buyer (pick dates, pay real total), rental seller (receive booked order, refund path), agent (quote + charge over UCP/MCP) |
| **Macro-section** | 02 · Checkout & Payments |
| **Risk** | HIGH — S1.2/S2.1 mutate the checkout money path. Daniel merges every sprint. Backend-first deploy (~12-min Cloud Run window, no preview) |
| **Flag** | `checkout.rental_pricing_enabled` — enablement flag, default `false`, created **disabled**. OFF = today's coordination flow everywhere (PDP AskSeller, start-checkout 422s the rental branch, agent quote keeps the coordinate note) |
| **Decisions** | 2026-07-06 w/ Daniel: deposit charged with the rent (returns via existing refund machinery; card holds out) · instant book + refund path (no request-to-book, no availability calendar) · agent surface in-epic · all payment methods incl. manual SPEI/cash/DiMo |
| **Bilingual** | es-MX only; NOT added to the bilingual allow-list |

## Medusa-first note
No new tables, no new provider capability. The backend `start-checkout` route **already charges an
override amount** through every provider (`rawItemsCents = support ?? offer_amount_cents ?? cart.total`),
already loads product metadata, and already persists structured state on cart→order metadata
(manual snapshot, pickup appointment, support block). The rental branch is one more computed
override + one more metadata block. **The one hard rule this epic adds:** the rental total is
**server-computed from the dates + the product's own `metadata.attrs`** — the client sends only
`rental: { check_in, check_out }`, never an amount (unlike the offer override, there's no
server-side record to validate a client amount against). A tamper spec asserts a client-sent
amount is ignored.

## What already exists (reuse, don't rebuild)
- **`apps/miyagisanchez/lib/rental-pricing.ts`** — pure, spec-proven pricing seam (`nightsBetween`, `rentalUnits`, `computeRentalTotal`, es-MX labels). Single source of truth for the math; ported (not re-derived) to the backend in S1.1.
- **`app/(shell)/l/[id]/RentalBooking.tsx`** — the PDP date picker + exact-estimate breakdown; S2.2 flips its CTA, nothing else.
- **`apps/backend/src/api/store/carts/[id]/start-checkout/route.ts`** — the override-amount rail, product-metadata load (`loadProductForCheckout`), order-metadata precedents, `FulfillmentMethod` already includes `'rental'`.
- **`checkout-options`** (backend) — already emits the "Renta" delivery method.
- **Rate + deposit on the product** — Medusa `metadata.attrs.rate_period` + `metadata.attrs.deposit` (⚠️ deposit stored in **pesos**, not cents — normalize at ONE seam, unit-tested).
- **`/checkout` page precedents** — the configurator checkout already overrides `amountCents` with a computed price (redirect-to-PDP on unresolvable); the offer checkout already threads a special amount. Pay-button total = summary is the house rule.
- **Manual-payment lifecycle + two-sided refund machine** (#3b / Epic B) — deposit return and can't-honor-dates refunds ride these as-is; no new money mutation.
- **In-house flags** (`lib/flags.ts` frontend + backend readers, fail-open).
- **UCP `checkout-session` + MCP `get_checkout_options`** — already return `rental: { rate_period, deposit_cents }` in the listing read and pre-generate checkout URLs; S3.1 adds the dated quote.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Backend pure pricing seam (port `rental-pricing` + pesos→cents deposit normalization) + unit specs | LOW |
| 1 | 1.2 `start-checkout` rental branch behind the flag: dates in → server-recomputed total charged (all providers) → `rental_booking` metadata block on cart→order; 422 on invalid/malformed/flag-OFF; tamper spec | HIGH |
| 1 | 1.3 Order surfaces: buyer + seller order pages, both emails, in-chat ledger show dates + itemized deposit (normalizer-derived); deposit line sits next to the existing refund action — backend half shipped in S1 (`31e9bbe`), frontend rendering deliberately deferred → done as Story 2.3 below | LOW |
| 2 | ✅ 2.1 `/checkout` rental mode: `checkIn/checkOut` params → same breakdown the PDP showed → dates threaded through `startCheckout`; invalid dates redirect to PDP (`f128ca4`) | HIGH |
| 2 | ✅ 2.2 PDP flip behind the flag: ON → "Reservar estas fechas" deep-links to checkout with dates; OFF (or seller has no payment method) → today's AskSeller, byte-for-byte (`98dd625`) | LOW |
| 2 | ✅ 2.3 Order-surface rendering (added at S2 kickoff, closes the S1.3 handoff): buyer/seller order pages, both emails, in-chat ledger show rental dates + itemized deposit (`9316c42`) | LOW |
| 3 | ✅ 3.1 Agent parity: `checkout-session` accepts `check_in`/`check_out` → `rental_quote` breakdown + dated checkout URLs; MCP `get_checkout_options` parity; date-less calls keep rate+deposit clearly labeled (`f00b1c3`, PR #191) | LOW |

## Deploy order
Sprint 1 (backend) merges + **finishes rolling** first — no per-branch backend preview, so the
API-level smoke runs against prod post-merge and is stated in the PR. Sprints 2–3 are flag-gated
and degrade to AskSeller/coordination, so the deploy-lag window never strands a buyer. Daniel
merges every sprint (HIGH-risk epic). Flag flip is a deliberate post-verify step, never part of a
merge.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated) — S1 #67/8e41d18, S2 #190/c5c25a3, S3 #191/a2a2cf5. Flag-OFF prod smoke passed (S1); flag-ON money smoke + S3's live MCP round-trip remain **owed to Daniel** (no test rental listing in prod yet) — stated, not silently dropped.
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs; money/auth steps owed to Daniel by name)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated — 02 · Checkout & Payments gains the rental line; the 01 PDP rental bullet's "coordinate" phrasing corrected
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Kill-switch: `checkout.rental_pricing_enabled` exists as an **enablement** flag (default `false`, created disabled), verified per WoW DoD
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
