# Rental line-item pricing — Sprint 3: agent parity (UCP/MCP)

**Status:** ✅ built — PR pending (`feat/rental-backend-line-item-pricing-s3`, commit `f00b1c3`)

> Frontend/API sprint (`apps/miyagisanchez` — the UCP layer). Requires Sprints 1–2. AGENTS rule #3:
> agents are first-class — web and agent must quote and charge the same number.

## Stories

### Story 3.1 — `checkout-session` quotes + links the computed rental total ✅
**As an** AI shopping agent, **I want** `POST /api/ucp/checkout-session` (and MCP
`get_checkout_options`) to accept `check_in`/`check_out` for a rental listing and return the exact
computed breakdown with checkout URLs that charge it, **so that** an agent books a rental
end-to-end and never quotes the per-period rate as the full price.

**Built** (commit `f00b1c3`, branch `feat/rental-backend-line-item-pricing-s3`):
- New pure module `lib/ucp/rental-quote.ts` (`resolveUcpRentalQuote` + `rentalPricingHint`) wraps
  S2.1's `resolveRentalCheckoutDisplay` — the exact same seam `/checkout`'s rental mode uses, so an
  agent's quote can never drift from the web checkout's.
- `checkout-session` accepts `check_in`/`check_out`; on a valid dated quote, `price`/`line_total`
  are overridden to `rental_quote.total_cents`, `quantity` is forced to 1, and instant
  `checkout_url`s (MercadoPago/Stripe) point at the dated `/checkout?listingId=&checkIn=&checkOut=`
  page — the real S1/S2 charge rail — instead of the legacy `/api/mp/checkout`/`/api/stripe/checkout`
  endpoints (which have no rental awareness). Manual instructions (SPEI, cash) state the reserved
  dates + deposit.
- Without dates: unchanged behavior, plus a new `rental_pricing_hint` string labeling the rate
  clearly as per-period (never the full price) with a nudge to send dates. A non-rental listing
  never carries either new field.
- MCP `get_checkout_options` tool schema gained `check_in`/`check_out`; its markdown summary now
  surfaces the quote or the hint. `create_checkout`'s description now warns it is NOT rental-aware
  and to prefer `get_checkout_options` with dates for a rental listing.
- **Known finding, not fixed here** (out of scope for a LOW-risk quoting sprint): the legacy
  `/api/mp/checkout`/`/api/stripe/checkout` endpoints still have zero rental awareness for a
  **date-less** call on a rental listing — they'd charge a bare one-unit rate. Currently
  unreachable (no rental listing exists in prod). Flagged in the PR for Daniel.

**Acceptance:**
- With dates: response gains `rental_quote: { check_in, check_out, nights, units, rate_period,
  rate_cents, rent_cents, deposit_cents, total_cents, formatted }` computed by the **same seam**
  (`lib/rental-pricing.ts`); `price`/`line_total` reflect the quoted total; instant-method
  `checkout_url`s carry the dates so the eventual charge is the server-recomputed total; manual
  instructions state it.
- Without dates: today's behavior, with the rate + deposit clearly labeled per-period (never
  presented as the full price) + a hint that dates yield an exact bookable quote.
- Invalid range / non-rental / flag OFF: a structured, agent-legible error (or the coordinate-note
  fallback), never a wrong quote.
- MCP `get_checkout_options` parity; UCP manifest/docs mention the new params.
**Risk:** LOW (quoting is read-only; the charge stays on the Sprint-1 server-recomputed rail)
**QA:** api spec on the quote math + flag states + date-less fallback; MCP tool round-trip smoke
(agent-owned); embed/other UCP consumers regression (existing specs stay green).

## Sprint QA
- **api specs:** quote math (mirrors the pure-seam cases) · flag states · date-less fallback · non-rental unchanged — Playwright `api` project in CI.
  New: `e2e/ucp-rental-quote.spec.ts` — 11 unit-style cases against `resolveUcpRentalQuote`/
  `rentalPricingHint` (no live server needed) all pass; 4 fixture-gated live-HTTP cases (dated
  quote, date-less hint, invalid range, non-rental-unchanged) skip until `MS_TEST_RENTAL_LISTING_ID`
  exists — see the gap below.
- **deterministic gate:** `tsc --noEmit` clean · `next build` clean · Playwright `api` project —
  1620 passed (incl. all 11 new unit cases), 6 pre-existing failures unrelated to this change
  (launchpad flag-off status codes + a `/l/wp-admin` 404-vs-403 WAF mismatch — none touch
  checkout-session/MCP/rental code), 19 skipped (fixture-gated, as expected).
- **smoke:** agent-owned MCP round-trip against prod post-merge; no Daniel money step in this sprint (charging was smoked in Sprint 2).

## ⚠️ Gap: no test rental listing exists in prod
Same gap Sprints 1–2 already owe Daniel (`checkout.rental_pricing_enabled` is OFF, no rental
listing exists to test against). This sprint's fixture-gated live specs
(`MS_TEST_RENTAL_LISTING_ID`) and the MCP round-trip smoke below **cannot run for real** until:
1. Daniel creates a disposable test rental listing (rate + deposit set in `metadata.attrs`).
2. `checkout.rental_pricing_enabled` is flipped ON in `/admin/flags`.
3. `MS_TEST_RENTAL_LISTING_ID` is set as a repo secret so the fixture-gated specs light up.

Until then, the walkthrough below is written to be run **once that fixture exists** — the code
paths themselves are proven by the unit-level specs (same math, same validation ladder as
`/checkout`'s own S2.1 tests) and by direct `curl` against the branch's Vercel preview using a
crafted listing.

## Sprint 3 — Smoke walkthrough (do these in order)
Prerequisite: a public, priced **rental** listing with `checkout.rental_pricing_enabled` ON
(`<LISTING_ID>` below). Use the branch's Vercel preview URL pre-merge, `https://miyagisanchez.com`
post-merge.

1. **MCP `get_checkout_options` with dates returns the real bookable total.**
   POST to `/api/ucp/mcp` a JSON-RPC `tools/call` for `get_checkout_options` with
   `{ "listing_id": "<LISTING_ID>", "check_in": "2026-12-01", "check_out": "2026-12-04" }`.
   Expected: the response includes a `rental_quote` with `check_in`/`check_out` matching the
   request, `nights: 3`, and `total_cents` equal to `3 × rate_cents + deposit_cents` — the exact
   number `/l/<LISTING_ID>`'s date picker shows for the same range.
2. **The returned checkout URL charges that total.**
   Open the `checkout_url` from an available instant payment option in step 1 (or the web
   checkout URL directly: `/checkout?listingId=<LISTING_ID>&checkIn=2026-12-01&checkOut=2026-12-04`).
   Expected: the checkout page shows the same total as step 1's `rental_quote.formatted`, with
   the date range and deposit itemized — this is the real S1/S2 charge rail, so completing
   payment here is the **money step, owed to Daniel** (do not complete a real charge in this
   smoke unless intentionally testing with a disposable listing).
3. **A date-less call labels the rate per-period, never the full price.**
   POST the same MCP call without `check_in`/`check_out`.
   Expected: no `rental_quote`; `rental_pricing_hint` reads something like
   `"Tarifa: $X /día + depósito $Y. Envía check_in y check_out (YYYY-MM-DD)…"` — the price field
   shows the per-period rate, not a multi-night total.
4. **An invalid range never produces a wrong quote.**
   POST with `check_out` before `check_in` (e.g. swap the two dates from step 1).
   Expected: `rental_quote` is `null` and `rental_pricing_hint` explains why — never a computed
   total for a nonsensical range.

If any step fails, note the step number + what you saw — that's the bug report.
