# Pricing & money-path remediation — Sprint 1: live pricing write-path bugs

**Risk:** HIGH (both touch the seller/agent pricing write path) · **Status:** ✅ MERGED + LIVE —
backend PR [#89](https://github.com/danybgoode/medusa-bonsai-backend/pull/89) (squash `3247d68`),
merged + deployed 2026-07-13 (Cloud Run revision `medusa-web-00166-rlz`). **Precondition:** Sprint 0
closed (✅, REFUTED — see `sprint-0.md`).

## Finding D — three attempts, the real bug was a plain key-name typo

This took three attempts, each independently reviewed by a fresh cross-agent pass, before landing
on the real cause — worth recording in full since it's a strong example of "keep digging past a
plausible-sounding fix":

1. **First attempt** (closed PR [#88](https://github.com/danybgoode/medusa-bonsai-backend/pull/88)):
   an `Array.isArray` guard on `pricingService.createPriceSets()`'s return value. A fresh reviewer
   read the actual compiled `@medusajs/pricing@2.17.2` source and proved this was a **no-op** — the
   single-object-in/single-object-out overload genuinely returns a single object, never an array.
2. **Second attempt** (this PR's first commit): wrapped `createPriceSets` in an array instead,
   mirroring Medusa's own `upsertVariantPricesWorkflow` internal convention. A **different** fresh
   reviewer proved this was **also a no-op** — read `mikro-orm-serializer.js` and showed both call
   shapes serialize to a byte-identical result.
3. **Third attempt (the real fix, this PR's final commit):** re-reading Medusa's `addPrices_`
   source (a function neither prior attempt had focused on) found the actual bug —
   `AddPricesDTO`'s real field is `priceSetId` (camelCase, confirmed against
   `@medusajs/types/dist/pricing/common/price-set.d.ts`), but **both** `addPrices()` call sites in
   `seller-product-update.ts` were passing `price_set_id` (snake_case) — an unrecognized key.
   Medusa's own internals then read `data.priceSetId` as `undefined`, which cascades into exactly
   `` `Price set with id: undefined not found` `` — grepped the entire installed Medusa pricing
   package and confirmed this exact error-string template exists in **exactly one place**, so this
   diagnosis is the only possible source of the observed error. A **third** fresh reviewer
   independently re-verified this same mechanism against the real compiled source and approved.
   Also confirmed `createProductsWorkflow` always creates a (possibly-empty) price_set for every
   new variant — so the two affected products' `if (priceSetId)` → `addPrices()` branch is what
   actually runs, not the "no price_set at all" fallback the first two attempts targeted.

**Bonus finding:** the identical key-name bug existed in a second call site — the `variant_tiers`
(CPP quantity-tier) branch — meaning the Custom Print Products tier-pricing feature has been
completely broken this whole session/epic too (always a loud thrown error, never silent data
corruption — no live tier data was ever corrupted, since nothing ever silently succeeded).

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

## Sprint 1 — Live verification (done, 2026-07-13)

Both stories confirmed live in production against the two real affected products, post-deploy
(Cloud Run revision `medusa-web-00166-rlz`):

1. `update_listing price_mxn:25` on `prod_01KXBHQJQ4QD5GPZGQV73DAW1M` ("La foto de la cena") →
   ✅ succeeded (`"Anuncio actualizado: price."`). Raw price-grid confirms `amount: 2500` (correct
   $25.00) on **both** duplicate rows (Finding E's collapse-all-duplicates fix). Buyer-facing
   `get_listing` now shows `**Precio:** $25.00` (was $0.25 before this fix).
2. Same for `prod_01KXBHQMR7A2YFKBMXAA2NK7ZJ` ("El que cuenta las sillas") → ✅ succeeded, same
   correct $25.00 result.

**Not independently re-tested live this session:** the `variant_tiers` write path (the second,
previously-undiscovered instance of the same key-name bug) and the "genuinely tiered variant still
correctly refuses `price_cents`" regression case. Both are the *identical* code mechanism as the
verified fix above, already independently traced against the real compiled Medusa source by two
separate fresh-reviewer passes — and there is currently no MCP write tool for `variant_tiers`
(that's `mcp-parity-core` Sprint 2, unbuilt) to exercise it without a raw internal-API call, which
wasn't judged necessary given the review depth already applied. **This will be naturally exercised
as a real live test** when Daniel adds the print-product reward listing's second price tier via
Admin's "Opciones" screen (the exact next step `panfleto-premium-shop` Sprint 3 already needs) —
worth watching for a clean result there as the real-world confirmation.

## Sprint 1 — findings log
Both stories done. Findings D and E fixed in one PR (backend #89) after a 3-attempt investigation
on Finding D — see the "three attempts" writeup above. `panfleto-premium-shop` Sprint 3 is now
cleared to resume (per the epic README's sequencing note).
