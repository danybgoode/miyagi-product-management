# Custom-domain paywall + campaign coupon — Retrospective

_Sprints 1 + 2 shipped & live: 2026-06-11. Sprint 3 (coupon + agent surface) not yet started — epic stays open._

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

## What went well
- **Medusa-first held.** Entitlement is *derived*, not a parallel boolean — the subscription module is the
  truth, the grant is just an additive marker on existing `metadata` (zero migrations across both sprints).
- **The pure-seam + thin-composer split** gave full unit coverage of every entitlement branch in the `api`
  gate (no auth/network), and kept `server-only`/Flagsmith out of the testable module.
- **Fail-open polarity** meant the whole thing shipped dark behind an off-by-default flag — merged days
  before activation with zero prod risk, then turned on deliberately after the seed.
- **Fresh-agent review on a green gate** caught the right things (money-path focus) in one pass; nits were
  doc/ops, not correctness.

## What we learned
_(Promoted to `Roadmap/LEARNINGS.md` — see there for the durable one-liners.)_
- A flag defined in code still has to be **created in Flagsmith** to be toggled; absent ⇒ reads return the
  code default. An **enablement** flag is the inverse polarity of a kill-switch (default off ⇒ ungated).
- Seed/activate prod money infra with **Secret Manager live creds**, not local `.env` (which is test-mode +
  localhost). Run order is load-bearing: **backend merge → deploy → seed → flip flag**.
- When your branch is **behind main**, the two-dot `git diff main..HEAD` shows the inverse of main's newer
  commits (looked like nav-reorg files were "deleted"); review the **three-dot** `main...HEAD` and merge main in.

## Gaps / follow-ups
- **Sprint 3 not started** (fresh session): coupon `miyagisan` (100% off year 1, cap 100) + graceful
  no-card lapse + UCP/MCP agent access. **Until S3 there is no free-first-year path** — the live paywall is
  straight $499 MXN/yr. If the World-Cup giveaway is time-sensitive, prioritize S3.
- **Carryover nits** (recorded in `sprint-3.md`): webhook `tg.alert` on a paid-but-ungated activation
  failure (money-path safety); assert canonical origin in the buy route.
- **Owed to Daniel (browser smokes, can't automate):** a live seller-session run of the 402 + upsell, a
  real subscribe → entitlement-on → connect, and (S2) a lapse → revert-to-free.
