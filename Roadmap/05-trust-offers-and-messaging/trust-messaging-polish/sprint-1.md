# Sprint 1 — In-chat transaction ledger + haggling polish

> **Epic:** [Trust & Messaging Polish](README.md) · **BUILD-ORDER:** #3c · Epic C ·
> **Risk: MED — no money mutation.** Read-only projection + copy. Reviewer may merge per story on green CI.
> **Status: 📋 PLANNED.** Build `lib`-first: C.1 → C.2 → C.3.

The 05 core: turn the chat into a durable shared ledger (projecting #3b's already-durable payment state)
and make negotiation say whose turn it is, when it expires, and stop lying about the 48h window.

---

## C.1 — Transaction-ledger projection seam + conversation→order read
**As a** buyer or seller, **I want** the system to resolve the one order/payment(/refund) state behind a
conversation, **so that** the chat can show a single durable truth instead of inferring it from scattered
events.

**Reuse:** `manualPaymentStateFromOrder`/`whoActsNext`/`manualPaymentBadge` (`lib/manual-payment-state.ts`);
conversation→offer→order via `marketplace_orders.metadata.offer_id` + `medusa_order_id`
(`lib/order-mirror.ts`, `app/api/conversations/[id]/route.ts`); refund shape from `lib/refund-state.ts`
(Epic B — **null-safe stub now**).

**Acceptance (Daniel-runnable):**
- A pure `lib/transaction-ledger.ts` seam maps `{ offer, order(normalized), refundState? }` → a ledger
  view: current state + ordered timeline rows + a `whoActsNext` line; reuses `manualPaymentStateFromOrder`.
- Returns an **offer-only** view when no order exists yet; **null-safe on refund** (no refund rows until
  Epic B ships).
- `GET /api/conversations/[id]` returns the resolved order's projected state for a conversation with a
  linked/paid order; offer-only otherwise; **never 500s** when order or refund data is absent.

**QA:** pure-logic spec on `lib/transaction-ledger.ts` (state + timeline + graceful-degrade: offer-only,
no-refund, missing-order); one `api` spec asserting the conversation read projects the linked order's
state and degrades to offer-only. **Risk: MED · reviewer may merge on green CI.**

---

## C.2 — Render the durable transaction card in chat
**As a** buyer or seller, **I want** a durable transaction card in the conversation showing the current
shared state, **so that** I always know where the deal stands without re-reading the thread — and I tap
through to the order page to act.

**Reuse:** C.1's projection; `ConversationClient.tsx` header/listing panel + `useConversationStream`
(Supabase Realtime); `manualPaymentBadge`/`whoActsNext` copy.

**Acceptance:**
- The card renders in `ConversationClient` from C.1, using badge + who-acts-next copy (es-MX), and
  updates over the existing Realtime stream.
- **Read-only:** "Ya hice el pago" / "Confirmar pago" are **deep-links** to the existing buyer/seller
  order page — **no payment mutation in chat.**
- Degrades gracefully: offer-only conversations show negotiation state; refund rows appear only once
  Epic B ships (null-safe placeholder until then).

**QA:** authed browser smoke of the card render + deep-link target (chat is Clerk-gated → run via the
local `@clerk/testing` harness, else **owed to Daniel**); the projection itself is covered by C.1.
**Risk: MED · reviewer may merge on green CI.**

---

## C.3 — Haggling turn-owner + deadline + copy fix
**As a** buyer or seller in a negotiation, **I want** to see explicitly whose turn it is and a live
countdown to the real deadline, **so that** I'm not guessing from which buttons show.

**Reuse:** `lib/offers.ts` (`OfferStatus`, `expires_at`/`counter_expires_at`, `timeUntil`,
`isExpired`/`isCounterExpired`); `MakeOfferButton.tsx` + the chat offer panel.

**Acceptance:**
- The offer card shows an explicit turn-owner line ("Te toca responder" / "Esperando al vendedor" /
  "Esperando tu respuesta") derived from offer status + role, plus a `timeUntil()` countdown against the
  correct deadline (`expires_at` 48h pending; `counter_expires_at` 24h counter).
- The **48h/<24h copy mismatch is fixed** in `MakeOfferButton.tsx` (no "responde en menos de 24 h" while
  the window is 48h) — consistent and honest end to end.

**QA:** pure-logic spec on a `lib/offers.ts` turn-owner/deadline derivation helper (status+role →
who-acts-next + which deadline); anonymous browser smoke of the offer-card copy where renderable.
**Risk: MED/LOW · reviewer may merge on green CI.**

---

## Sprint 1 QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `npm run build` + Playwright `api`.
- **New specs:** `lib/transaction-ledger.ts` pure-logic (C.1), conversation-read `api` spec (C.1),
  `lib/offers.ts` turn/deadline pure-logic (C.3).
- **Browser smokes:** anonymous offer-card copy (C.3) in CI; the **authed chat card render (C.2) is owed
  to Daniel** (or local `@clerk/testing`) — state the gap in the PR.
- **Invariant to assert:** no code path mutates payment/refund state from the chat surface (ledger is
  read-only; actions are deep-links).

## Sprint 1 — Smoke walkthrough (do these in order)
> _Placeholder — fill with real production URLs once deployed (preview URLs pre-merge). One action + one
> expected result per step. Flag any authed/money-path step as **owed to Daniel**._

1. _(TBD)_ Open a conversation with a paid manual (SPEI) order at `https://miyagisanchez.com/messages/<id>`.
   → A transaction card shows the current state badge ("Pago reportado — en verificación", etc.) + a "te toca / espera" line. **(authed — owed to Daniel)**
2. _(TBD)_ Tap "Confirmar pago" on the card.
   → You're taken to the existing seller order page (deep-link) — no payment action happens inside chat. **(authed — owed to Daniel)**
3. _(TBD)_ Open an offer-only conversation (no order yet).
   → The card shows the negotiation state, no order/refund rows (graceful degrade).
4. _(TBD)_ On a listing PDP, open "Hacer oferta".
   → The expiry copy says 48 horas consistently (no "menos de 24 h"); a pending offer shows "Esperando al vendedor · Expira en …".

If any step fails, note the step number + what you saw — that's the bug report.
