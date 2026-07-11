# Shipping provider expansion — Sprint 3: Correos de México — manual economy provider (Impresos v1)

**Status:** ✅ built — backend `feat/shipping-provider-expansion-s3` (commits `9d2f5cd`, `2875332`,
`a0569c8`), frontend `feat/shipping-provider-expansion-s3` (commits `84c3b36`, `ea03889`, `e860200`,
`a786ce3`). Deterministic gate green on both (tsc + build + unit/Playwright). PRs open, S3.3 awaiting
Daniel's merge (HIGH risk). Live money-path smoke below still owed to Daniel.

> New provider **class**: a manual carrier with a real, priced checkout rate — no API, no labels.
> v1 = **Impresos en General only** (national flat weight bands, no zones, no tracking; 2026 tariff —
> local copy `references/correos-de-mexico-impresos.pdf`, $6.00 MXN ≤20 g). MEXPOST (zoned/tracked) and
> ordinary Paquetería are later rows on the same calculator. Behind **`shipping.correos_enabled`**
> (enablement, default OFF, created disabled).
> **Honesty notes:** Impresos is legally printed-matter mail — the explainer names the intended use.
> Ordinary mail has no rastreo — buyer copy must never imply tracking.

## Stories

### Story 3.1 — Pure Impresos tariff lib ✅ backend `9d2f5cd` · frontend `84c3b36`
**As** the platform, **I want** a versioned tariff table (weight bands → IVA-inclusive MXN totals, with
`vigencia` date) + a pure `quoteCorreos(weightGrams)` calculator, **so that** the rate is deterministic,
spec-locked against the published PDF, and a tariff republication is a one-constant PR.
**Acceptance:** unit specs pin band edges + totals to the 2026 PDF; over-max weight returns null (no quote).
**Risk:** low
**Built:** 28 bands (not 26 — recount against the PDF), `apps/backend/src/lib/correos-tariff.ts` +
`correos-gate.ts` (pure flag×opt-in AND, mirrors `envia-killswitch.ts`) + FE byte-for-byte twin
`apps/miyagisanchez/lib/correos-tariff.ts` (rental-pricing.ts precedent). 39 backend Jest + 36 FE
Playwright specs, all green.

### Story 3.2 — Seller opt-in + rate preview ✅ frontend `ea03889`
**As a** seller, **I want** a toggle «Ofrecer Correos de México (económico)» in my shipping settings with
a live rate preview from my package defaults and a plain explainer (drop-off at the post office, franqueo
on me, printed-matter class, sin rastreo), **so that** I control whether the slow-cheap option exists on
my shop and know exactly what I'm signing up for.
**Acceptance:** toggle persists in shop shipping settings (same object as `envia_enabled`); preview shows
the band price for my default weight.
**Risk:** low
**Built:** `shipping.correos_enabled` sibling key to `envia_enabled` under `settings.shipping`; toggle in
`Envios.tsx` disabled until the platform flag is on (no comp-grant for Correos, unlike Envía — just the
one flag); preview calls the FE `quoteCorreos` twin directly, no round trip.

### Story 3.3 — Correos option at checkout ✅ backend `2875332`
**As a** buyer, **I want** «Correos de México — Económico · 4–10 días · sin rastreo» as a selectable
shipping option, priced from item weight — shown only when `shipping.correos_enabled` is ON **and** the
seller opted in **and** total weight ≤ table max — **so that** I can choose the no-hurry option for light,
low-value items. Backend checkout-options is the SSOT, so UCP/MCP agents inherit it identically. Never
pre-selected over faster options.
**Acceptance:** eligible listing shows the option with the correct band price; over-weight, opted-out, or
flag-OFF ⇒ the option never appears (UI or agents); order records the method + price.
**Risk:** HIGH (checkout money path → Daniel merge)
**Built — real gotcha found:** the Envía kill-switch's early-return in `POST /store/envia/rates` would
have swallowed Correos entirely (it short-circuited before any Correos logic ran). Correos is a wholly
independent provider (no funding gate, no comp-grant), so the route was restructured: only short-circuits
to the bare fallback when NEITHER provider can quote; when Envía is live, Correos is appended AFTER the
price-sorted list — never inserted by price — because the frontend blindly pre-selects `rates[0]`, and a
cheap Correos rate sorted by price would otherwise land ahead of a faster carrier. `checkout-options`'
`hasLiveShipping` widened the same way so a Correos-only seller (no Envía origin/grant) still shows the
"shipping" category. "Backend checkout-options is the SSOT so UCP/MCP agents inherit it" holds for the
web + the resolved rate route — see Story 3.5's correction for the buyer-side UCP gap found separately.

### Story 3.4 — Manual fulfillment + honest emails ✅ backend `a0569c8` · frontend `e860200`
**As a** seller, **I want** Correos orders to ship through the existing manual-carrier flow — carrier
pre-set to «Correos de México», tracking number **optional** (registered mail) — with buyer emails that
set the sin-rastreo, 4–10 días expectation, **so that** fulfillment stays familiar and nobody is promised
tracking that doesn't exist.
**Acceptance:** marking shipped works with an empty tracking field; buyer email copy states the
expectation; the "can't ship before payment" 422 gate still applies.
**Risk:** med
**Built — real bug found:** `sendOrderShipped`'s "Puedes rastrear el estado de tu envío…" line was
**false** for a no-tracking carrier, for every carrier, not just Correos — now branches on
`carrier === 'correos_mx'` to honest sin-rastreo/4–10-días copy. New `order.checkout_shipping_carrier`
field (backend) lets the seller ship form pre-fill the right carrier instead of always defaulting to
`'dhl'`. **Scope note:** `sendOrderConfirmedToBuyer` was left generic — it makes no tracking claim for
any carrier today, so there was no dishonesty to fix, and threading `shipping_carrier` through 5
Stripe/MercadoPago webhook call sites for a cosmetic addition wasn't worth the money-path-file risk.

### Story 3.5 — Agent parity + specs ✅ frontend `a786ce3` — NARROWED, confirmed with Daniel
**As** an AI shopping agent, **I want** the Correos method in UCP checkout-options/checkout-session
exactly as the web sees it, **so that** agent checkout stays at parity (AGENTS rule #3).
**Acceptance:** one `api` spec per testable story (options gating matrix, quote math, flag OFF); a
browser smoke asserts the rendered option + copy.
**Risk:** low
**Correction found during build:** `POST /api/ucp/checkout-session` (buyer-side) has **zero**
shipping/delivery-method exposure today — not just for Correos, for anything, Envía included. It only
ever reads `payment_methods` off the `checkout-options` SSOT. "Backend checkout-options is the SSOT so
agents inherit" is true for the *quote route* (Story 3.3) but was never built for this buyer-side UCP
surface. Confirmed with Daniel: **defer**, don't build it as a Correos-shaped side effect of this sprint.
**Built instead:** `patch_store_configuration`'s shipping schema gains `correos_enabled` (seller-agent
config parity — read/write already worked generically); a new flag-agnostic fixture-gated spec
(`ucp-checkout-session-shipping-boundary.spec.ts`) documents and locks the real boundary; the full
buyer-side exposure (Envía + Correos both) is seeded at
[`00-ideas/seeds/ucp-buyer-shipping-exposure.md`](../../00-ideas/seeds/ucp-buyer-shipping-exposure.md) —
a real agent money-path surface that deserves its own groom pass, not a HIGH-risk PR side-quest.

## Sprint QA
- **api spec(s) — built:** backend Jest `correos-tariff.unit.spec.ts` (39 cases, all 28 band edges +
  boundaries) + `correos-gate.unit.spec.ts` (5 cases); frontend Playwright `correos-tariff.spec.ts` (36
  cases, byte-for-byte twin) + `ucp-checkout-session-shipping-boundary.spec.ts` (fixture-gated, skips
  without `MS_TEST_SHIPPABLE_LISTING_ID`) + an updated `flags-admin.spec.ts` (24-flag count). **Owed:** a
  live-route gating-matrix spec (flag × seller opt-in × weight) against `envia/rates`/`checkout-options`
  needs a seeded test seller — not available this session, same gap Sprint 2 stated rather than skipped
  silently.
- **browser smoke owed:** **yes, to Daniel** — one real Correos checkout (pay, seller marks shipped, both
  emails arrive with honest copy) + the flag-flip (`shipping.correos_enabled` OFF→ON) in prod.
- **deterministic gate — green both apps:** backend `medusa build` + `tsc --noEmit` + `npm run test:unit`
  (359/359, zero regressions). Frontend `tsc --noEmit` + `next build` + the directly-relevant Playwright
  `api` specs (53/53 passed, 1 fixture-gated skip as expected). Backend-first commit order
  (S3.1 → S3.3 → S3.4 → S3.2 → S3.5, in practice — S3.2/S3.4 landed after S3.3 per the epic's stated order).

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (flag flip owed to Daniel)

1. In the flags admin, flip `shipping.correos_enabled` ON. **(flag flip — Daniel)**
   → Flag shows enabled.
2. Go to https://miyagisanchez.com/shop/manage/settings (test shop) → Envíos → enable «Ofrecer Correos de México».
   → Toggle persists; rate preview shows the band price for the shop's default weight.
3. Open a light listing (≤100 g) from that shop in a private window; add to cart; enter any MX address.
   → «Correos de México — Económico · 4–10 días · sin rastreo» appears with the correct price (e.g. $6–8 MXN); it is NOT pre-selected.
4. Complete the purchase with a test payment. **(money path — Daniel)**
   → Order confirmation shows the Correos method + price; no tracking promised anywhere.
5. As the seller, confirm payment, then mark shipped with the carrier pre-set and tracking left empty.
   → Ship succeeds; buyer email sets the 4–10 días / sin rastreo expectation.
6. Toggle the seller opt-in OFF and reload step 3's checkout.
   → The Correos option is gone; other options unchanged.
7. Flip `shipping.correos_enabled` OFF and repeat step 3 with a still-opted-in shop.
   → Option gone everywhere. **UCP note (found during build, Story 3.5):** `POST /api/ucp/checkout-session`
   shows no shipping/delivery field at all today, flag ON or OFF — so "no Correos method" is trivially
   true there, not yet a real parity proof. Real buyer-side UCP shipping parity is deferred (see Story 3.5
   + the `ucp-buyer-shipping-exposure` seed); the meaningful agent-facing check today is the resolved
   `/store/envia/rates` route itself (what checkout-options/the rates seam return), covered by the api
   specs, not this UCP step.

If any step fails, note the step number + what you saw — that's the bug report.
