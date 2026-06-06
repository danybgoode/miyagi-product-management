# Retrospective — Checkout on the custom domain (custom-domain-checkout)

**Scope:** S1+S2 shipped to prod; S3 with a green PR awaiting Daniel's merge (on merge → epic COMPLETE).
**Base decision:** pragmatic hop to the platform (no Clerk satellite domains).

## What shipped

**S1 — The hop (PR #12, `dfcb723`, MEDIUM, frontend):** `lib/checkout-hop.ts` (pure client-safe helpers:
no-op on platform, absolute URL to the platform + `origin` on a custom domain). The PDP reads
`x-miyagi-domain` and the buy/sign-in CTAs (from `BuyButton`, `OfferCheckoutButton`, and the server Links)
hop to `miyagisanchez.com` for session + payment. **Result: buying from a custom domain stopped being
broken.**

**S2 — Return to the domain + attribution (PRs FE #13 + BE #3, HIGH):** the backend `start-checkout` ONLY
stores `origin_domain` + `channel:'custom_domain'` in the cart→order metadata (sanitized, doesn't build a
redirect). The platform's success page validates with the new `isVerifiedCustomDomain` (anti-open-redirect
guard) + `onChannel` check (anti-loop) + idempotent `completeMedusaCart`, and redirects the buyer to
`https://<domain>/payment/success`.

**S3 — Domain-branded emails + badge (PR #14, HIGH):** `html()`/`send()` accept a `brand`; the 3 buyer
order-email functions use it. The Stripe webhook resolves the verified domain and brands the email + points
the product link to the domain (auth links stay on the platform). The order mirror carries `channel`;
`OrderDetail` shows the "Own domain" badge.

## What went well
- **The right security architecture emerged from investigating, not planning.** The original plan put the
  `success_url` construction in the backend (open-redirect risk, and the backend can't read Supabase). The
  shift to "backend only stores data; the frontend validates against the verified set and redirects" is
  simpler AND safer. Same pattern reused in S3 for the emails.
- **Reuse:** `getActiveCustomDomain`/`isVerifiedCustomDomain` (lib/custom-domain.ts) + `detectChannel`
  already existed from the own-shop-experience epic.
- **The deterministic gate caught the sweepstakes integration** (merged into both repos mid-build): red CI
  from the sweepstakes spec against my preview → `git merge origin/main` in each repo resolved it. The
  process (branch off main, but CI tests the *merge* with main) worked as intended.

## What we learned / friction
- **The epic touched TWO repos** (frontend + backend in S2) → two PRs, two isolated worktrees, and the
  backend with no preview (Cloud Build us-east4 deploy ~12 min, smoke only post-merge).
- **None of the payment/email flow is testable on preview**: Supabase stubbed (→ `isVerifiedCustomDomain`
  always false), Stripe-signed webhook, external emails. The real verification is Daniel's, live, with a
  verified domain. Gap declared in each PR, not papered over.
- **The new Medusa flow's metadata didn't carry `channel`** (only the legacy routes) → it had to be added
  in the backend (S2) and the order metadata read in the webhook (S3, extending `completeMedusaCart` to
  return it).

## Debt / declared fast-follows
- **MercadoPago parity** for domain-branded emails (its webhook has two flows + two complete helpers; left
  out so as not to destabilize it). Stripe — the dominant rail — is done.
- **Multi-item bundle carts** from a custom domain (the localStorage cart doesn't cross origins) — deferred
  since S1.
- **Native auth on the domain** (Clerk satellite domains) — the pragmatic decision leaves the platform
  visible during payment; the upgrade to 100% native checkout remains a future option.

## Gotchas for the next agent
- The anti-open-redirect guard (`isVerifiedCustomDomain`) is **non-negotiable** at any point that builds a
  redirect/link to the domain from order metadata.
- The badge uses the order's **raw** `channel` (attribution of where the sale was born), not
  `isVerifiedCustomDomain` — on purpose (the email does validate because it builds a live link).
- For live smoke: **you must verify a custom domain first** (none exists in the system; `panuchas.com` was
  cleaned up). Seed a verified `marketplace_shops` row pointed at a domain that resolves to the app, or have
  Daniel verify a real one.
