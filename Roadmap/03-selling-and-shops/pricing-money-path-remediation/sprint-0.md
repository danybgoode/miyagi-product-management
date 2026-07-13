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

## Sprint 0 — VERDICT: REFUTED. Real checkout charges have always been safe.

**Story 0.1 complete, 2026-07-13. Story 0.2 (Stripe test-mode probe) not needed — the source trace
is conclusive and complete end-to-end, with no ambiguity left to corroborate empirically.**

### The trace (every hop, with citations)

Two checkout shapes exist in this app, and this investigation traced **both** end-to-end:

**Shape 1 — flat/simple listings (no `variant_id`), e.g. Stickers, a plain digital story.**
`app/api/stripe/checkout/route.ts:32,41,57,85` reads `price_cents` **directly from this app's own
Supabase `marketplace_listings` mirror table** and passes `unit_amount: priceCents` straight to
Stripe. **Never touches Medusa's `amount` field at all.** Self-consistent by construction — the
buyer is charged exactly the cents value this app itself tracks and displays. **CONFIRMED SAFE.**

**Shape 2 — multi-variant/CPP/quantity-tier listings (`variant_id` present), the shape this
sprint's own print-product reward uses.** MCP `create_checkout`'s handler
(`app/api/ucp/mcp/route.ts:928-930`) and the site's own primary "Comprar ahora" buttons
(`BuyButton.tsx`/`CheckoutPayButton.tsx`, fixed in PR #244) both route through
`lib/cart.ts`'s `startCheckout` → a real Medusa cart → the backend's
`src/api/store/carts/[id]/start-checkout/route.ts`. Traced this full chain:

1. **Write side** (`apps/backend/src/api/store/_utils/seller-product-create.ts`,
   `seller-product-update.ts`): writes `amount: body.price_cents` — e.g. `5000` for an intended
   "$50.00 MXN". Medusa v2's own documented semantics treat `amount` as **major units** (confirmed
   via Medusa's official docs: "$20.00 is stored as 20" —
   https://docs.medusajs.com/resources/commerce-modules/pricing/concepts), so Medusa itself
   "believes" this variant costs $5,000.00 MXN. This mismatch is real, but only matters if
   something *converts units* downstream — traced whether anything does.
2. **Medusa's cart/payment-session pipeline** (`@medusajs/core-flows@2.15.3`,
   `cart/workflows/create-payment-collection-for-cart.js`: `amount: cart.raw_total` →
   `@medusajs/payment@2.15.3`, `services/payment-module.js:147-190` `createPaymentSession`:
   `amount: input.amount` passed straight to `paymentProviderService_.createSession` →
   `services/payment-provider.js:43-46`: `provider.initiatePayment(sessionInput)`) — **the raw
   numeric value flows completely unconverted through every hop.** The only place Medusa's core
   applies its documented `getSmallestUnit()` major→minor-unit conversion is inside Medusa's own
   built-in **"Medusa Payment" test provider**
   (`@medusajs/payment@2.15.3`, `providers/payment-medusa/services/medusa-payments.js:158,229,247`)
   — **which this marketplace does not use.**
3. **This marketplace's own payment provider** (`apps/backend/src/modules/payment-stripe-connect/service.ts`)
   is a custom Stripe Connect module. Its `initiatePayment` is a documented no-op (`:61-70`, "data
   is already set by start-checkout") — the real Stripe Checkout Session is created earlier, by
   `apps/backend/src/api/store/carts/[id]/start-checkout/route.ts`.
4. **That route is where the real charge amount is decided**, and it reads Medusa's own raw
   computed cart total **and treats it as already being in cents** — its own code comment says so
   explicitly: `"// A plain listCarts may not compute total; fall back to summing line items (same
   unit as cart.total — variant prices are stored as integer cents)."` (`:428-429`). Concretely:
   `rawItemsCents = ... || Math.round(Number(cart.total ?? 0)) || itemsTotalCents` (`:436`) → flows
   through unmodified to `priceCents` → `unit_amount: priceCents` in the real
   `stripeClient.checkout.sessions.create(...)` call (`:743-745`).

### Why this is safe despite the semantic mismatch

Medusa's own pricing/cart engine performs **pure pass-through arithmetic** on the raw `amount`
value in this pipeline — it never itself rescales/converts units anywhere between write and this
app's own `start-checkout` route (that conversion only exists in Medusa's unused built-in
provider). So the number `5000`, written by this app's own code intending "5000 cents = $50.00",
survives completely unconverted through Medusa's cart/pricing internals and arrives back at this
app's own `start-checkout` route as `5000` — which that route (per its own explicit, if
semantically-imprecise, comment) treats as cents and sends to Stripe as `unit_amount: 5000` = Stripe
correctly charges **$50.00 MXN** — the intended, displayed amount. **Two internally-mismatched
semantic labels (this app calls it "cents", Medusa calls it "major units") cancel out into a
correct real-world charge, because nothing in the actually-used pipeline ever converts between
them.** The write side and the one place that reads it back out for a real charge are both,
independently, self-consistent with each other — the "major units" label Medusa itself would apply
is never actually exercised by any conversion logic in this pipeline.

### Verdict

**REFUTED — not a bug. Every real checkout path this marketplace actually uses (flat-price and
Medusa-cart alike) charges buyers exactly what's displayed.** No fix needed for Finding A itself.
Skipping Story 0.2 (Stripe test-mode probe) — the source trace leaves no ambiguity to corroborate;
one is available on request if Daniel wants an empirical belt-and-suspenders check regardless.

### The one real, narrower, already-scoped residual risk

This trace also explains *precisely* why the Admin-set price on the two panfleto digital listings
broke: Medusa **Admin** is Medusa's own official tool and correctly implements Medusa's real
major-unit semantics — when Daniel typed "25" intending $25.00, Admin stored the true major-unit
value `amount: 25`. That number is **not** what this app's write path would have produced (`2500`)
for the same intended price — so for those two specific listings, the two ends of the pipeline are
now **genuinely mismatched** (Admin wrote true-major-units; this app's `start-checkout` route still
reads it as cents). If either of those two listings were ever checked out today, the charge would
be **$0.25**, not $25 — an undercharge, matching the already-observed display bug, not a new
finding. This is exactly what **Findings D/E (Sprint 1)** already exist to fix — no new scope
needed here, just confirming the connection.

### Durable learning to promote to `Roadmap/LEARNINGS.md` at epic close
Medusa v2's Pricing module stores `amount` in **major currency units** (decimal), not minor-unit
cents like Medusa v1 — but this app's entire custom write/read path (`price_cents` naming,
×100/÷100 everywhere) assumes cents. This is **safe for every checkout path this app actually
uses** (verified end-to-end, both shapes) because nothing in either real pipeline ever applies
Medusa's own major→minor conversion — but it is a **real, live footgun for any data written
through Medusa Admin directly**, which correctly uses Medusa's real semantics and will silently
desync from this app's assumption. Any future direct-Admin price edit reproduces the exact
Finding D/E bug pattern. Long-term, worth deciding once (not per-incident) whether to (a) never
allow direct Admin price edits on this platform (process-only fix, document it), or (b) do the
larger `price_cents`→true-major-units realignment scoped as Sprint 0 Story 0.3(a) — deferred, not
urgent, since option (a) fully closes the loop for zero code risk.
