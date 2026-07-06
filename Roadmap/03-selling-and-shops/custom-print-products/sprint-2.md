# Custom print products — Sprint 2: Priced options + quantity tiers (commerce core)

**Status:** ✅ merged 2026-07-06 — backend [#60](https://github.com/danybgoode/medusa-bonsai-backend/pull/60) (`d22fb29`), frontend [#175](https://github.com/danybgoode/miyagisanchezcommerce/pull/175) (`7009895`), both cross-reviewed (8 rounds) + Daniel-authorized merge. Owed: seller-facing "Opciones" UI (new Story 2.4, added below), Daniel's money-path browser smoke.

> ✅ **Verify-first finding (2026-07-05):** confirmed on our installed Medusa v2.15.3
> (`apps/backend/package.json`) that cart price calculation **does** resolve quantity into
> `min_quantity`/`max_quantity` tier prices — [medusa#12706](https://github.com/medusajs/medusa/issues/12706)
> does not apply to us. No start-checkout fallback needed.
>
> Evidence:
> - `node_modules/@medusajs/pricing/dist/repositories/pricing.js:22-80` — `calculatePrices` extracts
>   `quantity` from the pricing context and adds SQL `WHERE min_quantity <= quantity AND max_quantity >=
>   quantity` when quantity is present; only falls back to the base (no-tier) price when quantity is
>   omitted entirely from the context.
> - `node_modules/@medusajs/core-flows/dist/cart/workflows/get-variants-and-items-with-prices.js:33-46` —
>   builds a **per-line-item** pricing context including `item.quantity` (not one shared cart-wide
>   context), confirmed wired into `refresh-cart-items.js`, `add-to-cart.js`, and
>   `update-line-item-in-cart.js` — the real cart paths.
> - The GitHub issue itself (filed against v2.7.1, closed "not planned") describes quantity being
>   unavailable when a cart holds multiple items — our installed version's per-item context construction
>   doesn't have that gap.
> - No `CHANGELOG.md` entry between 2.8 and 2.15 mentions a fix in this area; the code has simply always
>   worked correctly on the version we run. No existing manual tier-price workaround was found anywhere in
>   `apps/backend/src`.
> - Consequence: `start-checkout` (`apps/backend/src/api/store/carts/[id]/start-checkout/route.ts:~327-330`)
>   already manually sums `unit_price * quantity` across `cart.items` as a `cart.total` fallback — since
>   each item's `unit_price` is already tier-resolved by Medusa, this seam needs **no new logic**.

## Stories

### Story 2.1 — Seller defines priced option dimensions → real Medusa variants
**As a** print-shop seller, **I want** to add option dimensions (Tamaño / Material / Acabado, up to ~3) with per-combination pricing to a listing (create + edit), **so that** a 7.5cm holográfico costs what it should without chat back-and-forth.
**Acceptance:** options persist as native Medusa options/variants; existing single-variant listings and their edit flow are untouched (sweep the `variants[0]` call sites: `_utils/seller-product-update.ts`, inventory summing, offers, ML link); deleting a dimension is safe on a listing with orders.
**Risk:** HIGH
**Built:** `option_dimensions`/`variant_prices` accepted by both `POST /store/sellers/me/products` (create) and `PATCH /store/sellers/me/products/:id` (`applyOptionDimensions()` — additive-only workflows, never `updateProductsWorkflow`'s array-replace, which was verified against the installed MikroORM source to hard-delete anything omitted with no cross-module link cleanup). Order-safety guard (**revised mid-review**, see below): the old Default variant + option are deleted only when `orderModuleService.listOrderLineItems` finds zero references on the old variant; a listing with any order history is **refused outright (422)** rather than restructured in place — Medusa requires every new variant to specify a value for every option currently on the product (verified against `@medusajs/product`'s `assignOptionsToVariants`), which forces the old option's removal regardless, so the old variant can never actually be preserved once this runs. Full `variants[0]` sweep done (`listing.ts`, `lib/listings.ts`, `envia/rates`, 3 ML-sync fallback sites — now fail loud instead of silently guessing on a multi-variant product).
**⚠️ Owed — no seller-facing UI yet:** there is no `/shop/manage` screen to enter dimensions/tiers through a form. This sprint shipped the *backend capability* (correct Medusa data model + API) and the *buyer-facing consumption* (PDP configurator buy box + checkout), verified by direct API calls — but a seller today can only set `option_dimensions`/`variant_prices`/`variant_tiers` via a direct API call (e.g. through the seller's own MCP agent, which already has API access) or `curl`, not through a settings page. **A seller-facing "Opciones" UI is a real gap against this story's plain-language acceptance** and should be its own story before this is fully "done" from a seller's perspective.

### Story 2.2 — Quantity price breaks per variant
**As a** seller, **I want** quantity tiers (e.g. 10 / 25 / 50 / 100+) per variant, **so that** bulk pricing works like Sticker Mule's automatic discounts.
**Acceptance:** tiers stored as Medusa `min_quantity`/`max_quantity` prices; overlapping/gapped tiers rejected with a clear es-MX message; a listing without tiers behaves exactly as today.
**Risk:** HIGH
**Built:** `src/lib/price-tiers.ts` `validateTierLadder()` (pure, 9 unit tests) + a `variant_tiers` write path in `seller-product-update.ts` (soft-deletes the variant's existing MXN prices, then writes the full ladder via `pricingService.addPrices()` with `min_quantity`/`max_quantity`). Same "owed" seller-UI gap as 2.1 — configured via API only.

### Story 2.3 — Correct variant × quantity pricing through PDP → cart → checkout
**As a** buyer, **I want** the price I see at every step to match the variant + quantity I chose, **so that** the pay button never lies (house rule: pay-button total always equals the summary).
**Acceptance:** pure price-grid deriver extracted to `lib/` (unit-tested: tier boundaries, currency, MXN rounding); changing quantity in the cart re-resolves the tier; coupons and negotiation offers apply to the resolved variant+qty price (spec this explicitly).
**Risk:** HIGH
**Built:** new `GET /store/listings/:id/price-grid` (reads Medusa's own Price rows, not a metadata mirror) + `lib/price-grid.ts` (pure deriver, 14 unit tests) + `ConfiguratorBuyBox.tsx` (variant selector + live qty stepper on the PDP, wired into both buy-CTA trees) + `variantId` threaded end-to-end into checkout (`CheckoutPayButton`/`CheckoutExperience`/`startCheckout()`) + the checkout page re-resolving the exact tier-correct price server-side before display. **Scope call confirmed with Daniel (2026-07-05):** negotiation/offers do **not** apply to multi-variant/tiered listings this sprint — those stay cash/card-only; single-variant/no-tier listings keep negotiation exactly as today. **Cart clarification:** the multi-seller bundle `CartDrawer` (`CartContext.tsx`) has no per-item quantity concept at all (add/remove only, confirmed by reading its reducer) — "cart quantity re-resolves the tier" is satisfied by `ConfiguratorBuyBox`'s own qty stepper (live client recompute) + checkout's server-side re-resolution, not a `CartDrawer` change.

### Story 2.4 — Seller-facing "Opciones" UI (NEW — added 2026-07-06, not yet built)
**As a** print-shop seller, **I want** a settings screen to add dimensions, per-combination prices, and quantity tiers to my listing, **so that** I don't need a direct API call or my agent to configure a configurator product.
**Why this exists:** Stories 2.1/2.2's own acceptance ("Seller defines...", "Seller sets...") implies a UI action, but Sprint 2 shipped only the backend capability (`option_dimensions`/`variant_prices`/`variant_tiers` API fields) + the buyer-facing PDP/checkout consumption — verified working via direct API calls, never through a form. Checked against the epic's full scope table: **not covered by any Sprint 3/4 story** — Sprint 3 is entirely buyer-facing (artwork upload, preflight, the buy box already built early as part of 2.3); Sprint 4 is proof/agent-parity/reorder. This is a genuine gap, not deferred scope, so it's added here as its own story rather than assumed to land later.
**Acceptance (draft, to be refined at build time):**
- A section on the listing edit flow (`/shop/manage` or `/sell/edit/[id]`) where a seller with no existing dimensions can add up to 3 (title + values), see the generated combo grid, and enter a price per combination (calls `option_dimensions`+`variant_prices`) — one bounded action, matching the mutual-exclusivity guard `applyOptionDimensions()` already enforces (no combining with `price_cents`/`quantity`/`variant_tiers` in the same request).
- Once dimensions exist, a per-variant tier editor (min/max quantity + price rows) that calls `variant_tiers` with `variant_id`, surfacing the exact es-MX validation message on overlap/gap.
- A clear, honest state for "this product already has real dimensions — editing them isn't supported yet" (matches `applyOptionDimensions()`'s current 422 for that case) and for "this listing has order history — can't convert" (matches the new refusal message).
- Reads the same `GET /store/listings/:id/price-grid` route the PDP already uses, so the editor and the buyer-facing display are provably showing the same data.
**Risk:** HIGH (writes to the same commerce-core paths as 2.1/2.2 — no new backend risk, but a new UI surface touching them)
**Status:** ⬜ not started — next story to pick up for this epic.

## Sprint QA
- **api spec(s):** `e2e/price-grid.spec.ts` (frontend, 14 tests — tier boundaries, gap/overlap-safe sanitisation, no-tier fallback, MXN rounding, qty-stepper re-resolution across a tier boundary, pay-button-equals-summary) + `src/lib/__tests__/price-tiers.unit.spec.ts` (backend, 9 tests — ladder validation)
- **deterministic gate:** green — backend `npx medusa build` + `tsc --noEmit` + `npm run test:unit` (145/145, re-confirmed after every review-fix round); frontend `tsc --noEmit` + `npm run build` (exit 0) + `e2e/price-grid.spec.ts` (14/14, isolated). The full `npm run test:e2e` (1331-1332 passed across several runs this session) hit two categories of pre-existing, diff-unrelated live-prod failures — `embed-shop.spec.ts`/`not-found-shape.spec.ts` (network/bot-protection against `https://miyagisanchez.com`, same pattern Sprint 1's PR noted) and, later, `promoter-applications.spec.ts` (HTTP 429 — this session's own repeated full-suite runs against production rate-limited an unrelated endpoint; confirmed by re-running that spec alone and seeing 429s directly).
- **cross-agent review (Antigravity/Gemini 3.1 Pro, 8 rounds — 5 backend, 3 frontend closing):** run via `scripts/cross-review.mjs --agent antigravity` per PR, iterated until findings converged to false-positives/already-accepted deferrals. Caught and fixed, most severe first:
  - **Backend would crash on every `option_dimensions` call** — Medusa requires every new variant's options map to cover the product's full CURRENT option set (verified against `@medusajs/product`'s `assignOptionsToVariants`); the original create-before-delete sequencing violated this on every invocation. Forced the order-safety redesign noted in Story 2.1 above.
  - **Checkout quantity was silently clamped to 1 for every configurator purchase** (an unrelated event-ticket cap system's `enabled:false→cap:1` behavior swallowed `?qty=`), defeating the entire bulk-tier feature — found while investigating a different, unrelated finding.
  - **A crafted URL could pair an accepted offer's cheap negotiated price with an attacker-chosen expensive `variantId`** at checkout; fixed by forcing `variantId` to `undefined` on any offer checkout.
  - **A legacy accepted offer on a since-converted multi-variant listing would become invisible/unpayable** (and `startCheckout()` would throw outright) — the scope decision "offers don't apply to configurator listings" was only half-implemented; fixed by reordering the buy-CTA priority, gating `MakeOfferButton` on `!hasConfigurator`, and adding a variant-agnostic exception for offer redemptions in `lib/cart.ts`.
  - A flat `price_cents` update could silently corrupt a variant's quantity-tier ladder (overwriting only the first matching price row); a non-deterministic base-price display bug once a variant carries multiple MXN tier prices (backend + frontend); a mixed-payload API trap (`option_dimensions` + `price_cents`/`quantity`/`variant_tiers` in one request committing then 422ing); disabled-variant price/shipping leakage; a broken price-update fallback silently dropping prices (`updateProductVariants()` has no `prices` field at all); cross-currency shipping-value miscalculation; several `searchParams` array-coercion defensive gaps.
  - Full detail + every dismissed false-positive (with source citations) is in the git history of both PRs' commit messages, one commit per fix round.
  - **Acknowledged, not fixed this sprint:** `applyOptionDimensions()` runs 4 separate Medusa workflows sequentially with no parent-workflow compensation — a mid-flight crash between calls (e.g. after deletes but before creates) would leave a product with 0 variants/options. Real engineering effort to fix properly (composing into one atomic parent workflow); flagged as owed hardening, not attempted given the size of this review pass already.
- **browser smoke owed:** yes, to Daniel — **money path**, see walkthrough below. Configuring the test listing's dimensions/tiers requires a direct API call (no seller UI yet, see Story 2.1's owed note) — steps 1-2 below give the exact request shape.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: the branch's Vercel preview (frontend) + prod backend (no per-branch backend preview, per WAYS-OF-WORKING) — swap in `https://miyagisanchez.com` once merged.

1. **(setup, API — no seller UI yet)** As the miyagiprints seller (Clerk session token), `PATCH /store/sellers/me/products/:id` for an existing single-variant sticker listing with:
   ```json
   {
     "option_dimensions": [{"title": "Tamaño", "values": ["5cm", "7.5cm", "10cm"]}, {"title": "Material", "values": ["vinil", "holográfico"]}],
     "variant_prices": {"Material:vinil|Tamaño:5cm": 1500, "Material:vinil|Tamaño:7.5cm": 2000, "Material:holográfico|Tamaño:7.5cm": 2500, "...": "…all 6 combos"}
   }
   ```
   → 200 OK; the listing now has 6 real Medusa variants (confirm via `GET /store/listings/:id/price-grid` — 6 entries, each with one flat tier).
2. **(setup, API)** `PATCH` again targeting the 7.5cm/vinil `variant_id` with `variant_tiers`: `[{"min_quantity":1,"max_quantity":9,"amount":2000},{"min_quantity":10,"max_quantity":49,"amount":1600},{"min_quantity":50,"max_quantity":null,"amount":1200}]`.
   → 200 OK; re-fetching the price-grid shows 3 tiers on that variant. Submitting an overlapping/gapped ladder returns a 422 with the es-MX message.
3. Open the listing's public PDP. Pick Tamaño=7.5cm, Material=vinil, set quantity to 50.
   → The `ConfiguratorBuyBox` shows unit price dropping to the 50-tier ($12.00); "Comprar ahora — $600.00" (50 × $12).
4. **(money path)** Click "Comprar ahora" → on the checkout page, change nothing (or note the total) → pay with Stripe test card `4242 4242 4242 4242`.
   → Order confirmation total equals exactly what the PDP showed ($600.00) — the checkout page independently re-resolved the same tier server-side.
5. Repeat step 3-4 at quantity 5 (crosses back below the first tier boundary).
   → Unit price shows $20.00 (the 1-9 tier); checkout total = $100.00 — proves the boundary crossing re-resolves correctly both directions.
6. Open an old single-variant listing (any other shop, untouched by this sprint) and buy-flow it to the payment screen.
   → Behaves exactly as before this sprint (regression) — no variant selector, same flat price throughout.

If any step fails, note the step number + what you saw — that's the bug report.
