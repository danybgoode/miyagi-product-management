# Domain-coupon mint fix — Sprint 2: Prod live mint + live verify

**Status:** ✅ S2.1 fix MERGED to prod (PR [#120](https://github.com/danybgoode/miyagisanchezcommerce/pull/120) `68af03f`, CI green + codex cross-review clean); S2.2/S2.3 = Daniel's prod mint + verify.

| Story | Status | Risk |
|---|---|---|
| S2.1 — Fix the mint request (coupon name ≤ 40 chars) | ✅ `68af03f` | high |
| S2.2 — Mint the live `miyagisan` coupon (idempotent) | ⬜ Daniel — ready once deploy is live | high |
| S2.3 — Verify live 0/100 · activo (+ optional real redemption) | ⬜ Daniel | high |

> Goal: the **real** `miyagisan` coupon exists on the **live** Stripe platform account and the giveaway is
> redeemable.

## Stories

### Story S2.1 — Fix the mint request (NOT a creds fix)
**As** Daniel, **I want** the mint request corrected per S1.3, **so that** the live mint can succeed.
**S1.3 proved the cause is a CODE bug, not creds:** `coupons.create` failed with
`StripeInvalidRequestError` on **`param: name`** — *"Invalid string: Domi…san); must be at most 40
characters"*. The coupon display name `'Dominio propio — primer año gratis (miyagisan)'` is **46 chars**,
over Stripe's **40-char** coupon-name limit; the mint died before the promo code. The live key is fine
(present, live-mode, scoped). Fix: shorten the name to **`'Dominio propio — primer año gratis'`** (34) —
the campaign code lives on the coupon `metadata` + promo code, so it needn't be in the name. Extracted to
`CAMPAIGN_COUPON_NAME` + `STRIPE_COUPON_NAME_MAX` in `lib/domain-coupon.ts`, with a CI guard
(`e2e/domain-coupon.spec.ts`) that fails if the name ever exceeds 40 again. **No economics change.**
**Acceptance:** with the fix deployed, a prod **Crear cupón** no longer 502s on `param: name`.
**Risk:** high (touches the live coupon mint — but display-string only, no economics).

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
