# US marketplace — Sprint 6: A US carrier

**Status:** ⬜ not started

## Outcome

US checkout quotes live shipping rates and US sellers buy real labels with tracking, through one carrier
aggregator behind Medusa's fulfillment-provider interface — the same shape the Envía provider already
uses for Mexico. This is last because it is the only piece with an external dependency: an account, a
provider choice and a funding decision. `/us` is a complete marketplace without it; this makes shipping
as good as Mexico's.

## Build contract — **BLOCKED at external evidence gate**

Implement D18 only after Daniel supplies the missing provider inputs. Neither EasyPost nor Shippo is
supported by `projects.dev` or present in either app; no account, origin ZIP, parcel or funding model is
available. Envía cannot be copied as proof: its Medusa adapter has no calculated price, real cancel,
return, preview or idempotent confirm, and the current spend route buys before durable audit state.

Before a builder starts, replace this paragraph with: the one selected provider (delete the other from
scope), account custody/funding, real origin + representative destination/parcel, recorded sandbox quote,
preview/purchase/idempotency/reconcile/void/refund/tracking/cost evidence, webhook verification, and the
exact Medusa adapter. The implementation is an injected provider client under a generic carrier contract;
quote is read-only; preview never spends; confirm claims a durable unique operation and audit entry before
provider I/O; ambiguous results reconcile by reference; UI and agent tools call the same command; outage or
unfunded state returns structured fallback to S4. Permit a small carrier-operation migration if native
Medusa primitives cannot prove durable uniqueness.

## Stories

### Story 6.1 — Integrate one US carrier for live rates and labels

**As a** US seller, **I want** real shipping rates at checkout and a printable label **so that** I can
fulfill an order without leaving Miyagi.

**Acceptance:** One provider is selected on recorded sandbox evidence and implemented against Medusa's
fulfillment-provider seam, mirroring the Envía provider's structure. **Quote is read-only.** Label
purchase, void and refund each require a preview, an explicit confirm, an idempotency key and an audit
entry — an agent surface uses the identical authorization and confirmation rules as the UI, so no agent
can spend money the UI would have asked about. Tracking flows to the buyer's order page, email and chat
ledger. The purchased-label cost lands in the profit ledger as an actual cost, in USD. If the provider
is unreachable or the account is unfunded, checkout falls back to arranged delivery and manual carrier —
the Sprint 4 path — rather than dead-ending, and the seller sees an honest reason.

Mexico's Envía path, its comp-grant behaviour and the Correos manual class are untouched.

**Risk:** high

## Sprint QA

- **api spec(s):** rate-quote contract with injected provider I/O; a spec proving quote performs no
  mutation; label purchase idempotency and double-submit; void/refund; the unreachable-provider fallback;
  an agent-parity authorization matrix.
- **browser smoke owed:** **yes, to Daniel by name** — buying one real label costs real money and the
  provider account must be funded first.
- **deterministic gate:** `tsc --noEmit` + lint + `npm run build` + Playwright `api` green before merge.
- **regression:** Envía quote/label/tracking specs, the comp-grant path, Correos rate bands, and the
  arranged/manual US path from Sprint 4.
- **review:** **HIGH — one cross-family pass**, routed by
  `node scripts/review-route.mjs --builder <who> --tier high <PR#>`. Resolve or answer every finding.

## Sprint 6 — Smoke walkthrough (do these in order)

Env: provider sandbox for steps 1–4, production for step 5 · https://miyagisanchez.com

1. Add a physical US listing with real weight and dimensions, then start checkout with a US address.
   → Live rates appear with carrier names and delivery estimates, priced from the real parcel.
2. Complete the order, then as the seller open it and preview a label.
   → A preview with the exact cost, requiring an explicit confirm. Nothing is purchased yet.
3. Confirm the purchase, then submit the same action twice.
   → One label, one charge. The idempotency key prevents the double buy.
4. Turn the provider off (or unset its credentials) and start another US checkout.
   → Arranged delivery and manual carrier are offered with an honest reason. Checkout does not dead-end.
5. (real money — owed to Daniel by name) Fund the account and buy one real label in production for a
   small parcel; confirm tracking reaches the buyer's order page and email, then void or refund it.
   → One real label purchased, tracked, and voided. The profit ledger shows its actual USD cost.
6. Go to https://miyagisanchez.com/mx and run one Envía quote on a comp-granted shop.
   → Unchanged.

If any step fails, note the step number + what you saw — that's the bug report.
