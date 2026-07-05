# Shipping provider expansion — Sprint 3: Correos de México — manual economy provider (Impresos v1)

**Status:** ⬜ not started

> New provider **class**: a manual carrier with a real, priced checkout rate — no API, no labels.
> v1 = **Impresos en General only** (national flat weight bands, no zones, no tracking; 2026 tariff —
> local copy `references/correos-de-mexico-impresos.pdf`, $6.00 MXN ≤20 g). MEXPOST (zoned/tracked) and
> ordinary Paquetería are later rows on the same calculator. Behind **`shipping.correos_enabled`**
> (enablement, default OFF, created disabled).
> **Honesty notes:** Impresos is legally printed-matter mail — the explainer names the intended use.
> Ordinary mail has no rastreo — buyer copy must never imply tracking.

## Stories

### Story 3.1 — Pure Impresos tariff lib
**As** the platform, **I want** a versioned tariff table (weight bands → IVA-inclusive MXN totals, with
`vigencia` date) + a pure `quoteCorreos(weightGrams)` calculator, **so that** the rate is deterministic,
spec-locked against the published PDF, and a tariff republication is a one-constant PR.
**Acceptance:** unit specs pin band edges + totals to the 2026 PDF; over-max weight returns null (no quote).
**Risk:** low

### Story 3.2 — Seller opt-in + rate preview
**As a** seller, **I want** a toggle «Ofrecer Correos de México (económico)» in my shipping settings with
a live rate preview from my package defaults and a plain explainer (drop-off at the post office, franqueo
on me, printed-matter class, sin rastreo), **so that** I control whether the slow-cheap option exists on
my shop and know exactly what I'm signing up for.
**Acceptance:** toggle persists in shop shipping settings (same object as `envia_enabled`); preview shows
the band price for my default weight.
**Risk:** low

### Story 3.3 — Correos option at checkout
**As a** buyer, **I want** «Correos de México — Económico · 4–10 días · sin rastreo» as a selectable
shipping option, priced from item weight — shown only when `shipping.correos_enabled` is ON **and** the
seller opted in **and** total weight ≤ table max — **so that** I can choose the no-hurry option for light,
low-value items. Backend checkout-options is the SSOT, so UCP/MCP agents inherit it identically. Never
pre-selected over faster options.
**Acceptance:** eligible listing shows the option with the correct band price; over-weight, opted-out, or
flag-OFF ⇒ the option never appears (UI or agents); order records the method + price.
**Risk:** HIGH (checkout money path → Daniel merge)

### Story 3.4 — Manual fulfillment + honest emails
**As a** seller, **I want** Correos orders to ship through the existing manual-carrier flow — carrier
pre-set to «Correos de México», tracking number **optional** (registered mail) — with buyer emails that
set the sin-rastreo, 4–10 días expectation, **so that** fulfillment stays familiar and nobody is promised
tracking that doesn't exist.
**Acceptance:** marking shipped works with an empty tracking field; buyer email copy states the
expectation; the "can't ship before payment" 422 gate still applies.
**Risk:** med

### Story 3.5 — Agent parity + specs
**As** an AI shopping agent, **I want** the Correos method in UCP checkout-options/checkout-session
exactly as the web sees it, **so that** agent checkout stays at parity (AGENTS rule #3).
**Acceptance:** one `api` spec per testable story (options gating matrix, quote math, flag OFF); a
browser smoke asserts the rendered option + copy.
**Risk:** low

## Sprint QA
- **api spec(s):** tariff-lib unit specs (band edges vs PDF); checkout-options gating matrix spec
  (flag × opt-in × weight); UCP parity spec.
- **browser smoke owed:** **yes, to Daniel** — one real Correos checkout (pay, seller marks shipped, both
  emails arrive with honest copy) + the flag-flip (`shipping.correos_enabled` OFF→ON) in prod.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge;
  backend-first (S3.1→S3.3 before S3.2/S3.4).

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
   → Option gone everywhere (agents included — `POST /api/ucp/checkout-session` shows no Correos method).

If any step fails, note the step number + what you saw — that's the bug report.
