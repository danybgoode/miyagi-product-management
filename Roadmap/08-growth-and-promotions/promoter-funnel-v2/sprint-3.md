# Sprint 3 · The offer — bundle pricing, free-first-year subdomain, 2x1 print ad

> Epic: [Promoter Funnel v2](README.md) · Risk: MED/**HIGH** (entitlements + comped money) —
> HIGH stories **Daniel merges** · Status: 📋 planned
> Backend-first where grants are touched (merge → deploy → seed/config → flip, per LEARNINGS).

## US-3.1 — Bundle + per-SKU promoter pricing config + display *(MED)*
**As** Daniel, **I want** admin-configurable per-SKU promoter prices and a bundle price (discount
biggest on the full bundle, shrinking as items drop), **so that** the landing, handbook, and close
workspace all show "todo esto cuesta $X — con tu promotor $Y" plus the per-item regular-vs-code
comparison, from one config.
**Build note:** extend the promoter settings (Supabase, promoter-scoped state) beyond today's single
`discount_type`/`discount_amount_cents`: per-SKU promoter price + bundle definition. One pure
deriver (`lib/`) computes: per-item comparison rows, bundle total, savings framing ("100% de
descuento" / "GRATIS" for the subdomain year-1 — see US-3.2). Landing (S1.4) + handbook + close
workspace consume it; the discount applied at checkout reads the same config (no drift between what
we advertise and what we charge).
**Acceptance:** admin edits a per-SKU price or the bundle → all three surfaces update without
deploy; checkout discount matches the advertised number; `api` specs on the deriver (bundle >
sum-of-parts savings; shrinking bundle ⇒ shrinking discount; never negative).

## US-3.2 — Subdomain first-year-free via promoter attribution *(HIGH)*
**As** a merchant enrolled through a promoter, **I want** the subdomain free for my first year
(100% off, then the normal $199/yr with a graceful lapse), **so that** signing with a promoter has
an unmistakable perk.
**Build note:** a promoter-attributed subdomain activation mints a **one-year one-time grant** on
the shop's metadata (reuse `lib/subdomain-entitlement*` grant writers + the `isOneTimeGrantLive`
lapse behavior; mirror the `miyagisan` coupon patterns — deterministic/idempotent mint, provider
string-length limits per LEARNINGS). On lapse: subdomain reverts to the 301→`/s/slug` + buy upsell
(existing). Attribution + commission: per epic decision, the subdomain SKU's commission applies per
config; a $0 year-1 means commission (if any) rides the bundle/other SKUs — the deriver must make
this explicit, not implicit.
**Acceptance:** close a merchant with a promoter code incl. subdomain → subdomain serves
immediately, no charge; entitlement shows the year-1 grant + expiry in settings; after expiry
(simulated) the upsell returns; grandfathered/comp shops unaffected; regression specs on the deriver.

## US-3.3 — 2x1 printed ad: pay 1 edition, get 2 *(MED/HIGH)*
**As** a merchant buying a printed ad at close, **I want** to pay one edition and appear in two
consecutive ones, **so that** trying the zine is easy.
**Build note:** **research first** — check how much the existing platform-coupon + submission
machinery covers before building. Target shape: on a 2x1-flagged sale, the approved submission is
cloned into the **next** edition as a comped, promoter-attributed submission (content + placement
tier preserved; re-enters the editorial queue for the new edition). Edge: next edition's deadline
passed / not yet created → **fall back to an admin-manual comp** (a "clonar a la siguiente edición"
admin action is an acceptable v1). Merchant sees both editions in their panel. Commission:
first-payment-only (existing rule) — the comped clone accrues nothing.
**Acceptance:** a 2x1 sale produces a paid submission in edition N and a comped clone in N+1 (or the
documented admin-manual fallback); both visible to the merchant; the clone is excluded from
commission; `api` spec on the clone/comp pure logic.

## Sprint QA
- Deterministic gate green; specs per story.
- **Money-path smokes owed to Daniel:** live promoter-attributed subdomain activation (US-3.2) and a
  real 2x1 print-ad close (US-3.3).

## Sprint 3 — Smoke walkthrough (do these in order)
*(placeholder — fill with real URLs at build time)*
Env: production · https://miyagisanchez.com

1. In /admin/promoter set per-SKU prices + bundle → open /vende/promotor and /promotor/cerrar.
   → Same numbers on both; bundle savings > per-item savings.
2. (money path) Close a test merchant with a promoter code including the subdomain.
   → https://<slug>.miyagisanchez.com serves immediately; settings shows "GRATIS el primer año" +
   expiry; no Stripe charge for the subdomain.
3. (money path) Close a 2x1 printed ad on a test merchant.
   → Edition N submission paid + attributed; edition N+1 has the comped clone in the editorial queue;
   the merchant's panel lists both.
4. Check the commission ledger: the 2x1 clone and the $0 subdomain year accrue no phantom commission.

If any step fails, note the step number + what you saw — that's the bug report.
