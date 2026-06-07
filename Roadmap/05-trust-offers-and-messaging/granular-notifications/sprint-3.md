# Sprint 3 — The money-path event + completeness ⛔ BLOCKED-BY #3b

> Epic: [Granular Multi-Channel Notifications](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: 📋 Planned — ⛔ BLOCKED until #3b merges** the durable `buyer_reported_paid` event.
> Goal: the canonical money-path trigger reaches the seller on every chosen channel, the Payments/Orders
> groups are complete and consistent with #3b's vocabulary, and the whole experience is polished + bilingual.

## ⚠️ Dependency gate
Do **not** start S3.1 until #3b has merged `lib/manual-payment-state.ts` with the durable
`buyer_reported_paid` event. Sprint 3 **imports** that vocabulary — it does not redefine it. (Sprints
1–2 had no such gate and can already be done.) Confirm `buyer_reported_paid` exists + is emitted on the
manual-payment path before planning this sprint.

## Stories

### S3.1 — "Buyer reported payment" reaches the seller on chosen channels
**As** a seller, **I want** the buyer's "ya pagué" to reach me on every channel I've enabled, **so that**
I verify + confirm fast instead of discovering it later.
- Wire #3b's durable `buyer_reported_paid` into `dispatchToSeller` under the **Pagos** group, across email + Telegram + push, respecting prefs.
- **Acceptance:** on a manual order, buyer taps "ya pagué" → the seller receives it on every enabled channel; disabled channels stay silent.
- **Risk: HIGH** (money path). **Blocked until #3b merges.**

### S3.2 — Complete the Payments/Orders groups
**As** a seller, **I want** the whole manual lifecycle to notify consistently, **so that** the
event-groups aren't half-wired.
- Add `payment_confirmed` (+ ship/deliver if not already routed in S1.4) to the seam under the right group, using **one vocabulary** with #3b's state names.
- **Acceptance:** each manual-lifecycle transition notifies per prefs; group names + state names match #3b everywhere.
- **Risk: HIGH.**

### S3.3 — Polish + bilingual
**As** a seller, **I want** the feature to feel finished, **so that** it reads cleanly and works in both
languages with zero linked channels.
- Finalize the event-group taxonomy; es-MX (+ en dictionary) for **all** Telegram message bodies + settings copy; "no channel linked" empty states; a one-screen summary of what each group sends.
- **Acceptance:** no untranslated string; settings reads cleanly with zero channels linked; each group's summary matches what it actually sends.
- **Risk: HIGH** (ships with the money-path stories).

## Sprint QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `next build` + Playwright `api`.
- **New specs:** api spec asserting `dispatchToSeller` fires on `buyer_reported_paid` + `payment_confirmed` per prefs; string/snapshot spec for the bilingual settings + Telegram bodies.
- **Live money-path smoke (owed to Daniel):** real buyer-reports-paid → seller receives across channels — money/auth + real Telegram; **owed to Daniel**.
- **Deploy:** confirm #3b's backend event has merged + deployed (Cloud Run) before merging S3.1; frontend degrades gracefully if the event field is briefly absent.

## Sprint 3 — Smoke walkthrough (fill in real URLs once deployed)
Env: preview `https://<branch-preview>.vercel.app` (pre-merge) → production `https://miyagisanchez.com` after merge.
Pre-req: #3b merged + deployed; the seller has Telegram linked (Sprint 2) and "Pagos" enabled on Email + Telegram.

```
1. (money/auth — owed to Daniel) As a buyer, open a pending manual (SPEI) order and tap "Ya hice el pago".
   → The order moves to the reported/in-verification state (the #3b durable event fires).
2. (money/auth — owed to Daniel) As the seller, check Email and Telegram.
   → A "el comprador avisó que pagó — verifica" notification arrives on BOTH enabled channels within ~2s.
3. In settings, turn OFF "Pagos → Telegram". Repeat steps 1–2 with another order.
   → The payment notification arrives on Email only, NOT Telegram.   ← granularity holds on the money path
4. Switch the app language to English (or check the en dictionary).
   → The settings grid + the Telegram message body render in English, no untranslated keys.

If any step fails, note the step number + what you saw.
```
Steps 1–3 are the **money/auth + Telegram path** (real buyer/seller sessions + real Telegram) — owed to Daniel.
