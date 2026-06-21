# Sprint 1 — Quantity purchase, made real (per-unit issuance + stepper + agent)

> Epic: [Events: quantity selector](README.md) · **Risk: HIGH** (money + fulfillment + checkout; backend-first;
> **Daniel merges**). **Status: 🚧 SCAFFOLDED — awaiting build.** Goal: a buyer (or agent) buys N admissions for a
> single GA event in one checkout, and gets N unique, redeem-once QR tickets — issuance minting one token per
> unit (idempotent), the PDP stepper capped by aforo, and the UCP checkout-session accepting quantity.

## Validate-first (carried from the scope doc)
The backend mints **one token per line-item and ignores `quantity`** (`…/orders/[id]/issue/route.ts:70-77`), so
buying N today charges for N but issues 1. The buyer N-QR display, the roster, the per-token door scan, and aforo
(`manage_inventory`) are **already N-ready** — so the work is: per-unit issuance (S1.1), the stepper + checkout
threading (S1.2), and the agent surface (S1.3). All N tokens issue under the buyer's email (no per-guest names v1).

## Stories

### S1.1 — (BE) Mint one ticket per unit, idempotent per unit  *(deploy first)*
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

### S1.2 — (FE) Quantity stepper on the event buy CTA + thread quantity through checkout
**As** a buyer on an event PDP, **I want** a quantity control capped by remaining seats, **so that** I pick how
many admissions before I pay.
- Quantity stepper on the event buy block (default 1), **clamped to `available_quantity`** and ≥ 1; buy label
  reflects N × price. Thread `qty` through the `/checkout?listingId=…` link (`page.tsx:479,483`) + the `signInHop`
  path; the checkout creates the cart line-item with `quantity = N`.
- **Acceptance:** on an event with 5 seats left, the stepper caps at 5; selecting 3 → checkout for 3 at 3 × price;
  a 1-left / sold-out listing shows no stepper above stock.
- **QA:** pure-logic spec on the clamp (min 1, max = available_quantity, label math) + the money smoke below.
  **Risk: MED–HIGH** (checkout/money) — under the epic's Daniel-merge.

### S1.3 — (Agent) UCP checkout-session accepts quantity
**As** an AI agent buying admission, **I want** to request N tickets over UCP, **so that** agent purchases match
the storefront (AGENTS rule #3).
- `app/api/ucp/checkout-session/route.ts` accepts `quantity` (default 1, clamped to `available_quantity`) and
  creates the line-item with it; issued-ticket count matches.
- **Acceptance:** a UCP checkout-session for quantity 2 on an in-stock event results in 2 tokens on the order.
- **QA:** api spec on the checkout-session quantity path. **Risk: MED** (additive, same money path).

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api` · backend unit (`test:unit`).
- Pure-logic specs: per-unit mint + idempotent re-issue (S1.1); stepper clamp + label math (S1.2);
  checkout-session quantity (S1.3).
- **Owed to Daniel (money/auth/door path):** the full buy-N → N-QR → scan-each-once → roster-N → aforo-minus-N
  walkthrough (below). An automated smoke can't cover the paid + door path.

## Follow-ups (captured at sprint close)
- _(none yet)_

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com once merged (the branch's Vercel **preview** + the backend deploy
while pre-merge). If quantity > 1 is kill-switched, enable the flag first. Steps 1–2 are anonymous; **steps 3–5
are owed to Daniel** (money + door path).

1. Open a paid **event** listing with several seats left, e.g. https://miyagisanchez.com/l/<event-id>.
   → A quantity stepper shows by the buy CTA, capped at the remaining seats; raising it to 3 makes the buy label
   read **3 × price**.
2. Set the stepper above the remaining seats.
   → It won't exceed `available_quantity` (a 1-left or sold-out listing shows no over-stock option).
3. (money path — **owed to Daniel**) Buy quantity 3 signed-in, then open the order under **Mis compras**.
   → The order page shows **3 distinct QR tickets** (not 1), all under your email.
4. (door path — **owed to Daniel**) Scan each of the 3 QRs at the seller door surface.
   → Each validates once and is marked used; a second scan of any one is rejected as already-used.
5. (roster/aforo — **owed to Daniel**) Open the seller roster for the event.
   → It lists 3 attendee rows for the order; the listing's remaining aforo dropped by 3.

If any step fails, note the step number + what you saw — that's the bug report.
