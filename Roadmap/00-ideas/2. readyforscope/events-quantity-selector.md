# Events — quantity selector (buy N admissions in one order)

> **⚠️ Legacy scope doc — this shipped.** See the epic:
> [`10-events-and-ticketing/events-quantity-selector`](../../10-events-and-ticketing/events-quantity-selector/README.md) (✅ shipped 2026-06-22).

**Status: awaiting Daniel approval — no code yet.**
Source: the [events-quantity-selector seed](../seeds/events-quantity-selector.md), itself routed out of the
[PDP follow-ups cleanup](pdp-followups-cleanup.md) groom (the S5 "events aforo / ticket tiers / quantity"
follow-up). **Domain: [10 · Events & Ticketing](../../10-events-and-ticketing/README.md)** — not PDP.
Grooming decisions (2026-06-21): **N tokens under the buyer** (no per-guest names in v1) · **its own
domain-10 epic** (backend-first, Daniel-merge) · **aforo-only cap** (no separate per-order max).

## Stage-2.5 bucket — **genuinely new** (a money/fulfillment-path build), not orientation
The seed *assumed* this was mostly orientation ("lean on Medusa cart quantity"). **Validate-first overturned
that:** the paid-ticket issuance route mints **one token per line-item and ignores `quantity`**
(`apps/backend/src/api/internal/events-ticketing/orders/[id]/issue/route.ts:70-77` maps over `order.items`,
never over units). So buying quantity = 3 today would **charge for 3 but issue 1 ticket**. The cart quantity is
cheap; **per-unit token issuance is the real work, and it's a fulfillment/money path** → HIGH, backend-first,
Daniel-merge. It **cannot ship frontend-only**.

What *is* already done (verified 2026-06-21) and must NOT be rebuilt:
- The **buyer order page already renders N QRs** — `app/account/orders/[id]/OrderTrackingClient.tsx:538-546`
  maps over `order.event_tickets`.
- The **seller roster already flat-maps N tickets per order** — `lib/paid-event-tickets.ts:87-105`.
- The **door redeem is per-token, redeem-once** — `apps/backend/.../events-ticketing/redeem/route.ts` (each of
  the N tokens validates + burns independently).
- **Aforo is native Medusa `manage_inventory`** surfaced as `available_quantity` / `in_stock`
  (`lib/listings.ts:144-146`) — capacity enforcement on a quantity purchase is free (inventory decrements by N).

So the gaps are exactly two-and-a-half: a **FE quantity stepper** (capped by aforo) + **threading quantity
through checkout**, and the **backend per-unit issuance** change. Plus the **agent** surface (quantity in the
UCP checkout-session).

## Why
**As** a buyer of admission to an event, **I want** to buy **N tickets in one checkout** for a single GA
listing, **so that** I can bring guests without checking out N times. Today the event PDP has no quantity
control (`app/l/[id]/page.tsx:304` — "quantity deferred, no live source").

## Stories (proposed — one sprint, backend-first)

### S1.1 — (BE) Mint one ticket per unit  *(the spine — deploy first)*
**As** a buyer who paid for N admissions, **I want** N unique scannable tickets issued, **so that** each guest
gets their own QR that's redeemed once at the door.
- Change `issue/route.ts` to mint **`item.quantity` tokens per line-item** (today: one per line-item). Each unit
  needs a **stable per-unit identity** — e.g. `subject_id = "${item.id}#${k}"` for k in 0..quantity-1 — so
  re-issue is idempotent **per unit**, not per line-item.
- **Central risk — idempotency.** Re-issue is also called by the **reconcile-checkouts cron**
  (`app/api/cron/reconcile-checkouts/route.ts`) and both webhooks, so the dedupe (currently keyed on
  `line_item_id` OR `token`, `:84`) must key on the **per-unit subject**, or a re-run collapses N→1 or duplicates.
- All N tokens carry `attendee_email = buyer email`, `attendee_name = null` (no per-guest names in v1).
- **Acceptance:** an order with a line-item of quantity 3 issues exactly 3 distinct tokens; calling issue again
  (cron/webhook replay) still yields exactly 3, same tokens, no duplicates; a quantity-1 order is unchanged
  (one token, same as today).
- **QA:** pure-logic spec on the per-unit mint + idempotent re-issue (1→1, 3→3, replay→3-no-dupes) on an
  extracted `lib/` seam. **Risk: HIGH** (fulfillment/money path; backend-first Cloud Run deploy; Daniel-merge).

### S1.2 — (FE) Quantity stepper on the event buy CTA + thread quantity through checkout
**As** a buyer on an event PDP, **I want** a quantity control capped by remaining seats, **so that** I pick how
many admissions before I pay.
- Quantity stepper on the event buy block (default 1), **clamped to `available_quantity`** (aforo) and ≥ 1;
  buy label reflects N × price. Thread `qty` through the `/checkout?listingId=…` link (`page.tsx:479,483`) and
  the `signInHop` path, and have the checkout create the cart line-item with `quantity = N`.
- **Acceptance:** on an event listing with 5 seats left, the stepper caps at 5; selecting 3 sends the buyer to
  checkout for 3 admissions at 3 × price; a sold-out / 1-left listing behaves correctly (no stepper above stock).
- **QA:** pure-logic spec on the clamp (min 1, max = available_quantity, label math) + the money smoke below.
  **Risk: MED–HIGH** (checkout/money path) — folded under the epic's Daniel-merge.

### S1.3 — (Agent) UCP checkout-session accepts quantity
**As** an AI agent buying admission, **I want** to request N tickets over UCP, **so that** agent purchases match
the storefront (AGENTS rule #3).
- `app/api/ucp/checkout-session/route.ts` accepts a `quantity` (default 1, clamped to `available_quantity`) and
  creates the line-item with it; the issued-ticket count matches.
- **Acceptance:** a UCP checkout-session for quantity 2 on an in-stock event results in 2 tokens on the order.
- **QA:** api spec on the checkout-session quantity path. **Risk: MED** (additive, behind the same money path).

## What already exists (reuse, don't rebuild) — verified 2026-06-21
| Capability | Where | Reuse for |
|---|---|---|
| Per-line-item ticket mint | `apps/backend/…/orders/[id]/issue/route.ts` + `_utils.ts` `mintTicketToken` | Change the loop to per-unit (S1.1) |
| N-QR buyer display | `app/account/orders/[id]/OrderTrackingClient.tsx:538-546` | No change — already maps N |
| N-ticket roster | `lib/paid-event-tickets.ts:87-105` | No change — already flat-maps N |
| Per-token redeem-once door scan | `apps/backend/…/events-ticketing/redeem/route.ts` | No change — each token burns once |
| Aforo (capacity) | native `manage_inventory` → `available_quantity` (`lib/listings.ts:144-146`) | Cap source for the stepper; decrements by N |
| Checkout entry | `/checkout?listingId=…` link (`app/l/[id]/page.tsx:479,483`) + `lib/checkout-hop.ts` | Thread `qty` (S1.2) |
| Agent checkout | `app/api/ucp/checkout-session/route.ts` | Accept `quantity` (S1.3) |

## In / out of scope
**In v1:** quantity stepper (aforo-capped) · per-unit issuance (N tokens, idempotent) · N QRs (reuse) · agent
quantity. **All N tokens under the buyer's email.**

**Out (deferred):**
- **Per-guest attendee names** — N tokens issue under the buyer; no name-capture UI/storage in v1.
- **Multi-price ticket tiers / variants** — the *separate* domain-10 backlog epic ("Multi-tier/multi-session
  tickets — Medusa variants + multi-variant purchase UI"). Quantity ≠ tiers.
- Assigned/reserved seating · ticket resale/transfer · a per-order max cap beyond aforo.

## Medusa-first note (AGENTS rules)
Commerce stays in Medusa (rule #1): quantity is native cart/line-item; aforo is native `manage_inventory`;
tokens ride order/line-item metadata exactly as today. No new tables, no Supabase for this (rule #2). Agent
parity via the UCP checkout-session (rule #3). Clerk untouched (#4). New copy es-MX (#5). **Backend-first
deploy** with graceful degrade: S1.1 ships first and defaults to quantity 1 if the FE isn't yet sending `qty`,
so the ~12-min Cloud Run window is safe.

## Risk & ship
- **Epic risk: HIGH** (money + fulfillment + checkout). **Daniel-merge.** Backend-first deploy order:
  **S1.1 → S1.2 → S1.3.** Consider gating quantity > 1 behind a kill-switch until the live money/door smoke passes.
- **Owed to Daniel (money/auth/door smoke):** buy N signed-in → see N distinct QRs on the order → scan each once
  at the door (each burns once, no reuse) → roster shows N → aforo decremented by N. An automated smoke can't
  cover the paid + door path.
- **Research:** none required — all internal Medusa/issuance code (no external standard/provider fact in play).

## Definition of Ready check
- [x] "As a / I want / so that" + Daniel-testable acceptance per story.
- [x] Stage-2.5 bucket named (**genuinely new** — validate-first corrected the seed's "orientation" guess).
- [x] v1 in/out boundary written; per-guest names + tiers + per-order cap explicitly out.
- [x] Reuse list produced (Medusa-first reframe done — issuance is the only real backend change; display/roster/door/aforo all reused).
- [x] Each story risk-tiered (epic HIGH, Daniel-merge); QA stage named (pure `lib/` specs + the owed money/door smoke).
- [x] Smoke owner: **Daniel** (paid + door path).
- [ ] **Daniel approves this scope doc** → then scaffold the domain-10 epic + sprint, commit, emit the kickoff.
