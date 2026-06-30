# Promoter Program — Sprint 2: One-time payment cadence (the core money change)

**Status:** ✅ **MERGED `7d47222` (#140, squash)** on 2026-06-30 — full CI gate green (tsc + build +
Playwright `api` vs preview) + Codex cross-review applied. **HIGH (payments) — Daniel-authorized merge;
live money-path smoke still owed to Daniel.** Behind `promoter.enabled` (**off** — whole sprint dark)
+ the existing `domain.paywall_enabled`.

| Story | Status | Commit (squashed into `7d47222`) |
|---|---|---|
| US-4 — One-time cadence for custom domain (+ graceful year-end lapse) | ✅ | `d2c98a7` |
| US-5 — One-time cadence for printed ad | ✅ | `d8241fb` |
| US-6 — Cadence selectable over UCP/MCP | ✅ | `2bdc2c7` |
| api spec (`e2e/promoter-cadence.spec.ts`) | ✅ | `be8b5e1` |
| anti-monolith extract + flag-gate cadence + cross-review hardening | ✅ | `7131f9b` · `562ea67` · `2521bc1` |

**Cross-review (Codex) applied (`2521bc1`):** the one-time grant write now verifies the shop exists +
the update matched a row (was a silent 0-row-write money hazard); the lapse fn bails on a missing shop;
the destructive sweep cron fails **closed** in production when `CRON_SECRET` is unset. Declined nit:
`buildOneTimeGrant` month-rollover (≤1-day drift at a 1-year expiry is immaterial; lapse is graceful).

**Flag posture:** `promoter.enabled` stays **OFF** until launch — with it off the cadence selector is
hidden and a crafted `one_time` request is refused, so S2 is fully dark (recurring-only as today). Flip
it **ON in Production** only to run the smoke below (that same switch is the public launch toggle).

> Goal: a cash-paying merchant can **pay a year up front with no recurring mandate**. Adds a one-time
> cadence alongside today's recurring SKUs — the enabler for the in-person cash close (Sprint 4).

## Architecture decisions (Daniel-approved at plan time)
1. **Cadence = a dated one-time GRANT**, not a Medusa record. `lib/domain-entitlement.ts` gained a
   `one_time` grant type (`{ type:'one_time', granted_at, expires_at }`) on
   `marketplace_shops.metadata.custom_domain_grant`; `deriveDomainEntitlement` honors it only while
   `now < expires_at` (**lapse on read** — graceful, no auto-charge, no cron to flip a flag). One-time
   checkout is Stripe `mode:'payment'` with inline `price_data` (`createOneTimeCheckout`) — **no Stripe
   subscription / upcoming invoice is ever created.** ⇒ **No new Medusa plan and no migration** — so S2
   is effectively **frontend-only** (the epic's "backend-first" framing was predicated on the *other*
   fork and does not bite here). The one shared seam `startCustomDomainCheckout` gained a `cadence` param
   so the subscribe route **and** the MCP tool can't drift.
2. **Promoter discount is a REAL billed coupon** (answers S1's "Medusa owns commerce" cross-review).
   Custom-domain → a deterministic, amount-keyed **Stripe** coupon (`promoterCouponKey` + name ≤ 40 chars,
   mirroring `lib/domain-coupon-server.ts`). Print-ad → a reusable **Medusa platform** coupon via the
   existing `/internal/platform-coupons` (no backend change). The discount is computed **server-side**
   from the admin settings — never a client-sent amount.

**Lapse teardown:** entitlement lapses on read (above); the physical Vercel/Supabase disconnect is a
daily **expiry sweep** (`/api/cron/domain-lapse-sweep` → `sweepExpiredOneTimeGrants`) reusing the same
`releaseCustomDomainForShop` the recurring-cancel webhook uses (extracted to `lib/domain-lapse-server.ts`).

**Scope notes (stated honestly):** US-5 wires the promoter discount + attribution on the **card** print-ad
path; **manual/cash** print-ad attribution lands in **S4** (the cash-collection close). US-6 lands the
cadence on the **MCP `start_domain_subscription` tool + manifest** (the domain SKU's actual agent surface);
`POST /api/ucp/checkout-session` is the buyer-listing payment-method surface, not the domain SKU, so it is
left unchanged.

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
- **api spec(s):** `e2e/promoter-cadence.spec.ts` (api, 21 pure tests green locally) — one-time grant
  dates + lapse-on-read + precedence (US-4); the `cadence→Stripe-mode` map asserting `one_time → 'payment'`
  i.e. **no subscription object** (US-4/6); the deterministic promoter coupon key, `name ≤ 40` (US-4/5);
  the buy-route auth guard; the manifest advertising both cadences (US-6, vs the CI preview).
- **browser smoke owed:** **YES, to Daniel — live money path.** A real one-time custom-domain purchase
  with a Stripe test card, confirming entitlement + the promoter discount + **no recurring charge** in Stripe.
- **deterministic gate:** `tsc --noEmit` ✅ + `npm run build` ✅ + Playwright `api` ✅ (pure layer green
  locally; route/manifest guards green vs the CI preview).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge).
**Pre-reqs:** `promoter.enabled` flipped **ON** in Flagsmith Production (id 220525); the test seller's
shop is **NOT** domain-entitled (no grant / no active subscription) so the upsell renders; a promoter set
up in `/admin/promoter` with a discount (e.g. Monto fijo $100).

1. As the test seller, open **Configuración → Canal propio**. In "¿Te atendió un promotor?" enter the
   `PRM-XXXXXX` code (discount preview shows), pick **"Pagar un año (pago único, sin renovación)"** under
   **Forma de pago**, then click **Activar dominio propio →**.
   → A one-time Stripe checkout opens with **the promoter discount applied** and **no "se renueva" language**.
2. Pay with a Stripe test card `4242 4242 4242 4242`.  *(owed — real Stripe charge)*
   → Entitlement activates; the domain connect form unlocks. In `/admin/promoter → Atribuciones` the row
     for this shop flips to **paid** with the real amount + cadence `one_time`.
3. Open the Stripe dashboard for the platform account.  *(owed)*
   → A **one-time** payment exists with the promoter **coupon/discount** applied; **no subscription / no
     upcoming invoice** was created.
4. (lapse) Force the grant's `expires_at` to the past (admin/script) and reload Canal → entitlement reads
   **lapsed**, the reactivate prompt shows, and **no new charge** is attempted. Then trigger the daily
   sweep `GET /api/cron/domain-lapse-sweep` (Bearer `CRON_SECRET`) → the domain disconnects gracefully
   (the free URL + subdomain stay live).  *(owed)*
5. (agent) Call MCP `start_domain_subscription` with `{ "cadence": "one_time" }` (shop agent token).
   → Returns a Stripe checkout URL noting "pago único … sin renovación"; mirrors steps 1–3. `GET
     /api/ucp/manifest` lists **both** cadences on `seller_domain_subscription`.

If any step fails, note the step number + what you saw — that's the bug report.
**Money/auth path:** steps 2–4 are the live-money path → **owed to Daniel** (an automated browser smoke
can't fully cover a real Stripe charge + the no-recurring assertion). Steps 1 + 5 need a real Clerk
seller session / shop agent token a headless smoke can't hold.
