# Promoter Program — Sprint 4: In-person close (cash collection + claim handoff + resources)

**Status:** 🏗️ BUILT — draft PR open, green gate (tsc + build + api specs). US-10
+ US-11 are HIGH → **Daniel merges**; the money/auth smokes (steps 2 + 4 below) are
**owed to Daniel**. Branch `feat/promoter-program` off `main` (`fff04ca`).

| Story | Status | Commit |
|---|---|---|
| US-11 — WhatsApp claim handoff (gem-claim reuse) + authed close workspace | ✅ built | `84248e6` |
| US-10 — Paid-by-promoter / cash-collection checkout (attributed + flagged) | ✅ built | `5dadf08` |
| US-12 — Promoter resources mini-site + sell-sheet (es-MX) | ✅ built | `8827c6b` |
| api spec (`e2e/promoter-close.spec.ts`) | ✅ built | (this PR) |

### How it was built (reuse map)
- **Authed close workspace** `/promotor/cerrar` (Clerk- + `promoter.enabled`-gated) — a
  bound promoter (`POST /api/promoter/me/bind` stamps `promoters.clerk_user_id`) drives
  bind → setup → close → hand off. The unauthed `/promotor/[code]` dashboard is untouched.
- **US-11** — `POST /api/promoter/shop/setup` mints an UNCLAIMED Medusa seller
  (gem-claim `POST /internal/sellers` + `ensureUnclaimedShopMirror`) + enrolls the
  attribution against the mirror id (survives the claim). `POST /api/promoter/claim/link`
  signs the 24h claim token (like `/api/claim/send`) and returns a `wa.me` link; the
  existing `/api/claim/complete` transfers ownership (flips `clerk_user_id` only).
- **US-10** — the key mechanic is **decoupling payer (promoter) from grantee (target
  shop)**. `startCustomDomainCheckout` gained `paidByPromoter` (stamps `paid_by_promoter`
  on the one-time session); the webhook now needs only `shop_id` (empty `seller_clerk_id`
  for an unclaimed shop) + records the paid-by-promoter grant note.
  `POST /api/promoter/close/{domain,print}` charge on the merchant's behalf; the admin
  manual-confirm PATCH now accrues commission for cash-reported print ads (closes the S2
  cash gap). Entitlement + commission land on the **seller's** shop; the charge is the
  promoter's card. Self-checkout routes unchanged.
- **US-12** — `/vende/promotor` (standalone, no 6th `SellerPersonaId`) reuses
  `SellerAcquisitionPage` + a bespoke `buildPromoterPageConfig`; `/vende/promotor/sell-sheet`
  reuses the admin print `@media print` idiom. es-MX copy in `locales/{es,en}.json`
  `sellerAcquisition.promotor`, rendered `getDictionary('es')` only (rule #5).

> Goal: the promoter leaves the shop having **fully onboarded a tenant** and **closed the sale** — even
> when the merchant pays cash — then hands off with a WhatsApp claim link. Plus the in-shop sell-sheet.

## Stories

### US-10 — Paid-by-promoter / cash-collection checkout
**As a** promoter, **I want** to check out for the seller with my own card after taking cash, **so that**
cash-only merchants can still buy. The sale is **attributed to my code** and **flagged paid-by-promoter**
(distinct from seller-self-checkout). Reuse the print-ad **`payment-reported`** manual-pay pattern for a
**cash-reported** variant, and the Sprint 2 one-time checkout for the actual card charge.
**Acceptance:** a promoter completes a one-time SKU checkout on the seller's behalf; the order is flagged
paid-by-promoter + attributed to the promoter; entitlement is granted to the **seller's** shop (not the
promoter); commission accrues to the promoter (S3). A normal seller-self-checkout is unaffected.
**Risk:** high (money + attribution)

### US-11 — WhatsApp claim handoff
**As a** promoter, **I want** to set the shop up as unclaimed and hand the seller a WhatsApp claim link,
**so that** the handoff is one tap. Reuse Gem-Claim Loop: the promoter creates/sets up the shop
(unclaimed, nullable `seller.clerk_user_id`), generates a claim link, the seller taps it →
`POST /api/claim/complete` transfers the shop to their Clerk identity.
**Acceptance:** a promoter-created unclaimed shop renders at `/s/[slug]`; the claim link transfers
ownership to the seller's account; the seller then sees it under `/shop/manage`. The promoter's
attribution/commission survives the claim.
**Risk:** med (claim path)

### US-12 — Promoter resources mini-site + sell-sheet (es-MX)
**As a** promoter, **I want** a resources mini-site + printable sell-sheet, **so that** I can explain and
sell in the shop. Content on the seller-acquisition landing infra (`app/(shell)/vende/**`,
`locales/es.json`): the **glossary** (printed ad, custom domain, subdomain, ML add-on), pricing, the
discount pitch, and a step-by-step "set it up + hand off" guide. es-MX (rule #5).
**Acceptance:** the mini-site renders the glossary + pricing + pitch; copy is es-MX complete (no orphan
strings); a printable sell-sheet view exists.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/promoter-close.spec.ts` (api) — paid-by-promoter order is flagged + attributed +
  entitlement lands on the seller's shop, not the promoter's (US-10); claim transfers ownership and
  preserves attribution (US-11). Mini-site is build + visual (US-12).
- **browser smoke owed:** **YES, to Daniel — live money + auth.** US-10 (promoter card charge on seller's
  behalf) and US-11 (real Clerk claim transfer).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge).
Pre-req: a promoter row exists in `/admin/promoter` (note its `PRM-…` code); `promoter.enabled` is ON.

0. Log into the workspace at `https://miyagisanchez.com/promotor/cerrar`. Enter your `PRM-…` code on the
   bind screen.
   → The four-step workspace (montar → cobrar → entregar) appears, headed by your code.
1. In step 1 "Montar la tienda", enter a test merchant name (e.g. "Café Smoke") and create the shop.
   → A green ✅ shows the shop + a `/s/<slug>` link; opening it renders the shop as **Sin reclamar**
     (claimable, contact-only) at `https://miyagisanchez.com/s/<slug>`.
2. **[OWED TO DANIEL — money]** In step 2, tap "Pagar dominio propio (1 año)". Pay with a Stripe test card
   `4242 4242 4242 4242`.
   → Checkout completes (Stripe `mode:payment`, **no subscription / no upcoming invoice**); the success
     page returns to `/shop/manage/settings/canal?domain=activated`. Entitlement lands on the **test
     merchant's** shop (the grant note reads `one-time S4 paid-by-promoter`), not the promoter's.
3. Open `/admin/promoter` (or the read-only `/promotor/<PRM-code>` dashboard).
   → The sale shows under your code; a **pending commission** accrued for `custom_domain` at the configured
     %. Amounts + attribution correct.
4. **[OWED TO DANIEL — auth]** In step 3 "Entregar por WhatsApp", tap "Generar enlace de reclamo", open the
   `wa.me` link, follow the claim URL in a **private window**, and complete the claim signed in as the
   merchant (a different Clerk account).
   → Ownership transfers; the merchant sees the shop under `https://miyagisanchez.com/shop/manage`; the
     "Sin reclamar" badge is gone; your attribution + the accrued commission are intact.
5. (Optional, print-ad path) From step 2's print variant, buy a printed-ad placement on the merchant's
   behalf choosing "efectivo" (cash-reported). Then in `/admin/print`, confirm the placement paid.
   → The submission flips to paid; a `print_ad` commission accrues under your code (the admin manual-confirm
     now accrues for promoter-sold cash ads).
6. Open `https://miyagisanchez.com/vende/promotor` and its sell-sheet at `/vende/promotor/sell-sheet`.
   → Glossary (dominio propio / subdominio / anuncio impreso / conexión ML) + pricing + pitch render in
     es-MX; the printable sell-sheet loads and prints clean (⌘P hides the site chrome).

If any step fails, note the step number + what you saw — that's the bug report.
**Money/auth path:** step 2 (live card charge on a seller's behalf) and step 4 (Clerk claim transfer) are
**owed to Daniel** — an automated browser smoke can't cover a real card or a second Clerk identity.
