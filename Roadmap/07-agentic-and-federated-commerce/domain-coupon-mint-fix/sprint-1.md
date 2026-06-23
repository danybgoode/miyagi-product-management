# Domain-coupon mint fix — Sprint 1: Diagnose, unmask, harden + test-mode rehearsal

**Status:** 📋 PLANNED.

| Story | Status | Risk |
|---|---|---|
| S1.1 — Surface the real Stripe error (mint + read paths) | ⬜ | low |
| S1.2 — *Actualizar* always renders a definite state | ⬜ | low |
| S1.3 — Confirm the prod cause (logs + key presence/mode/scope) | ⬜ | high (ops) |
| S1.4 — Test-mode redemption smoke (Chrome MCP + card 4242) + cap api spec | ⬜ | high (test-mode) |

> Goal: make the admin mint/track tool **honest and reliable**, find the **actual** prod cause, and prove
> the full redeem-the-coupon mechanics in **test mode** — before touching live money state (Sprint 2).

## Stories

### Story S1.1 — Surface the real Stripe error
**As** Daniel, **I want** the admin coupon tool to show me *why* a mint or status read failed, **so that**
I can tell a missing key from a wrong-mode key from a permission problem instead of a generic dead-end.
In `app/api/admin/domain-coupon/route.ts`, return the **specific, sanitized** Stripe error (type/message,
**never** the key or raw secret) instead of the blanket *"No se pudo crear el cupón."*. In
`lib/domain-coupon-server.ts`, change `findCoupon()` so a genuine Stripe **"resource missing"** still maps
to `null`/EMPTY, but an **auth / permission / connection** error is **surfaced** (thrown or returned as a
typed error), not swallowed — so the read path can no longer disguise a broken key as "not minted yet."
**Acceptance:** in an env with a missing/restricted key, **Crear cupón** shows the real cause and
**Actualizar** reports the same; with a healthy key, behavior is unchanged.
**Risk:** low (admin-only surface, no money path).

### Story S1.2 — *Actualizar* always renders a definite state
**As** Daniel, **I want** clicking *Actualizar* to always change something visible, **so that** I never
stare at a button that "does nothing."
In `AdminCouponsClient.tsx`, `refreshCampaign()` must always resolve to one of three visible states:
"Sin cupón en Stripe todavía" / the live "n/100 · activo|agotado" / a specific error message. Set a
confirming/info message on the happy path (today it sets none, so an unchanged EMPTY status looks like a no-op).
**Acceptance:** every *Actualizar* click visibly updates the status text or shows a message.
**Risk:** low.

### Story S1.3 — Confirm the prod cause (Daniel-owned diagnostic)
**As** Daniel, **I want** the actual prod failure identified, **so that** Sprint 2 fixes the right thing.
Read Vercel prod logs for `[admin/domain-coupon] mint failed:` (the masked error from S1.1 will also now
surface in the UI on a prod retry). Verify the prod `STRIPE_SECRET_KEY`: present, **live mode** (`sk_live…`),
and — if a restricted key — carries **Coupons (write)** + **Promotion codes (write)** scope. (LEARNINGS:
`vercel env add` can silently store empty; prod money infra needs real creds.)
**Acceptance:** the real root cause is written into `RETROSPECTIVE.md`; if it's the key, the corrective
action (set/replace in Vercel prod env) is identified for S2.1. **This story gates S2.**
**Risk:** high (touches prod money creds — diagnostic only, no live write yet).

### Story S1.4 — Test-mode redemption smoke + cap api spec
**As** Daniel, **I want** to see `miyagisan` actually redeemed end-to-end in test mode, **so that** I trust
the live mint in Sprint 2.
Reconnect Chrome MCP. In a **test-mode** env (Vercel preview or local, `sk_test…`): click **Crear cupón**
(mints the test coupon), then drive a test seller through `/api/sell/shop/domain/subscribe` redeeming
`MIYAGISAN`, paying with Stripe test card **4242 4242 4242 4242**. Confirm: first invoice **100% off**
(year-1 free); the subscription is created on the standard plan so the **renewal is $499 MXN/yr**; the
admin counter ticks to **1/100**. Add an `api` spec on the pure seam (`lib/domain-coupon.ts`) asserting the
cap boundary: redeemable at 99 redemptions, **refused at 100** (the 101st can't be exercised with real checkouts).
**Acceptance:** the test redemption shows year-1 free + correct renewal + counter increment; the cap api spec is green.
**Risk:** high (exercises checkout — test mode).

## Sprint QA
- **api spec(s):** S1.1 → assert the mint route maps a thrown Stripe error to a specific (sanitized)
  response shape, and the GET returns a discriminated "missing vs error vs status" result (S1.2). S1.4 →
  `e2e/domain-coupon.spec.ts` (api project): `couponRedeemable`/`couponRefusalReason` boundary (99 ok, 100 refused).
- **browser smoke owed:** **yes, to Daniel** — the card-4242 checkout redemption (money/auth path; Chrome
  MCP drives it, but the live Clerk seller session + Stripe Checkout are owed to Daniel by name).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
> _Placeholder — the builder fills real preview/prod URLs + exact labels before calling the sprint done (Stage 8b)._

Env: **test mode** · preview URL `https://<branch-preview>.vercel.app` (or `http://localhost:3000`, `sk_test…`)

1. Go to `https://<preview>/admin/coupons` (signed in as admin).
   → The "Cupón de campaña — Dominio propio" card loads; status reads "Sin cupón en Stripe todavía".
2. Click **Actualizar**.
   → Status text visibly resolves (still "sin cupón" but now with a confirming message) — never a silent no-op.
3. Click **Crear cupón**.
   → Within ~2s the card flips to "0/100 · activo" and shows "Cupón listo ✓". (If it errors, the message
     now names the real Stripe cause — capture it; that's the S1.3 finding.)
4. (money/auth path — **Daniel**) As a test seller, open the custom-domain upsell → checkout, apply code
   `MIYAGISAN`, pay with test card `4242 4242 4242 4242` (any future expiry / any CVC).
   → Stripe shows the first year at **$0** (100% off); the created subscription's next renewal is **$499 MXN/yr**.
5. Back on `/admin/coupons`, click **Actualizar**.
   → Counter reads **1/100 · activo**.

If any step fails, note the step number + what you saw — that's the bug report.
