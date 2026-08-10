---
title: "US marketplace — /us is the finished product, same as /mx"
slug: us-marketplace
status: scaffolded
area: "07"
type: feature
priority: next
appetite: L
underwritten_by: null
risk: high
epic: us-marketplace
build_order: 1
updated: 2026-08-10
---

# Pitch — US marketplace: `/us` is the finished product

## The ask

**As a US merchant, I want** to open a shop and sell in USD **so that** I get everything a Mexican
merchant already gets. **As a US buyer, I want** to browse and buy at `/us` in English **so that**
Miyagi Sánchez is a real marketplace in my country, not an invitation page.

This is the **final product for the United States**, not a pilot, cohort, proof or curated collection.
`/us` becomes what `/mx` already is: an open multi-seller marketplace where anyone can open a shop,
list anything, and sell with no commission. The only differences are currency (USD), language (en-US)
and the fulfillment/payment rails a US seller actually uses.

## Why now, and what replaced what

Four documents previously stood between here and this outcome — `#US-2` recruit a founding operator,
`#US-3` prove three shops with one real order, `#US-4` publish that proof, `#US-5` open a curated
collection behind a 15-shop/150-listing admission gate. That was a validation ladder built for a
platform with real merchants to lose. Miyagi has none yet, so each rung produced work that the next
rung overwrote. The product owner ended the sequence on 2026-08-10:
`us-operator-commerce-pilot`, `us-proof-launch` and the `us-curated-marketplace` seed are archived;
`miyagi-partners-recruiting-v3` shipped and closed. This is their single replacement.

Two things from that work carry forward intact and are cited rather than rebuilt: the **market
architecture** (`market-architecture-foundation`, `owned-shop-operating-channel`) which already
separates market / locale / Region / Sales Channel correctly, and the **partner identity + grants**
rails from `#US-2`, which remain the multi-operator story — just no longer behind a curated funnel.

## Product decisions

1. **Open enrollment.** Any merchant may open a US shop through ordinary signup, exactly as in Mexico.
   No admission review, no appeal workflow, no revalidation, no readiness threshold, no launch gate.
2. **No feature flag.** Per `WAYS-OF-WORKING.md` → *Feature flags*, this epic scopes none. `/us` opens
   when the code that opens it merges. A bad merge is reverted with `git revert`.
3. **Seller of record is the seller.** US checkout uses Stripe Connect **direct charges**; the merchant
   is merchant of record and the tax-liable party. Miyagi takes no commission, matching Mexico.
4. **No tax engine in this epic.** The seller sets their own rates or absorbs tax. A calculated-tax
   provider (Stripe Tax / TaxJar) is a separate later decision, not a blocker on opening.
5. **English across buyer and seller.** Both the buyer surface and the seller portal render in en-US
   for a US shop. This is the largest single piece of work in the epic — 264 component files currently
   hardcode Spanish and `locales/{es,en}.json` cover only 8 top-level keys.
6. **Shipping opens on arranged + manual carrier**, which need no provider account and no funding. A
   real US carrier integration (EasyPost or Shippo) is the last sprint of this same epic, not a
   deferred maybe.
7. **One seller per cart**, as in Mexico. No cross-seller or cross-country cart.
8. **MX is never a fallback.** Every US read resolves US resources or returns a named unavailable
   state. The registry's fail-closed contract is preserved byte-for-byte.

## What already exists — reuse, do not rebuild

| Primitive | Reuse |
|---|---|
| `lib/markets.ts` (both repos, byte-identical + 2 golden specs) | Flip `us.marketplace_status` `invitation` → `active`. One field, four files, no new concepts |
| `lib/market-medusa.ts` (both repos) | `REGION_ENV_VARS.us` / `CHANNEL_ENV_VARS.us` are deliberately empty tables. Fill them; the three-state resolution seam is already correct |
| `src/lib/seller-market.ts` | The canonical `metadata.operating_market` reader/writer. No migration, no second country field |
| `src/scripts/provision-mx-operating-channel.ts`, `api/internal/setup-mexico` | The proven survey-before-write provisioning shape. Mirror it for US |
| `app/(shell)/mx/{l,s}` route tree | Parameterize to `[market]`; do not clone a second route tree or a second design system |
| `lib/market-catalog.ts`, `lib/listings.ts`, `lib/owned-market.ts` | Fail-closed market reads and strict currency price selection already work — extend the one seam |
| `payment-stripe-connect` module | Add a USD direct-charge path beside the existing destination-charge flow; do not change currency on the MX path |
| Arranged delivery + manual carrier (`shipping.arranged_only_enabled`, Correos pattern) | The zero-dependency US fulfillment path for day one |
| `locales/{es,en}.json` + the bilingual allow-list gate | The dictionary mechanism is right; it needs to grow from 8 keys to full coverage |
| Partner identity, `partner_grants`, `/partner` (shipped `#US-2`) | Multi-shop operators keep working. Program track is descriptive only; grants remain the sole authorization |
| UCP catalog / MCP tools / manifest | `market=us` becomes available through the same contracts, echoing `market_code` |
| Medusa Region, Sales Channel, Stock Location, Fulfillment modules | Native primitives. No shadow tables, no custom catalog |

## Out of scope

- A calculated sales-tax engine, marketplace-facilitator filing, or any accounting/bookkeeping claim.
- Cross-seller or cross-country carts, combined shipping, escrow, platform-funded refunds or a
  purchase-protection program.
- A curated collection, admission review, seller certification, badges or a public seller directory.
- A US-specific design system, second component library or native app.
- Paid acquisition, outbound automation, referral economics or US-specific growth loops.
- Changing anything about how `/mx` behaves. Every sprint proves the MX negation.

## Risks

| Risk | Mitigation |
|---|---|
| Translating 264 files silently changes Spanish copy | Extraction is mechanical and gated: the es-MX copy-completeness CI guard already exists and must stay green throughout |
| Parameterizing `(shell)/mx` to `[market]` breaks live MX routes | MX route/SEO/sitemap regression specs run every sprint; `/mx` URLs must not change |
| USD direct charges diverge from the MX destination-charge flow | One shared checkout seam with a per-market charge strategy, not a forked checkout |
| A US read silently serves MX rows | The registry fail-closed contract and both golden specs are the guard; add a population meta-test for `/us` |
| Stripe Connect US onboarding requirements differ from MX | Verified against the live Stripe account during the architecture lock, before the checkout sprint starts |
