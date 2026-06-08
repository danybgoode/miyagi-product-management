# Epic — Trust & Messaging Polish

> **Macro-section:** [05 · Trust, Offers & Messaging](../README.md) · **BUILD-ORDER:** #3c · Epic C ·
> **Risk: MED — no money mutation** (read-only projection + copy + presentational extraction);
> reviewer may merge per story on green CI.
> **Status: 📋 PLANNED — not started.** Groomed + signed off (Daniel, 2026-06-07); scaffolded under
> `05-trust-offers-and-messaging/`. Scope doc:
> [`00-ideas/seeds/trust-messaging-polish.md`](../../00-ideas/seeds/trust-messaging-polish.md).
> Wave context: [`remaining-audit-polish.md`](../../00-ideas/seeds/remaining-audit-polish.md).
> Driven by the #3a refresh ([`results-refresh-2026-06/`](../../00-ideas/audits/results-refresh-2026-06/), 05).

## Why
The #3a re-audit's 05 tail is **fragmentation, not absence**: the chat is an action bar, not a durable
shared ledger — `purchase_complete`/`shipped`/`delivered` flash by as ephemeral pills, never a card that
reflects *current* state; negotiation implies whose turn it is only by which buttons render, and
`MakeOfferButton.tsx` even contradicts itself ("48 horas" vs "responde en menos de 24 h"); and trust
signals are strong on the marketplace PDP but **vanish on white-label/embed renders** (the same listing
shows different trust by channel). Reading the code re-scopes all of it **smaller**: #3b already shipped
the durable payment state machine, so the ledger **projects** it (no re-model); the offer model already
carries both deadlines + `timeUntil()`; the only genuinely-new artifact is **one extracted trust
component**. **MED overall — the ledger stays read-only (Daniel's call), so no story mutates money.**

## Context

| Question | Answer |
|---|---|
| **Who** | Buyers + sellers in a conversation / negotiation, across every channel a listing renders on |
| **Job** | Know where the deal stands (one shared ledger), whose turn it is + when it expires, and see trust signals that survive every channel |
| **Outcome signal** | A durable transaction card in chat reflects the one shared order/payment(/refund) state · the offer card says "te toca / espera respuesta" with a live countdown and the 48h/<24h copy lie is gone · the same `<TrustSignals>` block renders at the negotiation entry, channel-aware |
| **In v1** | Read-only in-chat transaction ledger (projects #3b state; refund rows when Epic B lands) · haggling turn-owner + deadline + copy fix · extracted channel-aware `<TrustSignals>` component (parity-first) · negotiation-entry trust capsule |
| **Out** | **In-chat money mutation** (deep-link out instead) · persisted offer auto-expire · wiring `<TrustSignals>` into `ChannelLayout`/embed (**Epic D** consumes C.4) · the refund state machine itself (**Epic B**) · escrow |
| **Risk tier** | MED overall — no money mutation; reviewer may merge per story on green CI |

## Medusa-first note
**Nothing new is persisted.** The ledger only *reads and names* state Medusa already owns on
`order.metadata` (surfaced by `normalizeMedusaOrder`) via `manualPaymentStateFromOrder()`; the
conversation→order link rides existing keys (`marketplace_orders.metadata.offer_id` / `medusa_order_id`).
No new table, no new write, no new agent tool (an agent already reads the same normalized order).
Bilingual es-MX for all new copy, keyed beside the #3b vocabulary. Clerk untouched.

## What already exists (reuse, don't rebuild)
- **`lib/manual-payment-state.ts`** (#3b) — `manualPaymentStateFromOrder` / `whoActsNext` /
  `manualPaymentBadge`: the ledger's state + copy source. **Consume; do not re-derive.**
- **Conversation → order link** — `marketplace_conversations` already joins the offer
  (`app/api/conversations/[id]/route.ts:19-51`); `marketplace_orders.metadata.offer_id`
  (`lib/order-mirror.ts:88`) + `medusa_order_id` resolve the order on **existing columns**.
- **`lib/refund-state.ts`** (Epic B) — **not on `main` yet**; the ledger seam is built refund-shaped but
  **null-safe** (`?? null`) → a no-op until Epic B merges, then refund rows light up (no rework).
- **Chat timeline + system events** — `EventBubble` / `renderSystemText`
  (`purchase_complete`/`shipped`/`delivered`/`feedback_left`, `ConversationClient.tsx:162-172`) become
  the ledger card's timeline; the card slots into the existing header/listing panel.
- **`lib/offers.ts`** — `OfferStatus`, `expires_at` (48h) / `counter_expires_at` (24h),
  `isExpired`/`isCounterExpired`, `timeUntil`, `canAccept`/`canCounter`/… → the turn-owner + countdown
  derivation; **read-time expiry stays** (no new cron).
- **Inline PDP trust signals** — payment-methods / return-policy / pickup blocks
  (`app/l/[id]/page.tsx:147-175, 709-714`) → the source for the extracted `<TrustSignals>` component.
- **`app/s/[slug]/ChannelLayout.tsx`** — the bare white-label shell (custom-domain + subdomain + embed)
  where **Epic D** will render the extracted component (not touched in Epic C).

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **S1 · In-chat ledger + haggling** | C.1 `lib/transaction-ledger.ts` pure projection seam + conversation→order read (offer-only fallback; null-safe refund) | MED |
| | C.2 Render the durable transaction card in `ConversationClient` (read-only; deep-links out; Realtime-updated) | MED |
| | C.3 Haggling turn-owner + live deadline countdown + fix the 48h/<24h copy mismatch | MED/LOW |
| **S2 · Shared trust component** | C.4 Extract the channel-aware `<TrustSignals>` component from the inline PDP (parity-first, no visible PDP change; announce as new shared surface) | LOW–MED |
| | C.5 Render the trust capsule (slim variant) at the negotiation entry (chat header / offer entry) | LOW–MED |

## Deploy order
Frontend-only epic (reads already-normalized order data; no backend change). **S1 before S2**, and
**C.4 before Epic D's trust-parity slice (D.2)** — D consumes this component. Build C.1 (lib seam)
first, then the card (C.2), then haggling (C.3). All MED-or-below → reviewer may merge per story on
green CI; **announce C.4** (new shared component) per LEARNINGS.

## Cross-epic dependencies
- **Epic B (delivery-money-polish)** — `lib/refund-state.ts` not yet on `main`. The ledger is built
  refund-shaped + null-safe; refund rows appear when B merges. Degrade gracefully (LEARNINGS).
- **Epic D (cross-channel-trust-parity, domain 07)** — **now consumes C.4's `<TrustSignals>`**; this
  re-orders the original `A + D → C` wave so C.4 lands before D.2. *(Epic D was being groomed in
  parallel 2026-06-07; coordinate the component contract.)*

## Epic Definition of Done
- [ ] All S1 + S2 stories merged to `main`; pure-logic + api specs green in CI.
- [ ] Each sprint has a fool-proof smoke walkthrough in its `sprint-N.md` (real URLs once deployed;
      authed chat-render steps flagged as **owed to Daniel**).
- [ ] Ledger verified read-only — no payment/refund mutation path exists in chat (actions deep-link out).
- [ ] `<TrustSignals>` announced + documented as the shared trust block; Epic D handed the contract.
- [ ] Epic `README.md` ✅; every `sprint-N.md` ticked with commit refs; `RETROSPECTIVE.md` written.
- [ ] Product poster (`Roadmap/README.md`, 05) updated; team memory + `LEARNINGS.md` updated.
- [ ] Feature branch deleted; PR(s) merged.
