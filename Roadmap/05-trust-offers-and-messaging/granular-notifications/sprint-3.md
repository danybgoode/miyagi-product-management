# Sprint 3 — The money-path event + completeness

> Epic: [Granular Multi-Channel Notifications](README.md) · **Risk: HIGH — Daniel merges.**
> **Status: ✅ SHIPPED to prod 2026-06-07 — [PR #43](https://github.com/danybgoode/miyagisanchezcommerce/pull/43)
> merged (`c5cf6c7`, Daniel-authorized; CI green: Playwright-vs-preview + type-check+build + Vercel).**
> Dependency gate ✅ GREEN — #3b's durable `buyer_reported_paid` is on `main` (`lib/manual-payment-state.ts`)
> and emitted on the manual path; S3 imports that vocabulary (does not redefine it).
> Commits: **S3.1** `77abe9e` · **S3.2** `bc39c25` · **S3.3** `e20cb73`.
> **Owed to Daniel:** live money + refund smoke per the walkthrough below.
> Goal: the canonical money-path trigger reaches the seller on every chosen channel, the Payments/Returns
> groups are complete and consistent with #3b's vocabulary, and the whole experience is polished + es-MX.

## Scope decision (confirmed with Daniel during planning)
S3.2 wires **only `return_requested`** (genuinely buyer-triggered; lights up the "Devoluciones" group).
`payment_confirmed` and ship/deliver are **deliberately NOT** seller-notified — they're actions the seller
*themselves* triggers (notifying them of their own click is noise). The taxonomy documents this in
`lib/notifications/preferences.ts` so the groups read complete, not half-wired.
Bilingual: the seller portal is **es-MX throughout** (no dictionary consumption), so copy stays es-MX
consistent with S1/S2; the "bilingual" gate became a **copy-completeness** check (no untranslated/missing
copy), not a dead `en` dictionary.

## ⚠️ Dependency gate
Do **not** start S3.1 until #3b has merged `lib/manual-payment-state.ts` with the durable
`buyer_reported_paid` event. Sprint 3 **imports** that vocabulary — it does not redefine it. (Sprints
1–2 had no such gate and can already be done.) Confirm `buyer_reported_paid` exists + is emitted on the
manual-payment path before planning this sprint.

## Stories

### ✅ S3.1 — "Buyer reported payment" reaches the seller on chosen channels — `77abe9e`
**As** a seller, **I want** the buyer's "ya pagué" to reach me on every channel I've enabled, **so that**
I verify + confirm fast instead of discovering it later.
- Wired #3b's durable `buyer_reported_paid` into `dispatchToSeller` under the **Pagos** group, across email + Telegram + push, respecting prefs.
- `EVENT_GROUP += buyer_reported_paid → payments`; new `sendBuyerReportedPaymentToSeller` email (uses #3b's "en verificación" copy); `report-payment` route resolves the seller from the order (buyer-authed) → `dispatchToSeller`, keeps the durable persist + admin nudge, degrades gracefully if the seller can't be resolved.
- **Acceptance:** on a manual order, buyer taps "ya pagué" → the seller receives it on every enabled channel; disabled channels stay silent.
- **Risk: HIGH** (money path). Gate green; live money-path smoke owed to Daniel.

### ✅ S3.2 — Complete the groups: `return_requested` → Devoluciones — `bc39c25`
**As** a seller, **I want** the whole lifecycle to notify consistently, **so that** the event-groups
aren't half-wired.
- Routed the buyer-initiated return request through the seam under the **returns** group (both the Medusa and legacy branches) → email + push + linked Telegram per prefs (default-on email = parity). Admin `tg.alert` + buyer confirmation email unchanged.
- `EVENT_GROUP += return_requested → returns`. All four settings groups now map to a wired event (orders=`new_order`, offers=`offer_made`, payments=`buyer_reported_paid`, returns=`return_requested`).
- **Decision:** `payment_confirmed` / ship / deliver are seller-self-triggered → **not** echoed back (documented in `preferences.ts`), so "complete" means no self-notification noise, not every transition.
- **Acceptance:** buyer requests a return → seller notified per prefs under "Devoluciones"; group/state names match #3b's vocabulary.
- **Risk: HIGH.**

### ✅ S3.3 — Polish + finalize taxonomy (es-MX) — `e20cb73`
**As** a seller, **I want** the feature to feel finished, **so that** it reads cleanly with zero linked channels.
- `GROUP_COPY` (label + one-line es-MX summary) in the next-free `preferences.ts` = **one source of truth** consumed by the settings UI AND the completeness spec, so the per-group summary can't drift from what the seam fires. Settings render label + summary from it (dropped the stale local `GROUP_LABELS`).
- Telegram-not-linked empty state already reads cleanly (inert column + "Conecta Telegram" CTA); summaries now match the wired events.
- **Bilingual:** the seller portal is es-MX throughout (no dictionary) → copy stays es-MX; the gate became a **copy-completeness** check (every group has copy; no orphan copy; payments summary anchored to the money path) — no dead `en` keys.
- **Acceptance:** no missing/untranslated copy; settings reads cleanly with zero channels linked; each group's summary matches what it sends.
- **Risk: HIGH** (ships with the money-path stories).

## Sprint QA
- **Deterministic gate — GREEN ✅ (pre-merge):** `tsc --noEmit` ✅ · `next build` ✅ · Playwright `api`
  (`notification-preferences.spec.ts`, 22 passed) ✅ · `eslint` (0 errors on changed files) ✅.
- **New specs** (extended `e2e/notification-preferences.spec.ts`, pure-logic, no network):
  `buyer_reported_paid → payments` and `return_requested → returns` mapping; **pref-gating** guards (a
  disabled channel resolves no target; default-on email/push, Telegram opt-in); **no half-wired group**;
  **copy-completeness** (every group has non-empty label+summary; payments summary anchored to the money path).
  - *Why pure-logic not a `dispatchToSeller` integration test:* the dispatcher is `server-only`
    (imports `db`/email/notify/telegram) → the Playwright `api` runner can't import it. The pure resolver
    (`groupForEvent` + `resolvePrefs` + `isChannelEnabled` + `telegramTarget`) is the seam the dispatcher
    trusts; testing it proves the gating without a live server. The end-to-end fan-out is the live smoke.
- **Live money-path smoke (owed to Daniel):** real buyer-reports-paid → seller receives across channels —
  money/auth + real Telegram; **owed to Daniel** (he holds the buyer/seller sessions + linked chat).
- **Deploy:** #3b's backend event is **already merged + deployed** on `main` — re-confirm at merge.
  Frontend degrades gracefully (seller-resolution best-effort; durable persist + admin nudge unaffected).

## Sprint 3 — Smoke walkthrough
Env: branch **preview** `https://<branch-preview>.vercel.app` (pre-merge) → production
`https://miyagisanchez.com` after merge. Settings page: `…/shop/manage/settings` (Notificaciones panel).
Pre-req: #3b deployed (✅ on `main`); the seller has Telegram linked (Sprint 2) and "Pagos" + "Devoluciones"
enabled on the channels under test.

```
1. (money/auth — owed to Daniel) As a buyer, open a pending manual (SPEI) order and tap "Ya hice el pago".
   → The order shows "Pago reportado — en verificación" (the #3b durable event fires).
2. (money/auth — owed to Daniel) As the seller, check Email + Telegram (+ push if subscribed).
   → "El comprador avisó que pagó — verifica" arrives on every ENABLED channel within ~2s.
3. (Daniel) In Settings, turn OFF "Pagos → Telegram"; repeat steps 1–2 with another manual order.
   → The payment notice arrives on Email only, NOT Telegram.   ← granularity holds on the money path
4. (money/auth — owed to Daniel) As a buyer on a delivered order, request a return.
   → The seller gets "Nueva solicitud de devolución" under Devoluciones on each enabled channel.
5. (agent-verifiable, anonymous-ish) Open the Notificaciones panel in Settings.
   → 4 groups (Pedidos / Ofertas / Pagos / Devoluciones), each with a one-line summary that matches what it
     sends. With Telegram unlinked the column reads "Conecta para activar" + the "Conecta Telegram" CTA shows;
     no empty/broken copy. (Toggling a row persists via /api/sell/notification-preferences.)

If any step fails, note the step number + what you saw.
```
Steps 1–4 are the **money/auth + Telegram path** (real buyer/seller sessions + real Telegram) — **owed to
Daniel**. Step 5 (settings render + copy completeness) is agent-/browser-verifiable and covered by the
`api` copy-completeness spec.
