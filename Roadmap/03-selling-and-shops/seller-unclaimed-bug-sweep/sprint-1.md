# Seller & unclaimed-shop bug sweep — Sprint 1: Unclaimed shops are contact-only

**Status:** ⬜ not started · **Risk:** HIGH (money-path; Daniel merges) · **Repos:** frontend only

> Root cause (verified 2026-06-10): the PDP's `isClaimed` (`app/l/[id]/page.tsx:96`) only recognises the
> legacy `pending:` placeholder, so a gem shop (`clerk_user_id = null`) reads as *claimed* and the whole
> CTA tree renders. And `POST /api/offers` emails the buyer unconditionally but only notifies the seller
> `if (shopRow.clerk_user_id)` → unclaimed = buyer gets "offer sent", shop gets nothing. The correct
> predicate already exists at `checkout-session/route.ts:231` — extract + reuse it.

## Stories

### Story 1.1 — Unclaimed PDP is contact-only
**As a** buyer viewing a listing from an unclaimed ("Sin reclamar") shop, **I want** to see direct-contact
options and a "Reclama esta tienda" prompt instead of Buy / Make-offer / Add-to-cart / Bundle, **so that**
I don't start a transaction the shop can't receive.
**Build:** extract `lib/claim.ts → isShopClaimed(shop)` (pure: `!!clerk_user_id && !startsWith('pending:')`);
repoint the PDP `isClaimed` to it. The existing `showBuyerActions`/`showBuyButtons` gate cascades to all
CTAs. Surface WhatsApp/phone/email (when published) + the claim CTA for the unclaimed case.
**Acceptance:** on a known unclaimed listing, no Buy/Offer/Add-to-cart/Bundle render; contact options +
"Reclama esta tienda" do. A claimed listing is unchanged.
**Risk:** HIGH.

### Story 1.2 — Offers API rejects unclaimed shops (no silent email)
**As an** agent or buyer, **I want** an offer to an unclaimed shop to be rejected with a clear message,
**so that** no misleading "offer sent" email goes out and nothing dies silently.
**Build:** gate `POST /api/offers` on `isShopClaimed` **before** any insert or email; return 4xx with
es-MX copy ("Esta tienda aún no está reclamada — contáctala directamente").
**Acceptance:** POST an offer to an unclaimed shop → 4xx, no `marketplace_offers` row, **no buyer email**;
claimed shop path unchanged.
**Risk:** HIGH (money-adjacent).

### Story 1.3 — Cart-add / bundle server-gate
**As a** buyer, **I want** add-to-cart and bundle against an unclaimed shop blocked server-side too,
**so that** the browser isn't the only thing stopping it (agents/UCP included).
**Build:** gate the cart/add path on `isShopClaimed`; regression-lock the already-correct
`checkout-session` reject so it can't drift.
**Acceptance:** cart-add to an unclaimed listing → rejected; `checkout-session` for an unclaimed shop →
still rejected (locked by spec).
**Risk:** HIGH.

## Sprint QA
- **api spec(s):** `e2e/unclaimed-guardrails.spec.ts` — pure-logic on `isShopClaimed` (claimed vs `null`
  vs `pending:`); `POST /api/offers` unclaimed → 4xx + no side effects, claimed → ok; cart-add +
  checkout-session unclaimed → rejected.
- **browser smoke owed:** S1.1 covered by an **anonymous** `browser` smoke (no CTAs render on a known
  unclaimed listing — no login needed). Live "offer email truly doesn't fire" confirmation = Daniel.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL pre-merge)

1. Open an unclaimed shop's listing, e.g. https://miyagisanchez.com/s/pulqueria-las-duelistas-nxwy
   (any shop showing the amber "Sin reclamar" badge) and click into one of its listings.
   → You see direct-contact options and a "Reclama esta tienda" prompt. There is **no** "Comprar ahora",
     no "Hacer oferta", no "Agregar al carrito", and no bundle section.
2. On that same listing, attempt to make an offer (if any offer affordance is still reachable via deep
   link / agent). **(money-path — owed to Daniel)**
   → The attempt is rejected with "Esta tienda aún no está reclamada…"; you receive **no** "oferta
     enviada" email.
3. Open a normal **claimed** shop's listing (e.g. any verified shop) and confirm Buy / Make-offer /
   Add-to-cart all still render and work as before.
   → No regression on claimed shops.

If any step fails, note the step number + what you saw — that's the bug report.
