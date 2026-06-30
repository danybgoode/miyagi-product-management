# Promoter Program — Sprint 4: In-person close (cash collection + claim handoff + resources)

**Status:** 🟦 READY — not started. US-10 reuses the Sprint 2 money path. Daniel merges HIGH.

| Story | Status | Commit |
|---|---|---|
| US-10 — Paid-by-promoter / cash-collection checkout (attributed + flagged) | ⬜ | |
| US-11 — WhatsApp claim handoff (gem-claim reuse) | ⬜ | |
| US-12 — Promoter resources mini-site + sell-sheet (es-MX) | ⬜ | |
| api spec (`e2e/promoter-close.spec.ts`) | ⬜ | |

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
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

1. As promoter "PROMO-TEST", set up a new unclaimed shop for a test merchant and add one listing.
   → The shop renders at `https://miyagisanchez.com/s/<test-shop>` as unclaimed/claimable.
2. Start the paid-by-promoter checkout for the subdomain/custom-domain SKU and pay with your own Stripe
   test card `4242…`, choosing "cobré en efectivo / pago a nombre del comerciante".
   → Order completes, flagged **paid-by-promoter**, attributed to PROMO-TEST; entitlement lands on the
   **test merchant's** shop, not the promoter's.
3. Open the admin → the sale shows under PROMO-TEST and a pending commission accrued (S3).
   → Amounts + attribution correct.
4. Generate the WhatsApp claim link and open it in a private window; complete the claim as the merchant.
   → Ownership transfers; the merchant sees the shop under `/shop/manage`; PROMO-TEST attribution intact.
5. Open the promoter resources mini-site under `/vende/...`.
   → Glossary + pricing + pitch render in es-MX; the printable sell-sheet view loads.

If any step fails, note the step number + what you saw — that's the bug report.
**Money/auth path:** steps 2 (live card charge on a seller's behalf) and 4 (Clerk claim transfer) are
**owed to Daniel**.
