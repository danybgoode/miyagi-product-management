# UI refresh before launch — Sprint 3: Polish passes — seller portal + checkout

**Status:** ⬜ not started

## Stories

### Story 3.1 — Polish pass: seller portal
**As** a seller, **I want** the portal to carry the new feel on the rails foundation, **so that**
the operating experience matches the buyer-facing polish.
Build on `seller-portal-rails-foundation` components; extend `enforcedSweptPaths` per file touched.
**Acceptance:** Daniel preview-approves the dashboard, Catálogo, settings tree spot-set; rails lint +
guards green.
**Risk:** low

### Story 3.2 — Polish pass: checkout flow
**As** a buyer paying, **I want** the checkout to feel as trustworthy as the rest, **so that** the
money moment doesn't look like a different product.
**Money path — HIGH tier: Daniel merges; visual changes only, zero flow/logic changes** (any logic
itch found here becomes a separate seed, not scope creep).
**Acceptance:** visual diff only (flow identical); a full test-card purchase (Stripe 4242) completes on
preview AND prod post-merge; existing checkout specs green.
**Risk:** high — Daniel merges

## Sprint QA
- **api spec(s):** existing checkout + rails suites (no new logic ⇒ no new spec; observed-green on the untouched flows)
- **browser smoke owed:** yes, to Daniel — the full money-path purchase below (automated smoke can't cover it)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 3 — Smoke walkthrough (do these in order)
Env: branch preview, then production · https://miyagisanchez.com

1. Open /shop/manage (dashboard, Catálogo, Envíos) as your seller account.
   → New feel, same structure; nothing moved, everything restyled.
2. (money path — owed to Daniel) Add an item to cart → checkout as guest → pay with Stripe test card 4242….
   → Flow steps identical to before the refresh; confirmation email arrives; order appears in the seller portal.
3. Repeat step 2 on a subdomain shop.
   → Channel parity holds through checkout.

If any step fails, note the step number + what you saw — that's the bug report.
