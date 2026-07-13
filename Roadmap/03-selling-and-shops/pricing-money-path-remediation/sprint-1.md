# Pricing & money-path remediation — Sprint 1: live pricing write-path bugs

**Risk:** HIGH (both touch the seller/agent pricing write path) · **Status:** ⬜ not started ·
**Precondition:** Sprint 0 closed.

## Story 1.1 — Finding D: set a price on a variant that has never had one

**As** a seller/agent, **I want** `update_listing` with `price_mxn` to succeed on a brand-new
zero-price listing, **so that** I'm not forced into Admin for the first price.

**Bug:** the "variant has no `price_set` at all" fallback in `seller-product-update.ts` (the
`else` branch around lines 558–579) throws `"Price set with id: undefined not found"`. It
hand-rolls `pricingService.createPriceSets(...)` then `remoteLink.create(...)`. Two prior
root-cause theories were ruled out this session (closed PR
[#88](https://github.com/danybgoode/medusa-bonsai-backend/pull/88) on the backend repo has the
full trail). **Confirmed the underlying Medusa data is healthy** — Admin's own editor sets a price
on the exact same variant cleanly — so the bug is specific to this hand-rolled two-step
orchestration, not Medusa core or corrupt data. Narrow blast radius (only variants that never had
*any* price; the common update-existing-price path is unaffected and known-working).

**What to investigate/fix:**
- Read Medusa v2.15.3's officially-supported "add a price to a fresh variant" path —
  `createVariantPricingLinkStep` (`@medusajs/core-flows`, already referenced in the code comment)
  and the pricing workflow that wraps it — and mirror that exact sequence, or better, call the
  supported workflow/step directly instead of re-implementing `createPriceSets` + `remoteLink.create`
  by hand.
- Confirm whether `createPriceSets` returns the shape the code assumes (`newPriceSet.id`) — the
  `undefined` in the error text points at the returned id not being where the code reads it.
- Alternative diagnostic (needs explicit sign-off — it's a prod-infra action): a `--no-traffic`
  Cloud Run diagnostic revision with logging at the two key points. Prefer the source-mirroring
  route first.

**Files/functions:** `apps/backend/src/api/store/_utils/seller-product-update.ts` (the fallback
branch). Cross-reference `seller-product-create.ts` for the working precedent.

**Risk tier:** HIGH. **Verification:** create a fresh listing whose variant has zero prices; call
`update_listing` / the internal `PATCH /internal/seller-products/[id]` with `price_mxn`; observe
**200 + the price readable via `GET /store/listings/{id}/price-grid`** at the intended amount, and
the buyer-facing display correct. Retire the Admin workaround for this case. `tsc --noEmit` +
backend tests green.

## Story 1.2 — Finding E: two Admin-created MXN rows misread as quantity tiers

**As** a seller/agent, **I want** `update_listing` with `price_cents` to keep working on a
product whose price was last edited in Admin, **so that** filling both of Admin's price columns
doesn't permanently strand the listing on Admin-only edits.

**Bug:** Admin's multi-column editor (MXN currency-level column + Mexico region-level column)
writes **two separate `mxn` price rows** for what's meant as one price. The ambiguity guard in
`seller-product-update.ts` (`mxnPrices.length > 1` → refuse `price_cents`, tell the caller to use
`variant_tiers` instead) now misfires on these "duplicate" rows, treating them as real quantity
tiers. Two products touched this session are stuck this way. The guard itself is *correct* for
genuine tiers (prevents corrupting a real tier ladder, cross-agent review catch 2026-07-05) — the
problem is it can't distinguish "two identical-amount rows from different region scopes" (an
Admin artifact) from "two different-amount rows across quantity bands" (a real ladder).

**What to investigate/fix (two candidate approaches — decide during the story):**
- **(a) Teach the guard to recognize the Admin artifact:** when the multiple `mxn` prices have no
  `min_quantity`/`max_quantity` differentiation — especially two rows of the *same amount*
  differing only by rule scope — treat them as the same price and safely collapse/update rather
  than refusing. Must fetch `min_quantity`/`max_quantity`/`rules` (the current guard only reads
  `id` + `currency_code`), so this needs a wider `graph` field set to tell the two cases apart
  without ever collapsing a genuine ladder.
- **(b) Consolidation cleanup:** a script or documented Admin step to consolidate the duplicate
  rows per-product for the two stuck products, plus guidance to avoid filling both Admin columns.
  Lower code risk, doesn't prevent recurrence.

Recommend (a) as the durable fix with (b) as the immediate unblock for the two stuck products.
**Confirm consistency with the Sprint 0 verdict first** — if Sprint 0 changes how `amount` is
written/read, this field-shape work must match.

**Files/functions:** `seller-product-update.ts` (the `graph` field list, the guard, the update
call). The tier path is the reference for how real ladders carry `min_quantity`/`max_quantity`.

**Risk tier:** HIGH. **Verification:** reproduce by setting a price on a test product via Admin
filling both columns; confirm `update_listing price_cents` currently 422s with the tier message;
apply fix; confirm it now updates the single logical price correctly (price-grid + display),
**while a genuinely tiered variant still correctly refuses `price_cents` and routes to
`variant_tiers`** (regression guard). Unstick the two known products
(`prod_01KXBHQJQ4QD5GPZGQV73DAW1M`, `prod_01KXBHQMR7A2YFKBMXAA2NK7ZJ`). Backend tests green.

## Sprint 1 — findings log
_(filled in as the work proceeds)_
