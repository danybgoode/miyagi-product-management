# Retrospective — Events: quantity selector (buy N admissions in one order)

**Shipped 2026-06-22 · 1 sprint · HIGH risk (money + fulfillment + checkout) · Daniel-authorized merge.**
BE [#33](https://github.com/danybgoode/medusa-bonsai-backend/pull/33) `27aa7a5` ·
FE [#100](https://github.com/danybgoode/miyagisanchezcommerce/pull/100) `d687c87` ·
docs root [#27](https://github.com/danybgoode/miyagi-product-management/pull/27).

## What shipped
A buyer can pick a quantity on a paid event PDP (capped by remaining aforo, behind a kill-switch) and buy N
admissions in one checkout; the backend now mints **one scannable token per unit** (was one per line-item). The
buyer N-QR display, the roster, the per-token door scan, and aforo (Medusa `manage_inventory`) were already
N-ready — confirmed by trace, so the only real backend change was the issuance loop. Agents get **surface
parity** over UCP (the checkout-session accepts/clamps/echoes `quantity` + `line_total`).

## What went well
- **Validate-first re-scoped S1.3 before a line of code.** Tracing the *actual* purchase paths showed the web
  buyer is Medusa-cart-backed (so the webhook's Medusa branch issues tickets), but the **agent** path
  (`UCP create_checkout` → `/api/stripe/checkout` | `/api/mp/checkout`) builds a *raw* Stripe/MP session with **no
  Medusa cart**, hitting the webhook's legacy branch — so agents issue **0 tickets even at qty 1**. "Make agents
  buy N tickets" sat on a foundation that didn't exist. Surfaced to Daniel → S1.3 became surface-parity-only with
  issuance deferred, instead of silently building on sand.
- **The only real backend change was the issuance loop**, exactly as the scope predicted. The pure
  `reconcileOrderTickets` seam made the idempotency provable with a `node:test`/jest unit spec (1→1, 3→3,
  replay→3-no-dupes, redeemed-survives, legacy→1) — no DB needed in the gate.
- **Kill-switch made a HIGH money path safe to merge dark.** `events.quantity_enabled` (enablement, default OFF
  ⇒ cap 1 = today's behavior) let both PRs merge + deploy with zero live behavior change; Daniel flips it on only
  after the owed money/door smoke. Backend-first + flag-off made the ~12-min Cloud Run window a non-event.
- **Cross-agent review earned its keep on the FE PR.** Codex (advisory, single-pass on the green PR) caught two
  genuine money-path issues the author's context-bias hid — both fixed before merge (see below).

## What we learned / would do again
- **Per-unit idempotency keys on the per-unit subject, never the line_item_id.** All N units of a line item
  share one `line_item_id`, so the old `line_item_id || token` dedupe collapsed N→1 on replay. The fix keys on
  `${line_item_id}#${k}`. `issue` is re-called by the reconcile cron **and** both payment webhooks, so "exactly N
  on replay" is the whole game. Unit 0 reuses the line-item stamp token (quantity-1 unchanged); a legacy pre-`#k`
  ticket is adopted, not re-minted (safe for a late webhook replay on a pre-deploy order).
- **A new buy-N feature must be SCOPED to the listing type it's for** — or it leaks into every commerce path.
  Cross-review caught that with the flag ON a crafted `?qty=N` / `quantity:N` would buy N of *any* listing. Fix:
  gate the clamp on `readEventDetails(listing)` at both entry points (the `/checkout` page + the UCP route) so a
  non-event always checks out a single unit. The PDP was already scoped (the stepper only renders for events);
  the *enforcement* belongs at the server clamp seams, not just the UI.
- **Guard the untracked-inventory edge in any quantity cap.** `available == null` returning
  `Number.MAX_SAFE_INTEGER` invited money-math overflow / absurd quantities; a `MAX_TICKETS_PER_ORDER` ceiling
  guards the untracked edge while a tracked event's real aforo stays uncapped (a per-order cap below aforo is the
  deferred item).
- **Don't ship a no-op that implies functionality.** The UCP checkout_urls briefly carried `?quantity=N` for
  "forward-compat" — but those endpoints build a raw 1-unit session and ignore it, so it would mislead an agent.
  Removed it; the deferral is stated on the response type instead.

## Gaps / owed
- **Owed to Daniel (money/auth/door — can't be headless-smoked):** flip `events.quantity_enabled` ON, then the
  buy-N → N-QR → scan-each-once → roster-N → aforo-minus-N walkthrough (`sprint-1.md`). Plus the
  `MS_TEST_EVENT_LISTING_ID` repo secret to light up `ucp-checkout-quantity.spec.ts`.
- **Deferred follow-up — agent-side ticket ISSUANCE.** Re-route `UCP create_checkout` through the Medusa cart
  (`lib/cart.ts startCheckout`, the path the web buyer uses) so the webhook's Medusa branch runs
  `issuePaidTicketsForOrder` for agent purchases. HIGH-risk money path → its own sprint/epic. Captured in
  `sprint-1.md` Follow-ups.
- **Still out (per scope):** per-guest attendee names, multi-price tiers/variants, assigned seating,
  resale/transfer, per-order cap below aforo.
