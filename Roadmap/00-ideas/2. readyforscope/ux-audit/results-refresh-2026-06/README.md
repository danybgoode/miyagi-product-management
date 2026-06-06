# UX Audit Refresh — 2026-06 (BUILD-ORDER #3a)

Read-only re-audit of the five structural UX domains, re-run against **current `main`** to
re-scope the highest-value product work (#3b/#5/#6/#3c). This is the **spike deliverable** for
BUILD-ORDER #3a — written findings + a re-scope delta, **no code, no slicing**.

## Pinned to (so deltas are reproducible)
- **Frontend** `apps/miyagisanchez` → **`origin/main` @ `ed447bd`**
- **Backend** `apps/backend` → **`origin/main` @ `0980253`**
- Date: **2026-06-06**

> ⚠️ **Audit-environment note (worth recording).** When this spike ran, the local working tree
> was on stale feature branches — `apps/miyagisanchez` on `chore/clerk-testing-authed-smokes`
> (**48 commits behind `main`**), `apps/backend` on `feat/sweepstakes-draw-job`. The post-audit
> surfaces (support widget, subdomains, short-links, custom-domain checkout) were **not present
> on the checked-out branch**, only on `origin/main`. All findings below were therefore re-read
> from `origin/main` via `git show`, **not** from the working tree. *Lesson for the next spike:
> pin to `origin/main` explicitly and read with `git show origin/main:<path>` — don't trust the
> checked-out branch.*

## Files
- `00-rescope-delta.md` — **the cross-cutting re-scope** (what changes for #3b/#5/#6/#3c + go-forward). **Start here.**
- `01-discovery-and-shopping.md` — light pass
- `02-checkout-and-payments.md` — **deep** (drives #3b)
- `03-selling-and-shops.md` — **deep** (drives #3b)
- `04-shipping-and-delivery.md` — light pass
- `05-trust-offers-messaging.md` — **deep** (drives #5/#3c)

The v1 baseline (`../results/01–05`) is kept intact for diffing. Each refreshed doc opens with a
**reproduction-status table** (fixed / changed / still-live, current anchor) per the #3a acceptance.

## Headline
**All three #3b money-path P0s reproduce on current `main`**: durable `buyer_reported_paid` is
still absent (report-payment is a Telegram-only nudge), shipping is still not gated on payment
(frontend + both backend ship routes), and the coupon-vs-CTA total mismatch is still live. No
**new** P0 jumped the queue — the post-audit surfaces (support widget, custom-domain checkout)
are protected-rail-only and don't add manual-payment risk. #3b's scope as named in BUILD-ORDER
holds, with two reuse hooks discovered (a `paymentSettled` predicate already computed; the print
flow already persists a `payment_reported` flag).
