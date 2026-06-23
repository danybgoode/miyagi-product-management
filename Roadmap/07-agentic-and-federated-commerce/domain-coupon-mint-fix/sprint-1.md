# Domain-coupon mint fix — Sprint 1: Diagnose, unmask, harden + test-mode rehearsal

**Status:** ✅ MERGED to prod — PR [#118](https://github.com/danybgoode/miyagisanchezcommerce/pull/118) squashed `cc73a26` (CI green, codex cross-review clean, low-risk). S1.3 mode/scope read + the live card-4242 smoke remain owed to Daniel.

| Story | Status | Risk |
|---|---|---|
| S1.1 — Surface the real Stripe error (mint + read paths) | ✅ `d12396d` (+ key-missing⇒auth `66261c9`) | low |
| S1.2 — *Actualizar* always renders a definite state | ✅ `7648608` | low |
| S1.3 — Confirm the prod cause (logs + key presence/mode/scope) | 🟡 partial — see findings below; mode/scope owed to Daniel | high (ops) |
| S1.4 — Test-mode redemption smoke (Chrome MCP + card 4242) + cap api spec | 🟡 spec ✅ `a76738a` · live smoke owed to Daniel | high (test-mode) |

## S1.3 — diagnostic findings (so far)
Done from the Vercel CLI/REST against project `miyagisanchez`:
- **`STRIPE_SECRET_KEY` IS present in Production** (created ~26 d ago) — so this is **not** the
  "`vercel env add` stored empty" failure mode. ✅
- **It is `type: sensitive` (write-only) and `target: production` only.** Two consequences:
  1. **Mode (`sk_live` vs `sk_test`) and scope (standard `sk_` vs restricted `rk_` without Coupons/
     Promotion-codes write) are NOT machine-readable** — a sensitive var can't be decrypted via
     `vercel env pull` or the REST API. **This read is genuinely owed to Daniel** (Stripe dashboard →
     the key's mode + restricted-scope), OR it now self-surfaces: post-`#118`, the next prod **Crear
     cupón** click shows the real sanitized cause in the admin UI (auth vs permission vs …).
  2. **The key is absent from the Preview scope**, so a Preview deploy has **no** Stripe key. `#118`
     hardened this: `getStripe()`'s lazy "Missing STRIPE_SECRET_KEY" throw now classifies as **auth**
     ("la llave falta"), not a generic "unknown" — so the Preview smoke (step 3) reports the missing
     key clearly instead of a vague error.
- **Most likely prod cause** (to confirm via the surfaced UI error on a prod retry): a **restricted key
  lacking Coupons/Promotion-codes write** (→ `permission`) or a **wrong-mode/invalid key** (→ `auth`).
  The fix lands in **Sprint 2 (S2.1)** once the surfaced `kind` is captured.

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

**Now MERGED → prod:** `https://miyagisanchez.com/admin/coupons` (Clerk **admin**-gated via `withAdmin`).
⚠️ **`STRIPE_SECRET_KEY` is production-only** (it's a Vercel _Sensitive_ var, not set for Preview) — so
run the **Crear cupón** step on **prod**, not a preview (a preview has no key and step 3 will report
"la llave falta", which is the S1.1 missing-key path working, not the coupon path).

### Builder-verified (automated, green in CI)
- ✅ `npx tsc --noEmit` + `npm run build` clean.
- ✅ `e2e/domain-coupon.spec.ts` (api project) — 8 pure tests + the route's anonymous-401 guard, green
  in CI's **"Playwright vs preview"** against this branch's preview. Covers the error-classifier
  (a real resource-missing ⇒ "missing"; auth/permission/connection/rate-limit **never** masked as
  missing; messages leak no key body) and the cap-of-100 boundary (99 ok / 100 refused / 101 refused).

### Manual (Daniel — admin session + money/auth path)
1. Open `https://miyagisanchez.com/admin/coupons` (signed in as admin).
   → The **"Cupón de campaña — Dominio propio"** card loads. If the coupon isn't minted in this env yet,
     it reads **"Aún no se ha creado el cupón en Stripe."**
2. Click **Actualizar**.
   → The status line now **always** resolves to a visible message — never a silent no-op:
     **"Sin cupón en Stripe todavía."** (none yet) · **"Estado actualizado ✓"** (exists) · or a **specific
     Stripe error** (e.g. the key is missing/wrong-mode/lacks coupon scope). *(S1.2)*
3. Click **Crear cupón**.
   → Within ~2 s the card flips to **"0/100 · canjes · activo"** and shows **"Cupón listo ✓"**.
   → **If it errors instead**, the message now **names the real Stripe cause** (no more generic "No se
     pudo crear el cupón.") — e.g. *"La llave de Stripe (STRIPE_SECRET_KEY) falta o no es válida…"* or
     *"…no tiene permiso para administrar cupones…"*. **Capture that text verbatim — it is the S1.3
     finding** (the same surfaced cause appears on a **prod** retry, alongside `[admin/domain-coupon]
     mint failed:` in the Vercel prod logs). *(S1.1)*
4. **(money/auth path — owed to Daniel)** As a **test seller**, open the custom-domain upsell → checkout,
   apply code `MIYAGISAN`, pay with Stripe test card `4242 4242 4242 4242` (any future expiry / any CVC).
   → Stripe shows the first year at **$0** (100% off); the created subscription's next renewal is
     **$499 MXN/yr**.
5. Back on `/admin/coupons`, click **Actualizar**.
   → Counter reads **1/100 · activo**.

> **Known boundary:** a Stripe **test** card cannot redeem a **live** coupon. Steps 4–5 prove the
> mechanics in **test mode**; the live coupon is minted + validated in **Sprint 2** (n/100 read, plus one
> optional real redemption owed to Daniel).

If any step fails, note the step number + exactly what you saw — that's the bug report.
