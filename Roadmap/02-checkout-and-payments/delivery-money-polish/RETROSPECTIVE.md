# Retrospective — Delivery & Manual-Money Polish (02 · #3c Epic B)

**Closed 2026-06-09.** Three sprints, all shipped to prod. HIGH-risk (refunds / payments / fulfillment /
order state) — Daniel merged every PR. This was the #3b tail: the durable middle-states the
assisted-refund / pickup / quote flows lacked.

## What shipped
- **S1 — Two-sided off-platform refund state machine.** BE PR #16 (→ Cloud Run) + FE #54 (`3698fa0`).
  New pure `lib/refund-state.ts` mirrors the #3b `lib/manual-payment-state.ts` pattern (derive + guard
  table + es-MX copy). 4-state ladder `solicitado → aceptado → transferencia_pendiente → confirmado`
  (+ `rechazado`); card/escrow auto-confirm, SPEI/cash walks the ladder and **only the buyer's "Recibí el
  reembolso" closes it**. State on `order.metadata.return_request` — no new table. `normalizeMedusaOrder`
  emits `refund_state` to both sides + agents.
- **S2 — Pickup propose-and-confirm appointment.** BE PR #17 (`e9f96e2` → Cloud Run) + FE #58 (`d1eb9e4`).
  New pure `lib/pickup-appointment.ts`; 3-state `propuesta → confirmada` (+ seller reschedule re-opens).
  State on `order.metadata.pickup_appointment` — no new table. `proposed_by` drives **whoever did NOT
  propose confirms** (buyer proposes at checkout → seller confirms; reschedule → buyer confirms).
- **S3 — CP-first + quote recovery/timeout.** FE-only PR #62 (`a149d9e`).
  - S3.1 `27e4d89` — the address form leads with CP; name/phone + the rest reveal only after a valid CP
    resolves (progressive disclosure). No logic change to the existing postal-lookup.
  - S3.2 `08ec5cb` — a selectable "Entrega acordada" fallback replaces the dead-end copy when Envía can't
    quote; it switches `fulfillment_method` to `coord` and **auto-steers payment to pago directo**
    (the backend 422s on card + coord). New pure `lib/checkout-fallback.ts`.
  - S3.3 `231adf2` — a pure `raceWithTimeout(…, 9s)` around the quote fetch; on timeout it aborts and
    surfaces the S3.2 fallback so "Cotizando…" can't hang. New pure `lib/fetch-timeout.ts`.

## What went well
- **Medusa-first re-scoped every sprint smaller.** Reading the backend model first confirmed the refund
  and pickup state could ride `order.metadata` with **zero new tables / migrations** — the return-request
  model already persisted there. Both S1 and S2 were "extend the existing route + normalizer," not
  net-new machinery.
- **The pure-`lib`-seam pattern paid off a third and fourth time.** `lib/refund-state.ts` and
  `lib/pickup-appointment.ts` (state machines), then `lib/checkout-fallback.ts` and `lib/fetch-timeout.ts`
  (predicate + timeout) — each is next-free, so the Playwright `api` runner unit-tests the invariants for
  free (refund 24, pickup 19, fallback 8, timeout 4). The deterministic gate carried the repetitive
  checking; the single-pass fresh reviewer read once.
- **Defense-in-depth on the money path, verified by a fresh agent.** The S3.2 fallback mirrors the backend
  `start-checkout` 422 (card + coord) in the frontend `canPay` gate — the reviewer independently confirmed
  card + coord can never be submitted, and that the no-manual-method seller stays honestly unpayable.
- **Backend-first deploys across the ~12-min Cloud Run lag held** (S1/S2) — frontend reads degraded
  gracefully (`refund_state ?? …`, `pickup_appointment ?? null`) so the window never broke prod.

## What we learned / friction
- **The proxy made the spec-named lib a red herring.** The sprint doc said "time out
  `lib/envia.ts quoteShipments`," but that frontend lib only feeds the *seller* ship route — the buyer's
  quote is a `fetch('/api/checkout/shipping-rates')` proxy to the backend. The buyer-facing fix is a
  timeout on **that fetch in `CheckoutExperience`**, not the named lib. Trace the call the *user actually
  awaits* before trusting a plan's file pointer.
- **"main moved under you" bit again — and the tell was exact.** CI's "Playwright vs preview" went red on
  `agent-native-setup-spec.spec.ts`, a spec for a sibling epic (#61) merged after we branched. CI runs the
  *merged* test set against the *branch-head* preview, which predated #61's manifest endpoints. The fix
  was `git merge origin/main` + push — not debugging our own diff. A re-run alone won't fix it (the
  mismatch is structural, not flaky); only merging main does.
- **eslint is not in the CI gate here** (`ci.yml` = tsc + build + `test:e2e`). The React-Compiler
  `react-hooks/*` "errors" flagged on `CheckoutExperience.tsx` are pre-existing patterns across the
  component, not new — worth knowing so a future agent doesn't chase a non-gating red.
- **Checkout is auth-gated**, so the CP-first form can't be smoked anonymously; its browser spec is authed
  (skips without `MS_TEST_*`) and the live confirmation is owed to Daniel — stated honestly rather than
  implying "build passes, therefore done."

## Gaps / owed
- **Authed money-path browser smokes owed to Daniel** (he holds the sessions): S1 two-sided SPEI
  refund (sprint-1 steps 1–8); S2 propose→confirm→reschedule→confirm (sprint-2 steps 2–6); S3 CP-first +
  coordinated-proceed-through-`start-checkout` (sprint-3 steps 1–7).
- **B.5 arranged-*only* enforcement stays open behind Spike 0** (out of scope by decision).
- Nits left as-is on the HIGH-risk S3 PR (documented in the PR): a ≤450ms stale-fallback flicker window on
  mid-failure address edits (harmless; backend guard is the real gate); `pickManualPaymentId` picks the
  first manual method (order-dependent only if a seller ever exposes spei+cash).
