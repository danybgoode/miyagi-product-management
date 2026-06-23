# Domain-coupon mint fix — Sprint 2: Prod live mint + live verify

**Status:** 📋 PLANNED. **Gated on Sprint 1 / S1.3** (the confirmed prod cause). **All stories HIGH — Daniel runs/merges.**

| Story | Status | Risk |
|---|---|---|
| S2.1 — Apply the prod creds fix | ⬜ | high |
| S2.2 — Mint the live `miyagisan` coupon (idempotent) | ⬜ | high |
| S2.3 — Verify live 0/100 · activo (+ optional real redemption) | ⬜ | high |

> Goal: the **real** `miyagisan` coupon exists on the **live** Stripe platform account and the giveaway is
> redeemable. No code expected here if S1.3's cause is config — this sprint is a controlled prod action.

## Stories

### Story S2.1 — Apply the prod creds fix
**As** Daniel, **I want** the prod env corrected per S1.3, **so that** the live mint can succeed.
If S1.3 found a missing/empty/wrong-mode/under-scoped key, set the correct **live** `STRIPE_SECRET_KEY`
(full key, or a restricted key with Coupons + Promotion codes **write**) in the Vercel **Production** env
and redeploy/confirm it's live. (LEARNINGS: set Vercel env via the REST API + verify by value length —
`vercel env add` can store empty; `env pull` redacts.)
**Acceptance:** a prod admin status read no longer errors on creds; **Crear cupón** is ready to run for real.
**Risk:** high (prod money creds).

### Story S2.2 — Mint the live coupon (idempotent)
**As** Daniel, **I want** to press **Crear cupón** on prod, **so that** the live coupon exists.
On `https://miyagisanchez.com/admin/coupons`, click **Crear cupón** (idempotent find-or-create — safe to
repeat). Confirm in the Stripe **live** dashboard that Coupon `custom_domain_campaign_miyagisan`
(percent_off 100, duration once, max_redemptions 100) and Promotion Code `MIYAGISAN` both exist.
**Acceptance:** the live Coupon + Promotion Code exist; the admin card reads **0/100 · activo**.
**Risk:** high (creates live money infra). _Default mint path = the admin button; alternative = a one-off
Secret-Manager-creds script per the LEARNINGS run-order — confirm with Daniel if the button is unavailable._

### Story S2.3 — Verify live, state the gap
**As** Daniel, **I want** the live coupon verified, **so that** the giveaway is provably ready.
Read the live n/100 status (admin card + Stripe dashboard). Optionally run **one real redemption** (real
card, real year-1-free) end-to-end for full proof — owed to Daniel, since a test card can't redeem a live coupon.
**Acceptance:** live status confirmed active at 0/100 (or 1/100 if Daniel runs the real redemption);
the result is noted in `RETROSPECTIVE.md`.
**Risk:** high (live money path).

## Sprint QA
- **api spec(s):** none new — Sprint 1 covers the pure seam + route shapes. This sprint is prod verification.
- **browser smoke owed:** **yes, to Daniel** — the prod **Crear cupón** click + the Stripe live-dashboard
  confirmation + any real redemption. (Live money path — not automatable.)
- **deterministic gate:** if S2.1 is config-only, no code merge; if any code lands, the standard gate applies.

## Sprint 2 — Smoke walkthrough (do these in order)
> _Daniel-owned; live money path._

Env: **production** · `https://miyagisanchez.com`

1. Go to `https://miyagisanchez.com/admin/coupons` (admin).
   → The campaign card loads; status read no longer errors (S2.1 applied).
2. Click **Crear cupón**.
   → Card flips to "0/100 · activo" + "Cupón listo ✓".
3. Open the Stripe **live** dashboard → Products → Coupons.
   → Coupon `custom_domain_campaign_miyagisan` (100% off, once, max 100) + Promotion Code `MIYAGISAN` are present.
4. (optional, real money path — **Daniel**) Redeem `MIYAGISAN` on a real custom-domain checkout.
   → First year charges **$0**; renewal scheduled at **$499 MXN/yr**; admin counter reads **1/100**.

If any step fails, note the step number + what you saw — that's the bug report.
