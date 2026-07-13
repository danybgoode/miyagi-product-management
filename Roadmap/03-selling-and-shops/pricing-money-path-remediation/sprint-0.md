# Pricing & money-path remediation — Sprint 0: resolve the charge-semantics unknown (THE GATE)

**Risk:** HIGH · **Status:** 🟡 in progress · **Blocks:** everything, incl. resuming
`panfleto-premium-shop` Sprint 3.

This sprint is a **spike, not a fix**. It produces certainty and a written verdict. No pricing
code changes here unless the verdict is "confirmed" *and* the follow-on fix sub-story is
separately authorized.

## Story 0.1 — Trace what value actually reaches the payment provider (primary method)

**As** the platform owner, **I want** certainty about whether a Medusa-cart checkout charges the
buyer the amount they saw, **so that** no real buyer is ever over/undercharged when traffic starts.

**What to investigate:**
1. Read Medusa v2.15.3's own payment-session-creation source directly — the pinned
   `@medusajs/medusa` + `@medusajs/core-flows` — cross-checked against the public GitHub tag for
   `2.15.3`. Trace, for a cart with `region_id` set, the exact path from stored `price.amount` →
   cart line-item total (BigNumber) → payment-collection amount → the `getSmallestUnit()`-style
   conversion → the value handed to the Stripe/MercadoPago provider call.
2. Answer one question with a code citation: **does the pipeline treat the stored `amount` (e.g.
   `5000`, written by this app intending "$50.00 cents-style") as major units ($5,000.00) and
   forward a proportionally larger minor-unit value to the provider?**

**Files/anchors:**
- `@medusajs/core-flows` — payment-session / payment-collection steps; the `getSmallestUnit`
  conversion.
- `apps/miyagisanchez/lib/cart.ts` `startCheckout` (`region_id: MXN_REGION_ID`, `:254`) — confirm
  this app sets no independent amount anywhere in the flow.
- `apps/backend/src/api/store/_utils/seller-product-create.ts` / `seller-product-update.ts` — the
  write side (`amount: body.price_cents`).

**Risk tier:** HIGH (read-only investigation, but the verdict authorizes HIGH-risk work).

**Verification:** a written trace citing the specific Medusa source lines that convert cart total
→ provider amount, with a worked example: "a variant stored as `amount: 5000`, region MXN,
quantity 1 → cart total = X → provider receives Y minor units → buyer card authorized for Z." Z
must be compared against the app's displayed price ($50.00). Verdict stated as **confirmed 100x**
or **safe/self-consistent**, not asserted.

## Story 0.2 — Corroborate with a controlled Stripe TEST-MODE probe (secondary, only if source-trace is ambiguous)

**As** the investigator, **I want** an empirical check against Stripe's own dashboard, **so that**
the verdict isn't resting on source-reading alone.

**What to do:** against a **preview/staging** path (never live money), run one real Stripe
**TEST-MODE** checkout of a real CPP/multi-variant product through the Medusa-cart path, then read
the **actual authorized amount** from Stripe's dashboard/API and compare to the displayed price.

**Constraints:** TEST-MODE only. No live keys, no `marketplace_orders` write on prod. Explicit
Daniel sign-off before any staging checkout that creates payment intents.

**Verification:** Stripe test-dashboard shows an authorization whose amount either matches the
displayed price (safe) or is 100x it (confirmed). Screenshot/API-response captured into this doc.

## Story 0.3 (CONDITIONAL) — Scope the fix, don't apply it

Runs **only if 0.1/0.2 confirm the bug**. Do not write code in S0 — produce a scoped, Daniel-signed
sub-story choosing between:
- **(a) Write-path realignment** — stop treating `amount` as cents platform-wide: write true
  major-unit decimals in `seller-product-create.ts`, `seller-product-update.ts`, the CPP
  variant/tier logic, everywhere `price_cents` / `* 100` / `/ 100` appears, **and** audit every
  read path. **Blast radius: every priced item on the platform.** Data migration of existing
  `amount` rows required.
- **(b) Checkout conversion layer** — insert one explicit, well-tested conversion immediately
  before Medusa payment-session creation on the cart path, leaving the app's internal cents
  convention intact.

**Risk tier:** HIGH. **Verification:** a scoping doc + Daniel's explicit authorization; no code
merged in S0.

## Story 0.3-alt (CONDITIONAL) — Document the "safe" verdict and de-escalate

If refuted: write down *why* — the specific source evidence that the charge path is self-consistent
or already converts correctly — de-escalate Finding A from CRITICAL, and record the cents-vs-
major-units semantics as a durable learning so it's never re-litigated from scratch.

## Sprint 0 — findings log
_(filled in as the investigation proceeds)_
