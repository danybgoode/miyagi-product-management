# Sprint 2 — Intelligence: fee estimator, solve-for-price suggester, one-click apply, insights

> Epic: [profit-analyzer](README.md) · Risk: **HIGH** (US-5 live price writes; Daniel merges) ·
> Apply-price respects the existing `ml.publish_enabled` rail.

## Stories

### US-4 · Fee estimator + suggester math — med
**As a** seller, **I want** a recommended price for a target margin that accounts for ML's fee on that
very price, **so that** the suggestion is actually achievable.
`listing_prices` call on the ML client (+ cache; per site/category/listing-type); pure `lib/profit.ts`
seam: `price = (COGS + shipping + fixed_fee) / (1 − fee% − target_margin%)` — the PRD's additive formula
was corrected at groom. Degenerate inputs (fee% + margin% ≥ 1) surface a clear "no achievable price" state.
**Acceptance:** unit specs pin the math incl. edge cases; the estimator returns ML's own fee for a known
category/price within cache TTL; offline/ML-error degrades to estimate-marked output, never a crash.

### US-5 · Target-margin control + one-click Apply — high
**As a** seller, **I want** to set my target margin, see the suggested price, and apply it with one
confirmed click — updating Miyagi and my linked ML listing, **so that** repricing takes seconds.
Confirm dialog (never automatic); writes via the existing publish/update parity; every apply lands in the
activity log; ML API rejections (e.g. active promotion) surface honestly.
**Acceptance:** move the control to 30% → suggestion updates live; Apply → Miyagi PDP shows the new price
and the ML listing follows; the activity log records who/what/when; a forced ML error shows in the log, and
the Miyagi price change either completes or reports — no silent half-state.

### US-6 · Margin insights — low
**As a** seller, **I want** my "margin killers" and underpriced high-margin SKUs flagged, **so that** I
know where to act first.
Threshold classifiers over the ledger (pure fns); rendered on the dashboard with links to the suggester.
**Acceptance:** a SKU whose fee+shipping eats its margin appears under margin killers; a high-margin,
low-priced SKU appears as underpriced; thresholds unit-tested.

## Sprint QA

- Api specs: solve-for-price + degenerate cases (US-4), apply-decision fn + activity-log shape (US-5),
  classifier thresholds (US-6).
- **Owed to Daniel:** the live apply-price money path (Miyagi + ML both change), and the flag-flip decision
  for `ops.profit_enabled`.

## Sprint 2 — Smoke walkthrough (do these in order)

_Placeholder — written by the building agent before sprint close (real URLs; money/auth steps flagged
**owed to Daniel**)._
