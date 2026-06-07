# Scope — Checkout & Manual-Payment State Hardening (BUILD-ORDER #3b)

> **Status: AWAITING SIGN-OFF (Daniel).** Definition-of-Ready scope doc. **This is the gate —
> nothing scaffolds until you approve it.** On approval: scaffold the epic + 3 sprint docs under
> `02-checkout-and-payments/`, commit, and emit the per-sprint Claude Code kickoff prompts.
> Groomed 2026-06-06 off the #3a refresh (`ux-audit/results-refresh-2026-06/`, pinned
> frontend `origin/main@ed447bd` / backend `origin/main@0980253`).
> **Class: Feature/epic** (money-path *hardening* — most stories are bug-class fixes of a
> shipped-but-half-built promise, bundled). **Stage-2.5 bucket: genuinely-needs-build** (real
> defects: durable state absent, gating absent, totals disagree) — but **reuse-heavy**, so smaller
> than it looks. **Risk: HIGH — Daniel merges every story.**

## The ask (mirrored back)
*You want the manual-payment lifecycle that the product already advertises ("payment pending → buyer
marks paid → seller confirms") to actually be **durable, foolproof, and trustworthy** on the money
path — so the buyer's "ya pagué" survives a reload, a seller physically cannot ship before payment is
confirmed, and the price the buyer sees on the pay button always matches the summary. Right?*

## Why / the job
**As** a buyer or seller on the manual-payment path (SPEI / DiMo / cash — the methods Mexicans
actually use), **I want** the order's payment state to be real, shared, and honest at every step,
**so that** nobody loses the "I paid" signal on reload, no seller ships before funds land, and the
total never changes between summary and pay button at the highest-intent moment. This is the
biggest trust win in the product and the prerequisite for #5 (notifications) — the durable
`buyer_reported_paid` event is #5's first canonical trigger.

## What the #3a refresh confirmed (current `main`)
All three P0s reproduce verbatim; see `results-refresh-2026-06/02-checkout-and-payments.md` and `03`:
1. **Durable `buyer_reported_paid` absent** — `report-payment/route.ts:23` is a Telegram-only nudge; the flag exists nowhere; the middle state is lost on reload.
2. **Ship-before-paid not gated** — `OrderDetail.tsx:827` renders `ShippingSection` gated only on `listing_type`, before the confirm-payment card (`:839`); **both** ship routes ungated (backend `…/ship/route.ts`, frontend `app/api/orders/[id]/ship-manual/route.ts`).
3. **Coupon-vs-CTA total mismatch** — summary shows discounted `totalCents` (`CheckoutExperience.tsx:222,662`); CTA shows undiscounted `amountCents + shipping` (`CheckoutPayButton.tsx:73,136`).

## Scope decisions (Daniel, 2026-06-06)
1. **Breadth — P0s + all 02 P1s.** v1 includes the three P0s **and** every 02 P1: who-acts-next
   copy + inbox fix, manual-payment instructions **preview before placement** (trust cliff, 02-#4),
   and **async-success recovery** state (02-#6).
2. **Refund language — copy-only fix in #3b.** Honest wording for off-platform SPEI/cash refunds
   ("Reembolso registrado / Transferencia pendiente" instead of "Reembolso emitido"). The **full
   assisted-refund state machine stays in #3c.**
3. **Slicing — 3 sprints** (below). Each high-risk; Daniel merges each.

## Medusa-first reframe — What already exists (reuse, don't rebuild)
Per LEARNINGS ("read the model first — it re-scopes the epic smaller"):
- **The gating predicate is already computed.** `OrderDetail.tsx:709`
  `paymentSettled = !isSpeiOrder || paymentReceived` — currently wired only to `canInitiateRefund`.
  Re-point it at the shipping affordance. The cosmetic `canShip` (`:703`) is the right shape too.
- **A durable reported-paid flag already ships — for print.**
  `app/api/print/submissions/[id]/payment-reported/route.ts:35` persists
  `payment_reported: true, payment_reported_at`. **Mirror the pattern** for marketplace manual
  orders on `order.metadata` — **likely zero new tables** (Medusa-first).
- **`confirm-payment` route already sets `payment_received`** (`backend …/confirm-payment/route.ts`)
  — extend the state model *around* it, don't replace it.
- **The Telegram send primitive stays** (`lib/telegram.ts`) — add durable persistence *alongside*
  the existing nudge, don't rip it out.
- **The coupon-aware total already exists** — `CheckoutExperience.tsx:222` computes `totalCents`.
  Extract it to a `lib/` seam and share it with `CheckoutPayButton` (single source of truth).
- **`normalizeMedusaOrder`** (`backend …/sellers/me/orders/route.ts`) already surfaces manual
  payment state — extend it to project the new sub-states to both buyer + seller.
- **Manual-payment method availability** is already resolved at `checkout-options` / `start-checkout`
  — reuse it to render the pre-placement preview (no new lookup).

AGENTS five-rule check: Medusa owns the state (metadata, no Supabase) ✅ · Supabase untouched ✅ ·
Clerk untouched ✅ · bilingual es-MX strings required for all new copy ✅ · **Agent surface:** the new
durable state should serialize into the order object the UCP/MCP order tools already expose, so a
seller's agent sees `buyer_reported_paid` too (additive).

## UX heuristics this epic is held to
- **State causality visible:** the buyer/seller always know the current state, the next actor, and why an action is/ isn't available ("Esperando pago" blocks "Prepara entrega").
- **Foolproof = server-enforced, not just hidden in the UI.** The ship gate must live in the API; the UI affordance is the courtesy layer.
- **One number.** The total on the CTA equals the total in the summary, always — coupon, bundle discount, and shipping from one computed source.
- **Honest status language.** The UI never claims an off-platform action ("Reembolso emitido") happened when only a record was written.

## Proposed slices (skateboard → car) — 3 sprints, all HIGH-risk
> Reference end-state only; the building agent confirms the plan in plan mode. Each story names its QA.

**Sprint 1 — Durable manual-payment state machine (the spine).**
- **S1.1** *As the system, I want manual-payment state persisted on the order* (`pending_payment → buyer_reported_paid → payment_confirmed → processing`) on `order.metadata`, mirroring the print `payment_reported` pattern. **Acceptance:** the state survives reload and is readable by both buyer + seller normalizers. **QA:** pure-logic spec on extracted `lib/manual-payment-state.ts` (transition rules); api spec asserting persistence. **Risk: HIGH.**
- **S1.2** *As a buyer, I want "ya hice el pago" to durably set `buyer_reported_paid`* (route writes the flag + timestamp **and** keeps the Telegram nudge), so the seller sees the reported state after reload. **Acceptance:** report → reload → both sides still show "pago reportado, en verificación." **QA:** api spec on `report-payment` persistence; browser smoke (authed buyer/seller) **owed to Daniel**. **Risk: HIGH.**
- **S1.3** *As buyer & seller, I want "who acts next" copy keyed to the state* across `OrderTrackingClient` + `OrderDetail`, and the inbox no longer says "Listo para enviar" on an unpaid order (`OrdersInbox.tsx:149`). **Acceptance:** unpaid order never reads "ready to ship"; each state shows the correct next-actor line. **QA:** browser smoke (rendered states) **owed to Daniel** — many assertions work anonymously. **Risk: HIGH** (seller money-path surface).

**Sprint 2 — Block ship before paid (UI + server).**
- **S2.1** *As a seller, I cannot ship a manual order until I've confirmed payment* — `ShippingSection` gated on `paymentSettled` (reuse `:709`), confirm-payment card reordered before it, with a clear "Esperando pago" disabled-reason. **Acceptance:** unpaid manual order shows no enabled ship action. **QA:** browser smoke (rendered gate) **owed to Daniel**; pure-logic spec on the gate predicate. **Risk: HIGH.**
- **S2.2** *As the platform, I reject ship API calls on unpaid manual orders* — server gate on **both** `backend …/ship/route.ts` and frontend `app/api/orders/[id]/ship-manual/route.ts` → 422 "Aún no confirmas el pago" for manual orders without `payment_received`. **Acceptance:** direct API ship attempt on an unpaid manual order returns 422. **QA:** api spec asserting the 422 (the deterministic gate — UI alone isn't foolproof). **Risk: HIGH.**

**Sprint 3 — One total + trust polish.**
- **S3.1** *As a buyer, the pay-button total equals the summary total* — extract `lib/checkout-total.ts` (items − coupon − bundle discount + shipping) and feed it to `CheckoutPayButton` (drop its local `amountCents + shipping`). **Acceptance:** apply a coupon → CTA and summary show the same number. **QA:** pure-logic spec on `lib/checkout-total.ts` (coupon/bundle/shipping math). **Risk: HIGH.**
- **S3.2** *As a buyer, I see manual-payment instructions before I commit* — render masked/structured SPEI/DiMo/cash availability in checkout (reuse `checkout-options`), replacing the "Verás las instrucciones al confirmar" cliff (`CheckoutExperience.tsx:551`). **Acceptance:** buyer sees which manual methods + a preview before placing the order. **QA:** browser smoke **owed to Daniel**. **Risk: HIGH.**
- **S3.3** *As a buyer, a stalled online payment shows recovery, not false success* — when `completeMedusaCart` returns null (`payment/success/page.tsx:91`), show "Estamos confirmando tu pedido" + retry + a stable path to `/account/orders` instead of `<SuccessUI>`. **Acceptance:** null-completion path renders recovery, not a success screen. **QA:** api/unit spec on the branch; browser smoke **owed to Daniel**. **Risk: HIGH.**
- **S3.4** *As a seller, refund status language is honest* — SPEI/cash refunds read "Reembolso registrado / Transferencia pendiente" until confirmed, not "Reembolso emitido" (`OrderDetail.tsx:659,1079`). **Copy-only.** **Acceptance:** no SPEI/cash refund claims "emitido" before the transfer. **QA:** spec/string assertion. **Risk: HIGH** (sits in the money-path epic; copy-only but ships with the others).

## In / Out of scope (v1)
**In:** durable manual-payment state machine on order metadata; durable `buyer_reported_paid` (route +
both surfaces); who-acts-next copy + inbox fix; ship gate (UI via `paymentSettled` + **server** on both
ship routes); single coupon-aware total shared by summary + CTA; manual-payment preview before
placement; async-success recovery state; refund-language copy-only honesty fix; one api spec per
testable story + extracted `lib/` seams; bilingual es-MX strings.
**Out (→ #3c unless noted):** the **full assisted multi-step refund state machine** (only the copy fix
is in #3b); **pickup reserved-slot scheduling** (02-#7); CP-first address re-order, quote
recovery/timeout, delivery-causality copy (04 → #3c); the **in-chat shared transaction ledger** (#3c —
it *consumes* this epic's durable state); the arranged-only delivery **policy decision** (owed to
Daniel pre-#3c); escrow/Compra Protegida (separate spike).

## Open risks / questions
- **High-risk seam, touched repeatedly.** Every story is on payments/checkout/fulfillment. Mitigation
  (per LEARNINGS): gate new behaviour on presence checks so the 99% non-manual path stays byte-for-byte
  unchanged; extract pure-logic `lib/` seams for free deterministic coverage; **Daniel merges each story.**
- **Two repos, async deploy.** S1 (state on metadata) likely spans backend (persist/normalize) +
  frontend (read). Merge **backend-first or together**; frontend reads degrade gracefully
  (`?? 'pending_payment'`) during the ~12-min backend deploy window (LEARNINGS).
- **State-model naming must be one vocabulary** across buyer normalizer, seller normalizer, inbox, and
  the agent/UCP order object — define it once in `lib/manual-payment-state.ts` and import everywhere
  (avoid the v1 `requested` vs `pending` mismatch 05 flagged).
- **No external-fact research needed** — this is internal state hardening; no payment-provider
  capability or standard changed. (Confirmed against current code, not training memory.)
- **`main` moves under the build** (parallel agents) — rebase latest `main` before each PR.

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance checks are Daniel-runnable.
- [x] Class = Feature/epic (bug-flavored hardening); Stage-2.5 bucket = genuinely-needs-build (reuse-heavy).
- [x] v1 in/out boundary written; Daniel's 3 scope decisions captured.
- [x] Medusa-first reuse list produced (paymentSettled predicate · print `payment_reported` pattern · confirm-payment route · checkout total seam · normalizeMedusaOrder).
- [x] Each story risk-tiered (all HIGH); QA stage named per story; browser smokes' owner (Daniel) identified.
- [ ] **Daniel approves this scope doc** ← the gate. On approval: scaffold `02-checkout-and-payments/checkout-state-hardening/` (epic README + sprint-1..3) + commit + emit 3 kickoff prompts.
