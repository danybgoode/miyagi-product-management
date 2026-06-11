# Custom-domain paywall + campaign coupon — Retrospective

_✅ EPIC COMPLETE — all 3 sprints shipped 2026-06-11. S1+S2 live (FE #79 `f0b524a` · BE #20 `0f68fbe`);
S3 merged (FE #82 squash `4bc0e4a`, frontend-only)._

## What shipped
- **S1 — Gate + entitlement (PR #79 `f0b524a`).** Custom-domain connection became a premium SKU. One pure
  seam `lib/domain-entitlement.ts` (`deriveDomainEntitlement` + `readDomainGrant`) + the
  `lib/domain-entitlement-server.ts` composer derive entitlement for every connect/provision route AND the
  Canal UI. **402 on all four connect/provision mutations** (`POST /domain`, `POST /domain/cloudflare`,
  OAuth `start` + `callback`) when the flag is on and the shop isn't entitled; DELETE stays ungated (escape
  hatch). Entitlement = flag-off / durable `marketplace_shops.metadata.custom_domain_grant`
  (grandfather|comp) / active subscription. Fail-open enablement flag `domain.paywall_enabled` (default
  off). Grandfather backfill (`scripts/backfill-domain-grandfather.mjs`) — ran on prod, **no-op (0 domains)**.
- **S2 — Paid checkout + lapse (FE in #79 `f0b524a`; BE #20 `0f68fbe` → `medusa-web-00099-vv7`).** Buy the
  custom-domain subscription on the **platform** Stripe account ($499 MXN/yr); the Stripe webhook activates
  it (idempotent on `stripe_subscription_id`) and lapse reverts entitlement **without destroying the grant**
  (`past_due` is a grace window). Medusa subscriptions module is the source of truth (`lib/domain-subscription.ts`
  bridges via internal-secret routes). Pricing published on `/acerca` (`lib/domain-pricing.ts`, single-sourced).
  Cutover: `seed-custom-domain-plan.mjs` created the live Stripe product/price + Medusa plan; flag flipped ON.
- **S3 — Campaign coupon + agent surface (FE #82 `4bc0e4a`, frontend-only).** Coupon `miyagisan` = a Stripe
  **Coupon** (`percent_off:100, duration:once, max_redemptions:100`) + Promotion Code `MIYAGISAN` on the
  platform account; Stripe enforces the cap (101st refused). Pure `lib/domain-coupon.ts` (matching ·
  `couponRedeemable`/`couponRefusalReason` · `formatRedemptionCount` `n/100`) + server
  `lib/domain-coupon-server.ts` (idempotent ensure/status/resolve via deterministic ids). A shared
  `lib/domain-subscription-checkout.ts` (`startCustomDomainCheckout`) is the ONE checkout path for the buy
  route **and** the agent MCP tool — applies the promo via `discounts:[{promotion_code}]` +
  `payment_method_collection:'if_required'` so a $0 first invoice collects **no card** (⇒ the existing S2.2
  lapse handles the no-card year-end with no new code). Admin mint + live `n/100` counter on
  `/admin/coupons` (secret-gated `/api/admin/domain-coupon`). Two shop-scoped seller MCP tools
  (`get_domain_entitlement`, `start_domain_subscription`) + a `seller_domain_subscription` manifest
  capability. The two S1/S2 carryover nits landed here (webhook `tg.alert` on paid-but-ungated; canonical
  origin in the buy route).

## What went well
- **Medusa-first held.** Entitlement is *derived*, not a parallel boolean — the subscription module is the
  truth, the grant is just an additive marker on existing `metadata` (zero migrations across both sprints).
- **The pure-seam + thin-composer split** gave full unit coverage of every entitlement branch in the `api`
  gate (no auth/network), and kept `server-only`/Flagsmith out of the testable module.
- **Fail-open polarity** meant the whole thing shipped dark behind an off-by-default flag — merged days
  before activation with zero prod risk, then turned on deliberately after the seed.
- **Fresh-agent review on a green gate** caught the right things (money-path focus) in one pass; nits were
  doc/ops, not correctness. (S3 review confirmed cap-of-100, $0-first-year mechanics, scoping, and reuse —
  the one folded nit was es-MX copy.)
- **S3 came out frontend-only** because reading the S2 webhook first showed a $0-first-invoice subscription
  fires the same `checkout.session.completed` it already handles — no backend change for the coupon. Reading
  the backend route + webhook *before* scoping re-sized the sprint.
- **One shared `startCustomDomainCheckout` builder** made AGENTS rule #3 (agent reachability) a ~30-line
  reuse instead of a parallel implementation — the buy route and the MCP tool can't drift on coupon/refusal/
  collection logic because there's one path.

## What we learned
_(Promoted to `Roadmap/LEARNINGS.md` — see there for the durable one-liners.)_
- A flag defined in code still has to be **created in Flagsmith** to be toggled; absent ⇒ reads return the
  code default. An **enablement** flag is the inverse polarity of a kill-switch (default off ⇒ ungated).
- Seed/activate prod money infra with **Secret Manager live creds**, not local `.env` (which is test-mode +
  localhost). Run order is load-bearing: **backend merge → deploy → seed → flip flag**.
- When your branch is **behind main**, the two-dot `git diff main..HEAD` shows the inverse of main's newer
  commits (looked like nav-reorg files were "deleted"); review the **three-dot** `main...HEAD` and merge main in.
- **(S3) Stripe SDK v22 nests the promotion-code coupon under `promotion:{type:'coupon',coupon}`** (read +
  create), not top-level — `tsc` caught it. **Stripe's `max_redemptions` is the authoritative cap**; the
  pure pre-check is only a clean es-MX message. **`payment_method_collection:'if_required'`** is the lever
  that makes a 100%-off year a real gift (no card collected) and lets the existing lapse path cover year-end.
- **(S3) A "best-effort" money-path POST needs a status check, not just a try/catch** — the webhook's Medusa
  activation never checked `res.ok`, so a failed activation wouldn't reach the `catch`/alert.

## Gaps / follow-ups
- **Owed to Daniel (live, can't automate):** mint the coupon (`POST /api/admin/domain-coupon?secret=…` or the
  `/admin/coupons` "Crear cupón" button — runs with prod Stripe creds), then the money-path browser smoke:
  redeem `miyagisan` → $0 first-year subscription → connect a domain → admin counter +1 → cancel → graceful
  lapse. Plus the still-owed S1/S2 seller-session smokes (402 + upsell; subscribe → connect; lapse → revert).
- **Deferred (by decision):** MercadoPago recurring for this SKU (Stripe only for v1); proration /
  multi-domain per shop; year-2 dunning beyond `past_due → lapse`.
