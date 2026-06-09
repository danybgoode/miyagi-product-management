# Sprint 1 — In-chat transaction ledger + haggling polish

> **Epic:** [Trust & Messaging Polish](README.md) · **BUILD-ORDER:** #3c · Epic C ·
> **Risk: MED — no money mutation.** Read-only projection + copy. Reviewer may merge per story on green CI.
> **Status: ✅ BUILT — [PR #64](https://github.com/danybgoode/miyagisanchezcommerce/pull/64) (draft), deterministic gate green.** Built `lib`-first: C.1 `c8b39a8` → C.2 `542cc11` → C.3 `230b512`. tsc + `next build` + Playwright `api` (406 passed) all green. **Note:** `lib/refund-state.ts` (Epic B) is now on `main`, so refund rows are wired for real — null-safe (nothing shows until an actual return request exists). Authed chat-card render owed to Daniel.

The 05 core: turn the chat into a durable shared ledger (projecting #3b's already-durable payment state)
and make negotiation say whose turn it is, when it expires, and stop lying about the 48h window.

---

## C.1 — Transaction-ledger projection seam + conversation→order read ✅ `c8b39a8`
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

## C.2 — Render the durable transaction card in chat ✅ `542cc11`
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

## C.3 — Haggling turn-owner + deadline + copy fix ✅ `230b512`
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
> One action + one expected result per step. **Prod** = `https://miyagisanchez.com` (post-merge).
> **Pre-merge preview** (SSO-gated, needs the protection-bypass token):
> `https://miyagisanchez-git-feat-trust-messag-f77ace-danybgoodes-projects.vercel.app`
> (latest build for `230b512`: `https://miyagisanchez-dycd35bba-danybgoodes-projects.vercel.app`).
> Authed/money-path steps are flagged **owed to Daniel** — the chat is Clerk-gated.

1. **(authed — owed to Daniel)** Open a conversation backed by a paid manual (SPEI) order:
   `https://miyagisanchez.com/messages/<conversation-id>`.
   → Below the listing header a **transaction card** shows the current state badge (e.g. "Pago reportado —
   en verificación"), a "te toca / espera" line, and a Negociación → Pago → Entrega timeline.
2. **(authed — owed to Daniel)** On that card, tap the action — "Confirmar pago" (seller) / "Ya hice el pago" (buyer).
   → You land on the existing order page (`/shop/manage/orders/<id>` seller · `/account/orders/<id>` buyer);
   **no payment action happens inside the chat** (read-only deep-link).
3. **(authed — owed to Daniel)** Open an **offer-only** conversation (no order yet).
   → The card shows the negotiation badge + turn-owner ("Te toca responder" / "Esperando al vendedor") with a
   live "Expira en …" countdown, and **no Pago/Entrega/Reembolso rows** (graceful degrade).
4. **(authed — owed to Daniel)** Open a conversation whose order has an open return/refund (Epic B).
   → A **"Reembolso …" row** appears and the headline switches to the refund state (e.g. "Transferencia
   pendiente"); a confirmed/none refund shows no false "emitido".
5. **(agent-runnable / anonymous)** On any listing PDP `https://miyagisanchez.com/l/<listing-id>`, open "Hacer oferta".
   → The expiry copy reads **"48 horas"** consistently and the footer says "El vendedor tiene 48 horas para
   responder" — **no "menos de 24 h"**. _(Also gated deterministically by `offer-copy-consistency.spec.ts`.)_
6. **(authed — owed to Daniel)** As the seller on a received pending offer, look at the offer panel (bottom).
   → It reads "Te toca responder · Expira en …" against the **48h** `expires_at`; on a counter, the buyer sees
   "Te toca responder · Expira en …" against the **24h** `counter_expires_at`.

If any step fails, note the step number + what you saw — that's the bug report.
