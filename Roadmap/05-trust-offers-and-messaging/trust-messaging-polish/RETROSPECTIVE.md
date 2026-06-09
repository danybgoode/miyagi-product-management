# Retrospective — Trust & Messaging Polish (#3c · Epic C)

**Shipped:** 2026-06-09 · both sprints to prod · MED risk (no money mutation) · frontend-only.
**PRs:** S1 [#64](https://github.com/danybgoode/miyagisanchezcommerce/pull/64) (squash `a53a62e`) ·
S2 [#65](https://github.com/danybgoode/miyagisanchezcommerce/pull/65) (squash `d35bc8c`).

## What shipped
The #3a re-audit's 05 tail was **fragmentation, not absence** — and reading the code re-scoped every
piece *smaller*.

- **S1 — In-chat ledger + haggling.**
  - **C.1** `lib/transaction-ledger.ts` — a pure, next-free projection seam:
    `buildTransactionLedger({offer,order,refundState?,role})` composes #3b's `manualPaymentStateFromOrder`
    + Epic B's `refundStateFromOrder` + new `offerTurn`/`offerStatusLabel`. `GET /api/conversations/[id]`
    resolves the order on **existing** keys (`marketplace_orders.metadata.offer_id` → mirror →
    `medusa_order_id`); never 500s (offer-only fallback). **No new table/write.**
  - **C.2** read-only `TransactionLedgerCard` in `ConversationClient`; all actions **deep-link out** to the
    order pages — the read-only invariant. The resolver lives in server-only `lib/conversation-ledger.ts` so
    the route and the page seed the same projection (no flash).
  - **C.3** `offerTurn` wired into the offer panel — turn line + live countdown vs the correct deadline
    (48 h / 24 h / checkout); the "48 h vs <24 h" copy lie fixed.
- **S2 — Shared trust component.**
  - **C.4** extracted the inline PDP trust block into a channel-aware `<TrustSignals>` over a pure selector
    seam `lib/trust-signals.ts` (`selectTrustSignals` + `trustChannelBucket` + `returnsWindowLabel`).
    **Parity-first** — the marketplace PDP renders byte-for-byte via two slots (`consultCta` for the
    precio-a-consultar/AskSellerButton, `interstitial` for S3.2's mobile `SellerTrustCard`). `ChannelLayout`
    untouched.
  - **C.5** the slim variant now greets a buyer at the negotiation entry (verificación · pago protegido ·
    devoluciones), derived **server-side** from the shop the page already loads.

## What went well
- **Read the code first; the epic shrank.** Every story reused an existing seam: the ledger *projects* #3b's
  state machine (no re-model), the offer model already carried both deadlines + `timeUntil`, and the only
  net-new artifact was one extracted component. Medusa-first / read-the-model-first paid off again.
- **Parity-first extraction with slot props.** Lifting a block another feature renders *inside* (S3.2's mobile
  `SellerTrustCard` sits between the pills and the methods box) was solved with an `interstitial` slot rather
  than reordering — byte-for-byte DOM preserved, S3.2 untouched.
- **Pure seam → cheap, real coverage.** `lib/trust-signals.ts` carried 14 pure-logic `api` tests (selector,
  buckets, both variants, the parity invariant, `returnsWindowLabel`) for free — no auth, no network.
- **Cross-epic handoff done right.** C.4 is the artifact Epic D consumes; the contract (props/variants) was
  written into Epic D's sprint doc **with two corrections** to its planned stories, so the parallel grooming
  session inherits the truth, not the sketch.

## What we learned / gaps
- **The sprint sketch's prop type was wrong; the real type was better.** The epic doc proposed
  `channel: 'marketplace' | 'channel' | 'embed'`; the app already detects a 5-value `ChannelSource`. Reusing
  the real type (Daniel's call) means Epic D passes `detectChannel()` straight through — no parallel type to
  sync. **Confirm a cross-consumer contract against the real type before coding it.**
- **A squash-merged sprint branch is a dead end for the next sprint.** S1's PR #64 was squash-merged, so the
  `feat/trust-messaging-polish` branch was stale (its content on `main` as one commit). S2 had to start on a
  **fresh branch off `main`**, not "continue the branch." Per-sprint squash ⇒ per-sprint branch.
- **The component is presentational; the data derivation was *not* extracted.** C.4 deliberately kept the
  PDP's `shop.metadata.settings → props` derivation inline (parity-tight). So Epic D can't "just wire" — it
  must derive its own trust inputs per surface. Flagged in the handoff (suggested a `lib/trust-inputs.ts`
  deriver as D's first story).
- **Worktree tooling double-gotcha.** A fresh worktree needs `npm install` *inside* it for the Tailwind-v4
  PostCSS `tailwindcss` resolve — but that then makes `@playwright/test` resolve worktree-local, so the
  **root** playwright binary throws "two versions of @playwright/test." Run the **worktree-local**
  `node_modules/.bin/playwright`.
- **Smoke gaps (owed to Daniel).** Both the authed in-chat ledger card render (S1) and the negotiation-entry
  capsule (S2) are Clerk-gated — no anonymous browser path. The C.4 PDP parity *is* covered anonymously by
  `e2e/trust-signals.browser.spec.ts`.
