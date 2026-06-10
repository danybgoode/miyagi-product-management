# Seller & unclaimed-shop bug sweep — Sprint 1: Unclaimed shops are contact-only

**Status:** ✅ built — draft [PR #73](https://github.com/danybgoode/miyagisanchezcommerce/pull/73), awaiting Daniel merge (HIGH) · **Risk:** HIGH (money-path; Daniel merges) · **Repos:** frontend only

> **Built 2026-06-10** on `feat/seller-unclaimed-bug-sweep` (isolated worktree — a
> parallel agent yanked the shared frontend worktree to `feat/shop-settings-refactor-s4`
> mid-build; commits were intact on-branch, recovered via `git worktree add`).
> Deterministic gate green: `tsc --noEmit` ✓ · `npm run build` ✓ (exit 0) · Playwright
> `api` `unclaimed-guardrails` ✓ (3 pure `isShopClaimed` cases + anonymous
> `POST /api/offers` → 401; fixture-gated checkout-session case skips until
> `MS_TEST_UNCLAIMED_LISTING_ID` is set). Commits: S1.1 `230737e` · S1.2 `bc21ae2` ·
> S1.3 `ddec65b` · QA `1e7beed`.
>
> **Key reuse win:** the existing `SellerTrustCard` already renders contact options +
> the "Reclamar" claim nudge when `!isClaimed`, and the PDP already dual-renders it —
> so S1.1 was a one-line predicate fix (`lib/claim.ts isShopClaimed`), no new UI.
>
> **Fresh-reviewer pass (different agent) → APPROVE-with-nits, all addressed `e78401b`:**
> - **[blocker] caught + fixed:** `app/checkout/page.tsx` still keyed its redirect guard
>   off the OLD `shop.id` predicate — and `/checkout` is **directly URL-reachable** (the
>   deep-link target of `checkoutHopHref`/`signInHopHref`), so an authed buyer could land
>   on checkout for an ownerless shop. Repointed to the shared `isShopClaimed`. This is the
>   load-bearing last-line money-path guard — the PDP just stops *linking* gem shops here.
> - **[nit] fixed:** folded the two remaining correct-but-inline copies (`lib/ucp/schema.ts`
>   `toUcpListing`, `app/api/ucp/mcp/route.ts` shop profile) onto `isShopClaimed` — predicate
>   now has a single source of truth (4 consumers: PDP, offers, checkout-session, **checkout
>   page**, plus the 2 UCP read surfaces) and can't drift back into the bug.
> - **[note] owed to Daniel:** `bank_transfer` (SPEI) in `checkout-session` is **not**
>   claim-gated (pre-existing). Contact-first by nature, but there's no one to confirm a
>   transfer on an ownerless shop — worth a follow-up decision (not in this frontend sprint).

> Root cause (verified 2026-06-10): the PDP's `isClaimed` (`app/l/[id]/page.tsx:96`) only recognises the
> legacy `pending:` placeholder, so a gem shop (`clerk_user_id = null`) reads as *claimed* and the whole
> CTA tree renders. And `POST /api/offers` emails the buyer unconditionally but only notifies the seller
> `if (shopRow.clerk_user_id)` → unclaimed = buyer gets "offer sent", shop gets nothing. The correct
> predicate already exists at `checkout-session/route.ts:231` — extract + reuse it.

## Stories

### Story 1.1 — Unclaimed PDP is contact-only · ✅ `230737e`
**As a** buyer viewing a listing from an unclaimed ("Sin reclamar") shop, **I want** to see direct-contact
options and a "Reclama esta tienda" prompt instead of Buy / Make-offer / Add-to-cart / Bundle, **so that**
I don't start a transaction the shop can't receive.
**Build:** extract `lib/claim.ts → isShopClaimed(shop)` (pure: `!!clerk_user_id && !startsWith('pending:')`);
repoint the PDP `isClaimed` to it. The existing `showBuyerActions`/`showBuyButtons` gate cascades to all
CTAs. Surface WhatsApp/phone/email (when published) + the claim CTA for the unclaimed case.
**Acceptance:** on a known unclaimed listing, no Buy/Offer/Add-to-cart/Bundle render; contact options +
"Reclama esta tienda" do. A claimed listing is unchanged.
**Risk:** HIGH.

### Story 1.2 — Offers API rejects unclaimed shops (no silent email) · ✅ `bc21ae2`
**As an** agent or buyer, **I want** an offer to an unclaimed shop to be rejected with a clear message,
**so that** no misleading "offer sent" email goes out and nothing dies silently.
**Build:** gate `POST /api/offers` on `isShopClaimed` **before** any insert or email; return 4xx with
es-MX copy ("Esta tienda aún no está reclamada — contáctala directamente").
**Acceptance:** POST an offer to an unclaimed shop → 4xx, no `marketplace_offers` row, **no buyer email**;
claimed shop path unchanged.
**Risk:** HIGH (money-adjacent).

### Story 1.3 — Cart-add / bundle server-gate · ✅ `ddec65b`
**As a** buyer, **I want** add-to-cart and bundle against an unclaimed shop blocked server-side too,
**so that** the browser isn't the only thing stopping it (agents/UCP included).
**Build:** gate the cart/add path on `isShopClaimed`; regression-lock the already-correct
`checkout-session` reject so it can't drift.
**Acceptance:** cart-add to an unclaimed listing → rejected; `checkout-session` for an unclaimed shop →
still rejected (locked by spec).
**Risk:** HIGH.
**Implementation reality (verified):** there is **no separate frontend `/api/cart` server route** —
`lib/cart.ts startCheckout` posts to Medusa directly and is only reachable from the PDP buy/bundle
buttons, which S1.1's gate cascade already hides for unclaimed shops. The agent-reachable server seam is
`/api/ucp/checkout-session`, which already required `isClaimed` for every payable method and set
`reason_unavailable`; S1.3 repoints it to the shared `isShopClaimed` (one source of truth) and
regression-locks it. The Medusa **backend `start-checkout`** hardening is S2/out of this frontend-only
sprint's scope per the epic deploy plan.

## Sprint QA
- **api spec ✅ `e2e/unclaimed-guardrails.spec.ts`** (`1e7beed`) — always-on pure-logic lock on
  `isShopClaimed` (claimed / `null` / `undefined` / `pending:` / empty); `POST /api/offers` anonymous
  → 401 (the claim gate never turns a clean auth reject into a 500); fixture-gated `checkout-session`
  case (`MS_TEST_UNCLAIMED_LISTING_ID`) → no claim-dependent payable method + `reason_unavailable`,
  skips cleanly when the fixture is unset.
  - *Note:* the api project runs **unauthenticated**, and the offers POST is Clerk-gated, so the authed
    "unclaimed → 409 + **no** marketplace_offers row + **no** buyer email" path is owed to Daniel (he
    holds the buyer session + mailbox). The pure `isShopClaimed` lock covers the predicate every seam
    shares.
- **browser smoke ✅ (anonymous) `e2e/unclaimed-pdp.browser.spec.ts`** (`1e7beed`) — on a known
  unclaimed listing: the claim nudge renders but no `Comprar ahora` / `Hacer oferta` / `Arma un paquete`
  CTAs do. Self-skips if the fixture isn't actually unclaimed (no "Reclamar" nudge). Lights up in
  nightly/opt-in CI once `MS_TEST_UNCLAIMED_LISTING_ID` is set.
- **deterministic gate (local, 2026-06-10):** `tsc --noEmit` ✓ · `npm run build` ✓ (exit 0) · Playwright
  `api` `unclaimed-guardrails` ✓ (4 active / 1 fixture-skipped). CI runs the full `api` suite vs the
  branch preview (bypass token) — the authoritative pre-merge signal.

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
