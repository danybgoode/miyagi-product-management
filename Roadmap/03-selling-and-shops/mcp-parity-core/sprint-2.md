# MCP parity core — Sprint 2: CPP "Opciones" / price_grid configurator

**Status:** ⬜ not started · **Blocked by Sprint 1** (no hard dependency, but ships after per the
epic's risk-ordered sequencing). The highest-complexity, highest-risk story in the whole epic —
it gets its own sprint precisely so it never gets compressed into a one-line "just add a tool."

> This is a **real** product/price mutation (`PATCH /store/sellers/me/products/:id` in
> `apps/backend`), not a frontend helper. It's the only story in this epic that touches the
> backend repo. The backend/shared-helper piece merges and finishes deploying (~12 min, no
> preview) before the dependent frontend tool ships.

## Story

### Story 2.1 — `configure_listing_options` over MCP
**As a** shop agent, **I want** to add dimensioned options and per-combo prices (and quantity
tiers) to a listing, **so that** I can build a CPP-configurable product (e.g. a launchpad reward)
without the portal's "Opciones" screen.
**Acceptance:** the tool wraps the write path `PUT /api/sell/listing/[id]`
(`app/api/sell/listing/[id]/route.ts:29-286` — **not** the GET-only price-grid route), carrying
`option_dimensions`, `variant_prices` (comboKey via `buildVariantComboKey`, sorted
`"Title:Value|Title:Value"`), `variant_id?`, `variant_tiers`, `unit_cost_cents`/`ml_price_cents`.
Ownership verified via `shopOwnsProduct` before the call. Each of these distinct backend failure
modes is surfaced to the agent as its own legible `isError` — never a generic 500:
- `option_dimensions` combined with flat price/quantity fields in the same request → 422.
- Illegal variant restructure: the product already has real options, or the sole variant has
  order history (no in-place restructure — full delete+recreate only,
  `apps/backend/src/api/store/_utils/seller-product-create.ts:273-282`) → rejected with the reason.
- More than 3 dimensions, a title/value over 40 chars or non-unique, or more than 60 total combos
  (`MAX_OPTION_DIMENSIONS`/`MAX_VARIANT_COMBOS`) → 422; any combo missing a price → 422.
- `variant_tiers` failing `validateTierLadder` (`apps/backend/src/lib/price-tiers.ts:24` —
  positive-integer `min_quantity`, `amount>0`, gapless/non-overlapping ladder covering `[1,∞)`)
  → the specific ladder error, not a generic one.
- A multi-variant product missing an explicit `variant_id` → the "targeting required" error.
**Reuses (verbatim — no new pricing logic in this story):** `PUT /api/sell/listing/[id]` →
backend `PATCH /store/sellers/me/products/:id`; validation in
`apps/backend/src/api/store/_utils/seller-product-{update,create}.ts`; `validateTierLadder`
(`apps/backend/src/lib/price-tiers.ts`); `buildVariantComboKey`; `shopOwnsProduct`.
**Risk:** HIGH. **Kill-switch:** `mcp.configure_options.enabled`, default OFF, decided at
grooming, flipped only after the Daniel smoke below passes.

## Sprint QA
- **api spec:** one spec covering the happy path (single-dimension + tiered) and every named
  failure mode above as a distinct assertion — not a single "it works" test.
- **deterministic gate:** backend `medusa build` → `tsc --noEmit` → `npm run test:unit`; frontend
  `tsc --noEmit` → `npm run build` → Playwright `api` — both green before merge.
- **browser smoke owed:** **yes, to Daniel** — build a real CPP product via this MCP tool (e.g.
  the panfleto reward listing, if not already configured through the portal by then), confirm the
  resulting price grid + tier ladder render correctly on the PDP and price correctly at checkout.

## Sprint 2 — Smoke walkthrough (do these in order, once the flag is flipped ON in a test shop)
Env: production (or the branch's Vercel preview pre-merge, flag forced on for the test shop only)

1. Using a shop's MCP agent token, call `configure_listing_options` on a single-variant listing
   with one dimension (e.g. "Tamaño": ["Chico","Grande"]) and a price for each combo.
   → Tool returns success; `get_listing`/the portal both show 2 real variants with the right prices.
2. Call it again on the same listing with `variant_tiers` for one variant (e.g. 1-2 units at $X,
   3+ at $Y).
   → PDP "Opciones" reflects the qty-break pricing; adding 3 to cart charges the tier-3 rate.
3. Attempt an illegal call: combine `option_dimensions` with a flat `price_cents` in one request.
   → Tool returns `isError:true` with the specific "cannot combine" message, nothing changes.
4. Attempt to restructure a variant that already has real order history.
   → Tool returns `isError:true` naming the order-history guard, nothing changes.

If any step fails, note the step number + what you saw — that's the bug report.
