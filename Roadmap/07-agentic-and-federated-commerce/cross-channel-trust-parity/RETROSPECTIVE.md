# Retrospective — Cross-channel Storefront Trust Parity (#3c · Epic D)

**Shipped:** 2026-06-09, single sprint, PR [#67](https://github.com/danybgoode/miyagisanchezcommerce/pull/67) (squash `e78ae6a`). Frontend-only, LOW–MED.
**Hard dependency:** Epic C Sprint 2 / C.4 (`<TrustSignals>` + `lib/trust-signals.ts`), PR #65 `d35bc8c` — verified on `main` before any code.

## What shipped
- **D.0** (`3224579`) — new pure, next-free `lib/trust-inputs.ts` `deriveShopTrustInputs(metadata, verified)`: the shop-level settings→props deriver D.1 + D.2 share, mirroring the shop-page derivation (`app/s/[slug]/page.tsx`) and reusing `returnsWindowLabel()`. 6-case pure `api` spec.
- **D.1** (`0fba55d`) — the embed shop grid (`app/embed/s/[slug]/page.tsx`) renders the ✓ Verificado badge + `<TrustSignals channel="embed">` (payment/returns/pickup signals); empty shops render nothing.
- **D.2** (`8d08e0a`) — the shared `ChannelLayout` gained an optional `trust?: ReactNode` slot rendering a discreet *"Pago seguro · Compra protegida"* lead line; `app/layout.tsx` (custom/subdomain) + the embed shell pass the slim `<TrustSignals>` (verified + returns chips; `paymentProtected` suppressed since the lead line carries that assurance), channel-mapped.
- Anonymous browser smoke `e2e/cross-channel-trust.browser.spec.ts` (`8741a57`).

## What went well
- **The "consume, don't build" mandate held.** Epic D added **zero** new components — only one pure deriver + wiring. The C.4 hand-off (contract written into *this* sprint doc with the two corrections) meant the props/channel type were right the first try; no parallel type to sync.
- **Medusa-first re-scoping paid off again.** Reading the layout/middleware first revealed the root layout already wraps off-marketplace pages in `ChannelLayout`, collapsing the epic to two real gaps. The deriver fell straight out of the existing shop-page derivation.
- **Deterministic gate green in CI vs the actual branch preview** (tsc + build + `api` incl. the new deriver spec) — the strongest pre-merge signal, independent of my sandbox's limits.

## What we learned / gotchas
- **Middleware strips spoofed `x-miyagi-*` headers on platform hosts** (only middleware may set them). So a browser test **cannot** header-simulate `custom`/`subdomain` against a preview — the planned "x-miyagi-channel=custom simulated" smoke is impossible. `/embed/*` is tagged white-label by **path** (un-spoofable), and renders through the **same `ChannelLayout`**, so the smoke exercises D.2 there instead. The live subdomain/custom-domain look stays owed to Daniel.
- **The local dev server can't reach Medusa from this sandbox** (catalog/`getShop` fetch times out → empty render), so a local curl/browser render-confirmation wasn't possible. The api gate passed only because it ran against deployed **prod/preview**, not a local fetch. I briefly wrote a "verified locally" claim and **corrected it** — honest-gap discipline: don't assert a confirmation that didn't run.
- **A pure shared deriver is the clean seam for "two surfaces need the same inputs."** C.4 left `<TrustSignals>` presentational on purpose; D.0's deriver kept D.1/D.2 as pure wiring and gave free unit coverage. Mirroring the **shop page** (not the listing-type-specific PDP) was the right reference for shop-level surfaces.
- **`mp_enabled` is platform-default-on** at `metadata.mp_enabled` (not in `settings`); mirroring the shop page means MP shows for almost every shop, which also drives `paymentProtected`. Intentional parity with the marketplace shop page.

## Gaps owed to Daniel (cosmetic, not a money path)
- A real-eyes look at a **live subdomain** (`<shop>.miyagisanchez.com`) + a **custom domain**: the assurance strip reads discreet and doesn't clash with seller branding (can't be header-simulated on a preview).
- Running the browser spec / embed render against the preview where Medusa is reachable (CI nightly `browser-smoke.yml` covers the anonymous embed assertions).

## Cosmetic note for the next agent
The embed grid uses `variant="full"` (to surface concrete payment/pickup signals the acceptance lists); its method box uses global tokens (`--bg-elevated`, `--fg`…), so in the embed palette it's a slightly heavier card than the marketplace shop-page pill row. Acceptable; flagged for Daniel's eyeball. If it reads too heavy, `variant="slim"` is the lighter alternative (but drops payment-method names + pickup).
