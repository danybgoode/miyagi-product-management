---
title: "Trust & messaging polish (#3c Epic C)"
slug: trust-messaging-polish
status: scaffolded
area: "05"
type: feature
priority: wave-3
risk: low
epic: "05-trust-offers-and-messaging/trust-messaging-polish"
build_order: "#3c-C"
updated: 2026-06-08
---

# Scope — Trust & Messaging Polish (#3c · Epic C, domain 05)

> **Status: ✅ SIGNED OFF (Daniel, 2026-06-07).** Gate passed; scaffolded under
> `05-trust-offers-and-messaging/trust-messaging-polish/` (README + sprint-1 + sprint-2); BUILD-ORDER
> ticked; kickoff prompts emitted. Deep-groomed 2026-06-07 off the #3c wave scope
> ([`remaining-audit-polish.md`](remaining-audit-polish.md) → Epic C block), the 05 refresh
> ([`audits/results-refresh-2026-06/05-trust-offers-messaging.md`](audits/results-refresh-2026-06/05-trust-offers-messaging.md))
> and the rescope delta ([`00-rescope-delta.md`](audits/results-refresh-2026-06/00-rescope-delta.md)),
> plus a fresh Medusa-first code read this pass (pinned `origin/main@fd0f2df`). **This doc is the gate —
> nothing scaffolds until Daniel approves it.**
>
> **Class:** Feature/epic (domain 05 — Trust, Offers & Messaging). **Stage-2.5 bucket:** mostly
> **light-enhancement on already-shipped features** — two of the three slices project state that
> #3b already made durable (no new money model), and the third is a presentational extraction. No
> net-new commerce primitive. **Risk: MED overall — no money mutation** (Daniel's call: the ledger
> stays read-only).

## The ask (mirrored back)
*You want the chat to become a **shared transaction ledger** — a durable card that reflects the one
order/payment/refund state both sides already share — plus negotiation that **shows whose turn it is
and when it expires** (and fixes the 48h/<24h copy lie), plus **trust signals at the negotiation
entry that survive every channel**. All three built by projecting state that already exists, not by
re-modeling it. Right?*

## Daniel's decisions this groom (2026-06-07)
1. **The in-chat ledger stays READ-ONLY (MED).** It mirrors the current shared order/payment/refund
   state into the conversation and **deep-links out** to the existing buyer/seller order pages for any
   action ("Ya hice el pago", "Confirmar pago"). **No money mutation happens in chat** → no new server
   gate, no new table, MED risk, reviewer may merge on green CI.
2. **Epic C owns and extracts the shared trust-signal component.** C.3 lifts the inline PDP trust
   signals into one reusable, **channel-aware** `<TrustSignals>` component and renders it at the
   negotiation entry. **Epic D later just renders that same component inside `ChannelLayout`** — one
   component, defined here while C is groomed. *(This re-orders the wave: see Open risks — D's trust
   slice now consumes C's component.)*
3. **Haggling deadline = surface + copy fix (MED/LOW), not new enforcement.** Add explicit turn-owner
   + a live countdown and fix the 48h/<24h copy mismatch, relying on the existing read-time expiry
   derivation. No persisted auto-expire transition in this epic.

## What the code read confirmed (Medusa-first reframe — read the model first)
Read read-only from `origin/main@fd0f2df` (the working tree is on a stale branch, as the #3a audit
also found — all findings re-read from `origin/main`).

- **#3b's durable state is live and already projectable.** `lib/manual-payment-state.ts` ships the
  pure, next-free state machine (`pending_payment → buyer_reported_paid → payment_confirmed →
  processing`) with `manualPaymentStateFromOrder()`, `whoActsNext()`, `manualPaymentBadge()`,
  `canSellerShip()` and honest refund copy. The ledger **consumes these — it does not re-derive state.**
- **The conversation → order link already exists on current keys.** `marketplace_conversations` joins
  listing + shop + offer (`app/api/conversations/[id]/route.ts:19-51`) but **not the order**. Orders
  mirror to Supabase `marketplace_orders` keyed by `metadata.medusa_order_id`, and **carry
  `metadata.offer_id`** when the order came from an offer (`lib/order-mirror.ts:88`). So
  **conversation → offer → order** is resolvable on existing columns; the Medusa order's normalized
  payment fields (`payment_received`, `buyer_reported_paid`, `fulfillment_state`) then feed
  `manualPaymentStateFromOrder()`. **No new table, no new write needed for a read-only ledger.**
- **Refund state isn't merged yet (degrade gracefully).** `lib/refund-state.ts` (Epic B) is
  **groomed/scaffolded but not on `main`**. The ledger projects #3b's payment state now and **gains
  refund rows when Epic B lands** — build the ledger seam refund-shaped but null-safe (`?? null`), a
  no-op until B ships (LEARNINGS: "degrade gracefully across the deploy-lag window").
- **The chat is already an event timeline — but with no durable state card.** `ConversationClient.tsx`
  renders `offer_sent`/`offer_countered`/`stamp_sent` bubbles and ephemeral system pills for
  `purchase_complete`/`shipped`/`delivered`/`feedback_left` (`renderSystemText`, `:162-172`). What's
  missing is a **durable card reflecting the *current* state** — the events are point-in-time pills,
  not a live ledger. The card slots into the existing header/listing panel; the events become its
  timeline.
- **The haggling copy mismatch is exact.** `MakeOfferButton.tsx` says "48 horas" in the expiry notice
  + success modal (correct — `expires_at` is 48h, `app/api/offers/route.ts:292`) but the footer reads
  *"El vendedor responde en menos de 24 h."* — the lie to fix. Turn-owner is implied only by which
  buttons render; `lib/offers.ts` has `expires_at` (48h, seller) + `counter_expires_at` (24h, buyer)
  and `timeUntil()`; `isExpired()`/`isCounterExpired()` derive expiry at read-time (a reminder cron
  exists, `app/api/cron/offer-reminders/route.ts`, but **no persisted auto-expire transition**).
- **No shared trust component exists today.** PDP trust signals (payment methods, return-policy block,
  pickup, processing time) are **computed and rendered inline** in `app/l/[id]/page.tsx`
  (`:147-175, :709-714`). `app/s/[slug]/ChannelLayout.tsx` (the white-label shell for custom-domain
  **and** subdomain, reused by embed) is a **bare branded frame — zero trust signals.** So the same
  listing presents materially different trust by channel — the 05 net-new finding, re-verified.

## What already exists (reuse, don't rebuild)
| Need | Reuse | Where |
|---|---|---|
| Payment-state projection for the ledger | `manualPaymentStateFromOrder` / `whoActsNext` / `manualPaymentBadge` (pure, #3b) | `lib/manual-payment-state.ts` |
| Conversation → order resolution | `marketplace_orders.metadata.offer_id` + `medusa_order_id`; conversation already joins the offer | `lib/order-mirror.ts:88`, `app/api/conversations/[id]/route.ts` |
| Refund states (future) | `lib/refund-state.ts` projection — **null-safe stub now**, real rows when Epic B merges | (Epic B, not yet on `main`) |
| Chat timeline + system events | `EventBubble` / `renderSystemText` (`purchase_complete`, `shipped`, `delivered`) | `app/messages/[id]/ConversationClient.tsx:162-172` |
| Offer state, turn semantics, countdown | `OfferStatus`, `expires_at`/`counter_expires_at`, `isExpired`/`isCounterExpired`, `timeUntil`, `canAccept`/`canCounter`/… | `lib/offers.ts` |
| Trust signals to extract | inline PDP payment-methods / return-policy / pickup blocks | `app/l/[id]/page.tsx:147-175, 709-714` |
| Where the shared trust component lands (Epic D) | the one white-label shell | `app/s/[slug]/ChannelLayout.tsx` |

**AGENTS five-rule check:** Medusa owns commerce ✅ (we only *read/name* `order.metadata` state, no new
persistence); Supabase non-commerce only ✅ (mirror/conversation reads, no new table); UCP/MCP ✅ (the
ledger reads the same normalized order an agent reads — no agent surface change, no new tool); Clerk
untouched ✅; bilingual ✅ (all new strings es-MX, copy keys live beside the #3b vocabulary).

## The slices (skateboard → car) — every story independently shippable + testable

### Sprint 1 — In-chat transaction ledger + haggling polish *(the 05 core; fully unblocked)*

**C.1 — Transaction-ledger projection seam + conversation→order read** *(MED — read projection)*
> **As a** buyer or seller, **I want** the system to resolve the one order/payment(/refund) state behind
> a conversation, **so that** the chat can show a single, durable truth instead of inferring it from
> scattered events.
> **Acceptance (Daniel-runnable):**
> - A pure `lib/transaction-ledger.ts` seam maps `{ offer, order(normalized), refundState? }` → a
>   ledger view (current state + ordered timeline rows + `whoActsNext` line), reusing
>   `manualPaymentStateFromOrder`; it returns an **offer-only** view when no order exists yet, and is
>   **null-safe on refund state** (no refund rows until Epic B).
> - The conversation read (`GET /api/conversations/[id]`) returns the resolved order's projected state
>   for a conversation that has a paid/linked order; returns the offer-only view otherwise; never 500s
>   when the order or refund data is absent.
> **QA:** pure-logic spec on `lib/transaction-ledger.ts` (state + timeline + graceful-degrade cases —
> free coverage, no auth/network); one `api` spec asserting the conversation read projects the linked
> order's state and degrades to offer-only. **Risk: MED · reviewer may merge on green CI.**

**C.2 — Render the durable transaction card in chat** *(MED — presentational, read-only)*
> **As a** buyer or seller, **I want** a durable transaction card in the conversation that shows the
> current shared state (pago pendiente → reportado → confirmado → en preparación → enviado/entregado,
> plus refund states later), **so that** I always know where the deal stands without re-reading the
> thread — and I tap through to the order page to act.
> **Acceptance:**
> - The card renders in `ConversationClient` from C.1's projection, using `manualPaymentBadge` +
>   `whoActsNext` copy (es-MX), and updates over the existing Supabase Realtime stream.
> - It is **read-only**: actions ("Ya hice el pago" / "Confirmar pago") are **deep-links** to the
>   existing buyer/seller order page — **no payment mutation happens in chat.**
> - It degrades gracefully: offer-only conversations show the negotiation state; refund rows appear
>   only once Epic B ships (null-safe placeholder until then).
> **QA:** anonymous/authed browser smoke of the card render + the deep-link target (chat is
> Clerk-gated → the authed render smoke is **owed to Daniel** via the local `@clerk/testing` harness;
> the pure projection is already covered by C.1). **Risk: MED · reviewer may merge on green CI.**

**C.3 — Haggling turn-owner + deadline + copy fix** *(MED/LOW — projection + copy)*
> **As a** buyer or seller in a negotiation, **I want** to see explicitly whose turn it is and a live
> countdown to the real deadline, **so that** I'm not guessing from which buttons are showing.
> **Acceptance:**
> - The offer card (`MakeOfferButton` / chat offer panel) shows an explicit turn-owner line
>   ("Te toca responder" / "Esperando al vendedor" / "Esperando tu respuesta") derived from offer
>   status + role, plus a `timeUntil()` countdown against the correct deadline (`expires_at` 48h for a
>   pending offer, `counter_expires_at` 24h for a counter).
> - The **48h/<24h copy mismatch is fixed**: `MakeOfferButton.tsx` no longer claims "responde en menos
>   de 24 h" while the offer window is 48h — copy is consistent and honest end to end.
> **QA:** pure-logic spec on a `lib/offers.ts` turn-owner/deadline derivation helper (status+role →
> who-acts-next + which deadline); anonymous browser smoke of the offer card copy where renderable.
> **Risk: MED/LOW · reviewer may merge on green CI.**

### Sprint 2 — Shared channel-aware trust component *(also unblocks Epic D)*

**C.4 — Extract the shared `<TrustSignals>` component (channel-aware)** *(LOW-MED — presentational refactor)*
> **As a** buyer, **I want** the seller's trust signals (verification, payment-protection,
> return window, pickup/contact) shown as one consistent block, **so that** trust doesn't depend on
> which page I happen to be on.
> **Acceptance:**
> - The inline PDP trust signals (`app/l/[id]/page.tsx`) are extracted into one reusable
>   `<TrustSignals>` component that takes a `channel` prop (`marketplace` | `channel` | `embed`) and a
>   slim variant for thin surfaces, with **no visible change on the marketplace PDP** (parity first).
> - The component is **announced as new shared surface** (Epic D will consume it) and documented as the
>   single trust block — per LEARNINGS "announce cross-cutting changes."
> **QA:** pure-logic spec on the trust-signal selector (which signals show per channel/variant);
> anonymous browser smoke asserting the marketplace PDP still renders the same signals (no regression).
> **Risk: LOW-MED · reviewer may merge on green CI** (it introduces a shared component but does **not**
> yet touch `ChannelLayout` — that wiring is Epic D).

**C.5 — Trust capsule at the negotiation entry** *(LOW-MED — presentational)*
> **As a** buyer about to negotiate, **I want** the key trust/eligibility signals visible at the chat
> header / offer entry, **so that** I learn eligibility *before* I submit, not after.
> **Acceptance:**
> - The `<TrustSignals>` (slim variant) renders at the negotiation entry (chat header / `MakeOfferButton`
>   context), channel-aware, surfacing verification + payment-protection + return window.
> - Buyer eligibility/trust is discoverable before offer submission (closes the 05 finding-3 gap).
> **QA:** anonymous/authed browser smoke of the capsule at the negotiation entry (authed parts owed to
> Daniel). **Risk: LOW-MED · reviewer may merge on green CI.**

## Proposed sprint/build order (adjust at sign-off)
1. **Sprint 1** (C.1 → C.2 → C.3) — the chat-state core; fully unblocked (#3b state shipped). Build
   `lib/transaction-ledger.ts` first (backend/lib-first), then the card, then haggling.
2. **Sprint 2** (C.4 → C.5) — the shared trust component, then the negotiation-entry capsule.
   **Build C.4 before Epic D's trust-parity slice** (D consumes this component).

## In / Out of scope (Epic C v1)
**In:** read-only in-chat transaction ledger (projecting #3b payment state + refund state when Epic B
lands); the `lib/transaction-ledger.ts` pure seam + conversation→order read; the durable chat card with
deep-links out (no in-chat money mutation); haggling turn-owner + live deadline countdown; the 48h/<24h
copy fix; the extracted channel-aware `<TrustSignals>` component (parity-first, no PDP visible change);
the negotiation-entry trust capsule; one `api`/pure-logic spec per testable story + extracted `lib/`
seams; bilingual es-MX.

**Out (deferred / other epics):** any **in-chat money mutation** (mark-paid / confirm from the card) —
deep-link out instead; **persisted offer auto-expire** transition (cron flips to `expired`) — read-time
derivation stays; **wiring `<TrustSignals>` into `ChannelLayout`/embed** — that's **Epic D** (consumes
C.4); the **full assisted refund state machine** itself — that's **Epic B** (`lib/refund-state.ts`);
escrow / Compra Protegida (its own spike).

## Open risks / questions
- **Wave re-order: Epic D now depends on Epic C.** Daniel's call makes C.4 the owner of the shared
  trust component, so **Epic D's trust-parity slice (D.2) is blocked-by C.4** — flipping the original
  `A + D → C` order for the trust thread. Recommend: build Epic C Sprint 2 (C.4/C.5) **before** Epic
  D's D.2; the rest of D (its inventory story D.1) can still run in parallel. Note this when D is
  deep-groomed.
- **Refund rows lag the ledger.** `lib/refund-state.ts` isn't on `main` (Epic B). The ledger must be
  refund-shaped but null-safe so it ships now and lights up refund rows when B merges — no rework, no
  broken render in the lag window.
- **Chat is Clerk-gated → some smokes are owed to Daniel.** The pure projection (C.1) and the trust
  selector (C.4) get free pure-logic coverage; the *rendered* chat card (C.2) and negotiation-entry
  capsule (C.5) need an authed session — run via the local `@clerk/testing` harness or owed to Daniel
  by name in the PR (LEARNINGS: state the smoke gap honestly).
- **`<TrustSignals>` is new shared surface.** Even though C.4 doesn't touch `ChannelLayout`, the
  component becomes a cross-epic dependency — announce it and prefer a PR (LEARNINGS).
- **No external-fact research needed** — everything is internal state/UX, verified against
  `origin/main@fd0f2df` this pass.

## Definition of Ready check
- [x] As-a/I-want/so-that clear per story; acceptance checks are Daniel-runnable.
- [x] Class named (Feature/epic, domain 05); Stage-2.5 bucket = mostly light-enhancement (projection + extraction), no net-new money model.
- [x] v1 in/out boundary written; Daniel's 3 decisions captured (read-only ledger · C owns trust component · surface-only deadline).
- [x] Medusa-first reuse list produced (`manual-payment-state.ts` · conversation→order via `order_id`/`offer_id` · `lib/offers.ts` · inline PDP trust → shared component).
- [x] Each story risk-tiered (all MED or below — no money mutation); QA stage named per story; smoke gaps (authed chat) identified + owed to Daniel.
- [x] **Daniel approved this scope doc (2026-06-07)** ← gate passed. Scaffolded
  `05-trust-offers-and-messaging/trust-messaging-polish/` (README + sprint-1 + sprint-2); BUILD-ORDER
  Epic C line ticked; kickoff prompts emitted. *(Note: Epic D groomed in parallel — its scope doc
  `cross-channel-trust-parity.md` is in flight; the C.4→D.2 dependency is captured in Open risks.)*
