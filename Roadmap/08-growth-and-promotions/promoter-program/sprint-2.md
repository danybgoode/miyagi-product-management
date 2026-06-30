# Promoter Program — Sprint 2: One-time payment cadence (the core money change)

**Status:** 🟦 READY — not started. **Risk: HIGH (payments).** Backend-first. Daniel merges.

| Story | Status | Commit |
|---|---|---|
| US-4 — One-time cadence for custom domain (+ graceful year-end lapse) | ⬜ | |
| US-5 — One-time cadence for printed ad | ⬜ | |
| US-6 — Cadence selectable over UCP/MCP | ⬜ | |
| api spec (`e2e/promoter-cadence.spec.ts`) | ⬜ | |

> Goal: a cash-paying merchant can **pay a year up front with no recurring mandate**. Adds a one-time
> cadence alongside today's recurring SKUs — the enabler for the in-person cash close (Sprint 4).
> **Backend-first:** the Medusa plan/price + migration land before the frontend merge that needs them.

## Stories

### US-4 — One-time cadence for the custom domain (+ graceful lapse)
**As a** cash-paying merchant, **I want** to pay one year up front with no recurring mandate, **so that**
I'm not forced into a card subscription. Add a **one-time** purchase option to the custom-domain SKU,
**alongside** the existing recurring subscription (reuse the one-time Stripe checkout pattern at
`app/api/stripe/checkout/*`, not a new payment path). Grant entitlement for 12 months via the existing
`lib/domain-entitlement*.ts` grant mechanism (a dated one-time grant). At year-end it **lapses gracefully
with no auto-charge** (reuse the custom-domain lapse logic).
**Acceptance:** a test seller buys the one-time custom-domain SKU → entitlement active 12 months, domain
connects; no recurring charge is ever created; at expiry the entitlement lapses and the domain
disconnects gracefully (no silent re-charge). The recurring option still works unchanged.
**Risk:** high

### US-5 — One-time cadence for the printed ad
**As a** merchant, **I want** to pay one-time for a printed-ad placement through the same cadence UX,
**so that** the promoter can sell the ad on the same terms. Align the print-ad checkout
(`app/api/print/submissions/[id]/checkout`) to the shared one-time cadence + the manual `payment-reported`
path it already has.
**Acceptance:** a one-time printed-ad purchase completes and the submission is marked paid; the existing
manual `payment-reported` flow still works.
**Risk:** high

### US-6 — Cadence selectable over UCP/MCP
**As an** agent, **I want** to see and select the one-time cadence at checkout, **so that** the SKUs stay
agent-accessible (rule #3). Expose the cadence option on `POST /api/ucp/checkout-session` + keep the
manifest accurate.
**Acceptance:** the UCP checkout-session lists both cadences; selecting one-time yields the same
entitlement as the UI path; manifest reflects it.
**Risk:** med

## Sprint QA
- **api spec(s):** `e2e/promoter-cadence.spec.ts` (api) — one-time grant dates set correctly + no
  subscription object created (US-4); lapse logic flips entitlement off at expiry with no charge (US-4);
  print-ad one-time marks paid (US-5); UCP checkout-session offers + honors cadence (US-6).
- **browser smoke owed:** **YES, to Daniel — live money path.** A real one-time custom-domain purchase
  with a Stripe test card, confirming entitlement + no recurring charge appears in Stripe.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

1. As a test seller, go to the custom-domain purchase flow and choose **"Pagar un año (pago único)"**.
   → A one-time checkout opens (no "renews automatically" language).
2. Pay with a Stripe test card `4242 4242 4242 4242`.
   → Entitlement activates; the domain connect form unlocks; confirmation shows a fixed 12-month term.
3. Open the Stripe dashboard for the platform account.
   → A **one-time** payment exists; **no subscription / no upcoming invoice** was created.
4. (lapse, simulated) Force the grant's expiry date to the past via the admin/script and reload settings.
   → The domain entitlement reads lapsed; **no new charge** was attempted.
5. (agent) Call `POST /api/ucp/checkout-session` for the custom-domain SKU.
   → The response lists both cadences; selecting one-time mirrors steps 1–2.

If any step fails, note the step number + what you saw — that's the bug report.
**Money/auth path:** steps 2–4 are the live-money path → **owed to Daniel** (an automated browser smoke
can't fully cover a real Stripe charge + the no-recurring assertion).
