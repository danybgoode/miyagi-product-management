# Sprint 1 — Quantity purchase, made real (per-unit issuance + stepper + agent)

> Epic: [Events: quantity selector](README.md) · **Risk: HIGH** (money + fulfillment + checkout; backend-first;
> **Daniel merges**). **Status: 🟡 BUILT — draft PRs open, deterministic gate green, awaiting Daniel merge + live smoke.**
> Goal: a buyer (or agent) buys N admissions for a single GA event in one checkout, and gets N unique, redeem-once
> QR tickets — issuance minting one token per unit (idempotent), the PDP stepper capped by aforo, and the UCP
> checkout-session accepting quantity.
>
> **PRs:** BE [medusa-bonsai-backend#33](https://github.com/danybgoode/medusa-bonsai-backend/pull/33) (S1.1, deploy first) ·
> FE [miyagisanchezcommerce#100](https://github.com/danybgoode/miyagisanchezcommerce/pull/100) (S1.2 + S1.3).
> **Kill-switch:** `events.quantity_enabled` (enablement, default OFF ⇒ cap 1) — to be created **disabled** in
> Flagsmith both envs; flip ON only after the live money/door smoke passes.

## Validate-first (carried from the scope doc)
The backend mints **one token per line-item and ignores `quantity`** (`…/orders/[id]/issue/route.ts:70-77`), so
buying N today charges for N but issues 1. The buyer N-QR display, the roster, the per-token door scan, and aforo
(`manage_inventory`) are **already N-ready** — so the work is: per-unit issuance (S1.1), the stepper + checkout
threading (S1.2), and the agent surface (S1.3). All N tokens issue under the buyer's email (no per-guest names v1).

## Stories

### S1.1 — (BE) Mint one ticket per unit, idempotent per unit  *(deploy first)* — ✅ BUILT (`c572631`, PR #33)
**As** a buyer who paid for N admissions, **I want** N unique scannable tickets issued, **so that** each guest
gets their own QR that's redeemed once at the door.
- Change `issue/route.ts` to mint **`item.quantity` tokens per line-item** with a **stable per-unit identity**
  (e.g. `subject_id = "${item.id}#${k}"`, k in 0..quantity-1).
- **Central risk — idempotency.** `issue` is also called by the reconcile-checkouts cron
  (`app/api/cron/reconcile-checkouts/route.ts`) and both payment webhooks; the dedupe (today keyed on
  `line_item_id` OR `token`, `:84`) must key on the **per-unit subject** so a replay yields exactly N, not N→1 or
  duplicates. Extract the mint/dedupe into a pure seam for free coverage.
- All N tokens: `attendee_email = buyer email`, `attendee_name = null`.
- **Acceptance:** an order line-item of quantity 3 issues exactly 3 distinct tokens; re-calling issue
  (cron/webhook replay) still yields exactly 3, same tokens, no dupes; a quantity-1 order is unchanged.
- **QA:** pure-logic spec — 1→1, 3→3, replay→3-no-dupes — on the extracted seam, in the `api`/unit gate.
  **Risk: HIGH** (fulfillment/money; backend-first Cloud Run; **Daniel-merge**).

### S1.2 — (FE) Quantity stepper on the event buy CTA + thread quantity through checkout — ✅ BUILT (`0813c46`, PR #100)
**As** a buyer on an event PDP, **I want** a quantity control capped by remaining seats, **so that** I pick how
many admissions before I pay.
- Quantity stepper on the event buy block (default 1), **clamped to `available_quantity`** and ≥ 1; buy label
  reflects N × price. Thread `qty` through the `/checkout?listingId=…` link (`page.tsx:479,483`) + the `signInHop`
  path; the checkout creates the cart line-item with `quantity = N`.
- **Acceptance:** on an event with 5 seats left, the stepper caps at 5; selecting 3 → checkout for 3 at 3 × price;
  a 1-left / sold-out listing shows no stepper above stock.
- **QA:** pure-logic spec on the clamp (min 1, max = available_quantity, label math) + the money smoke below.
  **Risk: MED–HIGH** (checkout/money) — under the epic's Daniel-merge.

### S1.3 — (Agent) UCP checkout-session accepts quantity — ✅ BUILT, surface parity (`0f93108`, PR #100)
**As** an AI agent buying admission, **I want** to request N tickets over UCP, **so that** agent purchases match
the storefront (AGENTS rule #3).
- `app/api/ucp/checkout-session/route.ts` accepts `quantity` (default 1, clamped to the kill-switch +
  `available_quantity`), **echoes** `quantity` + `line_total`, and threads qty into the instant `checkout_url`s.
- **⚠️ Re-scoped to surface parity (validate-first):** agent-initiated ticket **issuance** is **deferred**. The
  agent checkout endpoints (`/api/stripe/checkout`, `/api/mp/checkout`) build a *raw* Stripe/MP session with **no
  Medusa cart**, so they issue **0 tickets even at qty 1** — a pre-existing gap, not introduced here. Real agent
  issuance = a follow-up (re-route `create_checkout` through the Medusa cart). Daniel signed off on this scope.
- **Acceptance (as built):** a UCP checkout-session for quantity 2 echoes `quantity` (clamped) + `line_total` =
  2 × price. (The "2 tokens on the order" end-state rides the deferred issuance follow-up.)
- **QA:** fixture-gated api spec `ucp-checkout-quantity.spec.ts` (skips until `MS_TEST_EVENT_LISTING_ID` is set).
  **Risk: MED** (additive, read-only surface).

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api` · backend unit (`test:unit`).
- Pure-logic specs: per-unit mint + idempotent re-issue (S1.1); stepper clamp + label math (S1.2);
  checkout-session quantity (S1.3).
- **Owed to Daniel (money/auth/door path):** the full buy-N → N-QR → scan-each-once → roster-N → aforo-minus-N
  walkthrough (below). An automated smoke can't cover the paid + door path.

## Follow-ups (captured at sprint close)
- **Agent-side ticket ISSUANCE (deferred from S1.3).** The agent path (`UCP create_checkout` →
  `/api/stripe/checkout` | `/api/mp/checkout`) builds a raw Stripe/MP session with **no Medusa cart**, so it
  hits the webhook's legacy branch (`cart_id` absent) and issues **0 event tickets even at qty 1** — a
  pre-existing gap. To make agent purchases issue tickets (and honor `quantity`), re-route `create_checkout`
  through the Medusa cart (`lib/cart.ts startCheckout`, the path the web buyer uses) so the webhook's Medusa
  branch runs `issuePaidTicketsForOrder`. HIGH-risk money path → its own sprint/epic.
- **`MS_TEST_EVENT_LISTING_ID` repo secret** (owed to Daniel) lights up `ucp-checkout-quantity.spec.ts`.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com once merged (the FE branch's Vercel **preview** + the backend Cloud
Run deploy while pre-merge). **Deploy order: merge BE [#33](https://github.com/danybgoode/medusa-bonsai-backend/pull/33)
first and confirm the live revision rolled, then merge FE [#100](https://github.com/danybgoode/miyagisanchezcommerce/pull/100).**
Steps 1–2 are anonymous (preview-smokeable); **steps 3–5 are owed to Daniel** (money + door path).

0. **Enable the kill-switch.** Create `events.quantity_enabled` in Flagsmith (both environments, **disabled** at
   creation — a flag absent from the dashboard can't be toggled), then turn it **ON**. With it OFF every event
   caps at 1 ticket (today's behavior) — so this step gates everything below.
1. Open a paid **event** listing with several seats left, e.g. https://miyagisanchez.com/l/<event-id>.
   → A quantity stepper shows by the buy CTA, capped at the remaining seats; raising it to 3 makes the buy label
   read **3 × price = total**.
2. Set the stepper to its max (the remaining seats).
   → The `+` button disables at `available_quantity` (a 1-left or sold-out listing shows **no** stepper — the
   plain single-ticket CTA).
3. (money path — **owed to Daniel**) Buy quantity 3 signed-in, then open the order under **Mis compras**.
   → You're charged **3 × price**; the order page shows **3 distinct QR tickets** (not 1), all under your email.
4. (door path — **owed to Daniel**) Scan each of the 3 QRs at the seller door surface.
   → Each validates once and is marked used; a second scan of any one is rejected as already-used.
5. (roster/aforo — **owed to Daniel**) Open the seller roster for the event.
   → It lists 3 attendee rows for the order; the listing's remaining aforo dropped by 3.

**Not in this smoke (deferred — see Follow-ups):** an **agent** (UCP) buying tickets. The UCP checkout-session
echoes `quantity` + `line_total` (surface parity), but the agent checkout path doesn't issue tickets yet — so
there's no agent buy-N → N-QR to smoke this sprint.

If any step fails, note the step number + what you saw — that's the bug report.
