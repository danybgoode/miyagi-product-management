# Domain-coupon mint fix — `miyagisan` campaign coupon won't create

**Status: awaiting Daniel approval — no code yet.**
Class: **Bug / half-finished promise** (epic 07 · custom-domain-paywall follow-up). The admin tool that
mints the custom-domain campaign coupon `miyagisan` fails on prod, so the coupon has never been created
in the live Stripe account — the World-Cup giveaway (first year of the own-domain subscription free,
capped at 100) can't be redeemed.

## What Daniel reported
On `/admin/coupons`, the **Cupón de campaña — Dominio propio** card shows *"Aún no se ha creado el cupón
en Stripe."* Clicking **Crear cupón** → *"No se pudo crear el cupón."* Clicking **Actualizar** → nothing
visible happens. Failure is on **production** (miyagisanchez.com). Goal: fix the tool, **mint the real
live coupon**, and prove the whole thing with a Stripe **test-card** redemption smoke first.

## Stage 2.5 — can we already do this? **Mostly yes — this is a fix + harden, not a new build.**
The entire mechanism already exists and is reusable (see below). The only genuinely-new work is
defensive: surfacing the real error, giving *Actualizar* feedback, and the validation rehearsal. No new
tables, no Medusa module, no new Stripe objects — the coupon + promo code are already designed
(deterministic, idempotent find-or-create).

## Root cause (read against code, 2026-06-23)

**Where it lives**

| Concern | Source of truth | File |
|---|---|---|
| Pure rules (code match, cap-of-100 boundary, display counter) | next-free seam | `lib/domain-coupon.ts` |
| Stripe side: idempotent mint, live status, redemption resolve | server-only (`STRIPE_SECRET_KEY`) | `lib/domain-coupon-server.ts` |
| Admin API (GET status / POST mint), Clerk admin-gated | route | `app/api/admin/domain-coupon/route.ts` |
| Admin UI (the card, the two buttons) | client | `app/(shell)/admin/coupons/AdminCouponsClient.tsx` + `page.tsx` |
| Redemption at checkout (`{coupon}` → promo code) | shared builder | `lib/domain-subscription-checkout.ts`, `app/api/sell/shop/domain/subscribe/route.ts` |
| Stripe client (lazy; throws if key missing) | `lib/stripe.ts` |

**Root cause 1 — the mint error is masked, so the real cause is invisible.**
`POST /api/admin/domain-coupon` wraps `ensureCampaignCoupon()` (which calls `stripe.coupons.create` /
`promotionCodes.create`) in a catch-all that returns the generic *"No se pudo crear el cupón."* (HTTP
502). The actual Stripe error is only `console.error`'d server-side. On prod the leading hypothesis is a
**credentials problem** — the prod `STRIPE_SECRET_KEY` is missing, stored empty, wrong mode, or a
**restricted key without coupon / promotion_code write scope**. (LEARNINGS: `vercel env add` silently
stores empty values; prod money infra must be seeded with real creds, not local `sk_test…`.) It cannot be
confirmed without the prod log or unmasking the error — which is exactly why the first fix is to surface it.

**Root cause 2 — *Actualizar* is silent because the read path swallows every Stripe error.**
`findCoupon()` does `try { retrieve } catch { return null }`, so an auth/permission failure is
indistinguishable from "coupon doesn't exist." `getCampaignCouponStatus()` then returns the EMPTY status
(`exists:false`), the card re-renders the same *"Aún no se ha creado…"* line, and `refreshCampaign()`
sets **no** success message on the happy path → zero visible feedback. So a broken prod key looks exactly
like "not minted yet."

## What already exists (reuse, don't rebuild)
- `lib/domain-coupon.ts` — `couponRedeemable` / `couponRefusalReason` / `formatRedemptionCount`, the
  cap-of-100 boundary. **Reuse for regression specs** (no Stripe, no network).
- `lib/domain-coupon-server.ts` — `ensureCampaignCoupon` (idempotent), `getCampaignCouponStatus`,
  `resolveCampaignPromotionCode`. Fix the masking here; don't rewrite the mint.
- Admin route + UI — extend (real error + feedback), don't replace.
- `startCustomDomainCheckout` + `/api/sell/shop/domain/subscribe` — the redemption path the smoke drives.
- The Stripe coupon design is already correct: `percent_off:100`, `duration:'once'` (first interval free
  ⇒ year-1 free on an annual plan, then standard $499 MXN/yr renewal), `max_redemptions:100` (Stripe
  enforces the cap; the 101st is refused), deterministic ids so re-pressing the button can't duplicate.

## Out of scope (v1)
- Any change to the coupon's economics (100% / once / cap 100) — design is signed off, only the plumbing is broken.
- A new generic multi-campaign coupon admin — this is the single `miyagisan` campaign.
- Touching the print-ad platform-coupon system (`/internal/platform-coupons`) — different surface, working.

## Plan — 2 sprints (epic `07-agentic-and-federated-commerce/domain-coupon-mint-fix`)

### Sprint 1 — Diagnose, unmask, harden + test-mode rehearsal
- **S1.1 (FE · low):** Surface the real Stripe error. Mint route returns the specific, **sanitized**
  Stripe message/type (no secrets) instead of the generic line; `findCoupon` distinguishes genuine
  "not found" (→ EMPTY) from an auth/permission/other error (→ surfaced). *Acceptance:* in an env with a
  missing/restricted key, **Crear cupón** shows the real cause (e.g. invalid key / missing permission),
  and **Actualizar** reports the same instead of silently claiming "no existe."
  *QA:* `api` spec mapping a thrown Stripe error → specific response shape; the pure seam is untouched.
- **S1.2 (FE · low):** *Actualizar* always renders a definite state — "Sin cupón en Stripe todavía" /
  "n/100 · activo" / a specific error — never silent. *Acceptance:* every click visibly changes the
  status text or shows a message. *QA:* `api` spec on the GET's discriminated result.
- **S1.3 (ops · HIGH — Daniel):** Confirm the prod cause. Read Vercel prod logs for
  `[admin/domain-coupon] mint failed:` and verify the prod `STRIPE_SECRET_KEY` is present, **live mode**,
  and has coupon + promotion_code write scope. *Output:* the actual root cause written into the
  RETROSPECTIVE; this **gates** the S2 live mint. Likely a config fix (set/replace the prod key), no code.
- **S1.4 (QA rehearsal · HIGH, test-mode — owed to Daniel + agent):** Reconnect Chrome MCP, then in a
  **test-mode** env (preview or local, `sk_test…`): **Crear cupón** mints the test coupon; via Chrome MCP
  redeem `MIYAGISAN` through `/api/sell/shop/domain/subscribe` with test card **4242 4242 4242 4242**.
  Confirm: first invoice **100% off** (year-1 free), the subscription is created on the standard plan so
  the **renewal is the normal $499 MXN/yr**, and the counter ticks **1/100**. Plus an `api` spec asserting
  the cap boundary (redeemable at 99, refused at 100) — the 101st can't be exercised with real checkouts.

### Sprint 2 — Prod live mint + live verify (HIGH · Daniel runs/merges)
- **S2.1 (ops · HIGH):** Apply the S1.3 fix on prod (set the correct live `STRIPE_SECRET_KEY` if that was the cause).
- **S2.2 (action · HIGH):** Press **Crear cupón** on prod (idempotent). Confirm the live
  `custom_domain_campaign_miyagisan` Coupon + `MIYAGISAN` Promotion Code exist on the live platform
  account and the card reads **0/100 · activo**.
- **S2.3 (verify):** Read the live n/100 status. Optionally one **real** redemption owed to Daniel (real
  card, real year-1-free) for end-to-end proof.

## Known boundary — state it honestly
A Stripe **test card cannot redeem a live coupon** (test cards only work in test mode). So S1.4 proves the
**mechanics** in test mode; the **live** coupon (S2) is validated by the **n/100 status read** and,
optionally, one real redemption Daniel chooses to run. The smoke walkthrough will mark the money/auth
steps as owed to Daniel by name.

## Tooling note — Chrome MCP
The Chrome extension is installed + enabled but the MCP got disconnected; it must be reconnected before
S1.4 (the browser checkout smoke). I can wire that up when we reach the smoke — not needed for planning.

## Risk tiers
S1.1 / S1.2 **low** (admin-only UI + error copy → reviewer may merge on green). S1.3, S1.4, and all of
Sprint 2 **high** (prod money creds / checkout / live coupon → **Daniel merges/runs**).

## Open question for Daniel
None blocking. One to confirm at S2: do you want the live coupon minted via the **admin button on prod**
(simplest, idempotent) or via a **one-off script with Secret-Manager creds** (the LEARNINGS run-order
path)? Default: the admin button, since S1 makes it reliable.
