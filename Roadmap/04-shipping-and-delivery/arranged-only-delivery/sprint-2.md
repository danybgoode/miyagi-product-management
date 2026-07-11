# Sprint 2 — Agent parity + consistency hardening (the car)

**Epic:** [Arranged-only delivery](README.md) · **Risk: MIXED (MED + HIGH)** · **Status: 🚧 in progress —
branch `feat/arranged-only-delivery-s2` cut off fresh `origin/main` in both repos (isolated worktrees,
S1's branch was squash-merged).**

Sprint 1 ships the web path. Sprint 2 brings the agent surface to parity and closes the adjacent money-path
inconsistency the spike surfaced.

**Build note (planning):** research for this sprint found the S2.2 hole goes one layer deeper than S1's
cross-agent finding — `checkout-options`' own `buildDeliveryCatalog` derivation never looks at
`listingType` at all (only a client-supplied `delivery_mode` query param), and `start-checkout`'s 422
guard runs *before* the cart/product is even loaded, so there's no server-side product truth anywhere on
the payment path today. Fix: one canonical pure function (`isCoordinatedListing`) in
`delivery-catalog.ts`, called by both `checkout-options` (existing) and `start-checkout` (new). Confirmed
with Daniel: the service/rental branch of that function is **unconditional** (ships live on merge, no new
flag) since it closes a pre-existing bug, not new epic scope — the `arranged`-capability branch stays
behind `shipping.arranged_only_enabled` exactly as S1.1 built it. Build order is **S2.2 (backend) before
S2.1 (frontend)** — deviates from the story numbering below because S2.1's UCP hint is only fully correct
for service/rental listings once S2.2's backend fix ships. Full plan:
`~/.claude/plans/toasty-sniffing-snowglobe.md`.

---

## Stories

### S2.1 — Agent/UCP arranged-only surface *(MED — reviewer may merge on green CI)*
> **As a** buyer's AI agent, **I want** the checkout session to tell me a listing is delivered by
> coordination, **so that** I present "coordina la entrega con el vendedor" instead of implying shipping or
> offering a card.
- `app/api/ucp/checkout-session/route.ts` adds a `delivery: { arranged: boolean, note: string }` hint derived
  from checkout-options' `only_coordinated` / `delivery_methods` — today `fetchBackendPaymentMethods` reads
  the route but **ignores both fields**.
- Confirm the existing filtering already drops mp/stripe for arranged (backend removes instant methods → the
  agent computes `mpAvailable`/`stripeAvailable` false), so the agent sees only `bank_transfer`/`cash`; no
  instant `checkout_url`s are emitted.
- Agent-facing recovery copy for the arranged path (es-MX + en on the bilingual agent surface).
- **Additive, no mutation** — surface parity only; agent-initiated arranged-order *issuance* stays deferred
  (the UCP session doesn't open a Medusa cart, per its own `quantity` note).
- **Acceptance:** a `POST /api/ucp/checkout-session` for an arranged listing returns `delivery.arranged:true`
  with a coordinate note, **no** instant `checkout_url`s, and only manual payment options.

### S2.2 — Close the service/rental card-payment hole *(HIGH — Daniel merges)*
> **As** the platform, **I want** service and rental listings to enforce manual payment like any coordinated
> delivery, **so that** a buyer can't pay by card for something that fulfills by in-person coordination.
- Today `service`/`rental` listings send `fulfillment_method:'service'|'rental'`, which the `start-checkout`
  422 guard (`none`/`coord` only, :237-247) does **not** catch — so they are **card-payable** despite
  `OPTION_KEY_BY_METHOD` routing them to the `coord` fulfillment option.
- Make the arranged signal canonical: either map `service`/`rental` to arranged in `checkout-options` (so
  `onlyCoordinated` trips and instant payments are filtered), **or** extend the 422 guard to treat
  `service`/`rental` as coordinated. Pick the one that keeps `checkout-options` the single source of truth.
- **Acceptance:** attempting card + a `service` (or `rental`) listing is blocked — the checkout-options
  response offers no instant method, and/or `start-checkout` 422s — matching arranged-only behavior.
- **Regression spec** so the hole can't silently reopen.

---

## Sprint QA
- **API spec** (S2.1) asserting an arranged listing's UCP session omits instant `checkout_url`s and carries
  `delivery.arranged:true` + the note.
- **API spec** (S2.2) asserting card + service/rental is blocked (no instant method offered and/or a 422),
  plus a **regression spec** pinned to the exact hole.
- **Pure-logic** coverage folded into the S1.1 derivation seam where service/rental now map to coordinated.
- **Anonymous browser smoke** — an agent-style fetch of an arranged listing shows the coordinate hint.
- **Money-path smoke — OWED TO DANIEL** (confirm a real service/rental checkout can no longer be card-paid).

---

## Sprint 2 — Smoke walkthrough (do these in order)
> _Written at sprint close with real production URLs. The service/rental card-block is a **money-path** check
> owed to Daniel._
>
> _Placeholder — fill at sprint close per WAYS-OF-WORKING Stage 8b._
