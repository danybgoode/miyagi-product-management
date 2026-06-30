# Retrospective · Promoter Program (08, HIGH)

**Shipped:** 2026-06-30, 4 sprints, all merged to `main`. Live behind `promoter.enabled` (ON in prod,
Flagsmith id 220525). Risk HIGH — Daniel merged every sprint.

| Sprint | PR | Squash | What |
|---|---|---|---|
| S1 — promoter spine | [#138](https://github.com/danybgoode/miyagisanchezcommerce/pull/138) | `1cea2cb` | code + discount preview + attribution (mirror of the referral spine, `PRM-` namespace) |
| S2 — one-time cadence | [#140](https://github.com/danybgoode/miyagisanchezcommerce/pull/140) | `7d47222` | the money change: a dated one-time grant (Stripe `mode:payment`) + a real billed coupon |
| S3 — commission ledger | [#141](https://github.com/danybgoode/miyagisanchezcommerce/pull/141) | `fff04ca` | per-SKU %, first-payment-only, eager accrual on `markAttributionPaid`, offline settlement |
| S4 — in-person close | [#143](https://github.com/danybgoode/miyagisanchezcommerce/pull/143) | `e1ba7ad` | paid-by-promoter checkout + WhatsApp claim handoff + resources mini-site |

## What shipped (the motion, end to end)
A commission-paid promoter walks into a business, stands the shop up on Miyagi **for** the owner
(`/promotor/cerrar` → `shop/setup` mints an unclaimed seller + a first listing), **closes the sale in
person** — even when the merchant pays cash — by charging the SKU on the merchant's behalf with their own
card (`close/domain` / `close/print`, flagged paid-by-promoter, attributed to their `PRM-` code), and hands
off with a one-tap **WhatsApp claim link**. The discount their code unlocks is a real billed coupon; the
commission accrues (first-payment-only) and is settled offline. Everything else — attribution, the one-time
cadence, the entitlement seam, the gem-claim transfer, the seller-acquisition landing infra — was **reuse**.

## What went well
- **The reuse thesis held.** Each sprint was mostly wiring existing seams: S1 mirrored `lib/referrals.ts`;
  S2 extended the custom-domain checkout/entitlement rather than building a parallel payment path; S4 reused
  the gem-claim loop (`/internal/sellers` + `/api/claim/complete`) and the seller-acquisition landing shell
  wholesale. S4 was **frontend-only — no Medusa change, no migration** — because S2 had already made the
  one-time grant a dated metadata write and the print path already existed.
- **The decouple was already latent.** The single hardest-looking S4 requirement — a promoter paying for a
  shop they don't own — turned out to need almost no new plumbing: `startCustomDomainCheckout` and the
  webhook already grant to `shop_id` from metadata, decoupled from the payer. Only the *routes* hardcoded
  "own shop". The fix was a new route that supplies the **target** shop, plus a `paidByPromoter` provenance
  flag. Exploring the existing seams before planning paid for itself.
- **Pure seams kept the gate cheap.** `lib/promoter.ts`, `lib/promoter-commission.ts`, `lib/promoter-skus.ts`,
  `lib/promoter-close.ts` are all next-free, so the api spec covers code-gen, discount math, accrual
  decisions, the wa.me builder, and the idempotent source URL with zero network.
- **Cross-review earned its keep on the money path.** Codex flagged a genuine blocking bug on S4 (an
  unchecked final write that returned `ok:true` after the promoter may have paid) — exactly the
  "check the write result" class the epic has hit before.

## What we learned (promoted to LEARNINGS)
- **Decouple payer from grantee at the seam, not the route.** When "X acts on behalf of Y" lands on an
  existing money path, check whether the *builder + webhook* already separate actor from beneficiary (ours
  did, via metadata `shop_id`) — then the only new work is a route that supplies the target + a provenance
  flag. Don't fork the checkout.
- **A flag-gated route must gate auth BEFORE any config/secret check, or it 500s on preview.** `claim/link`
  and `shop/setup` checked a prod-only secret (`CLAIM_JWT_SECRET` / `MEDUSA_INTERNAL_SECRET`, unset on the
  preview env) *before* the auth check, so an anonymous guard request got **500, not 401** — red CI. Order is
  **flag → auth → config-secret**. (Pairs with the S3 learning that a shared-Flagsmith flip also flips the
  preview eval — assert `[401,404]`, both states.)
- **The raw-color guard bites brand-new client islands, and only CI catches it.** A WhatsApp-green
  `#25D366` button + a `#c00` error fallback in a fresh client island, plus a print sell-sheet's literal
  `@media print` hexes, passed local tsc/build but failed the design-token guard on the preview. Reuse the
  existing tokens (`--provider-whatsapp`, `--danger`, `--fg-inverse`); add genuine print surfaces to
  `guardExcludedFiles` (same rationale as email/print-export).

## Gaps / owed
- **Money/auth browser smokes owed to Daniel** (an automated browser smoke can't cover a real card or a
  second Clerk identity): S4 step 2 (live card charge on a seller's behalf → grant on the merchant's shop,
  no subscription, commission accrues) + step 4 (real Clerk claim transfer). Plus the S2 one-time
  money-path smoke and the S3 dashboard/settlement render smoke, all in their `sprint-N.md`.
- **Recurring custom-domain still doesn't thread `promoter_id`** (S2 wired only `one_time`), so
  first-payment-only-on-renewal is proven by the pure simulated-renewal test, not a live recurring sale.
- **Settlement is offline (cash/transfer) by design** — no in-app payout. That's the
  `billing-cadence-monthly-recurring` fast-follow's neighbour, not this epic.

## Fast-follows seeded
`subdomain-pricing` (subdomains are free today) · `ml-sync-port` (spike → feature; the glossary already
sells "conexión Mercado Libre") · `billing-cadence-monthly-recurring`.
