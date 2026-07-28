# Owed ledger — manual verification still outstanding

> **GENERATED — do not hand-edit.** `node scripts/owed-ledger.mjs`.
> Re-derived from the spec tree on every run, never from a maintained list.

_Generated: 2026-07-28_

**82 check(s) owed across 76 spec file(s).**

| Category | Count | What it means |
|---|---|---|
| money-path | 16 | Touches checkout, payment or order state — run these first |
| auth-path | 14 | Needs a real signed-in session a script cannot mint against production |
| admin-only | 4 | Behind an admin surface |
| other | 48 | Everything the rules could not confidently place — **not a bin, a to-triage list** |

## money-path (16)

- `apps/miyagisanchez/e2e/about-acerca.browser.spec.ts:4` — Anonymous browser smoke for the `/acerca` about page (no auth, no money — NOT owed to Daniel).
- `apps/miyagisanchez/e2e/catalog-bulk-apply-suggested-price.spec.ts:17` — PDP + the ML-linked listing both update) is owed to Daniel per the
- `apps/miyagisanchez/e2e/checkout-cp-first.browser.spec.ts:15` — whose seller offers Envía shipping). The live confirmation is owed to Daniel.
- `apps/miyagisanchez/e2e/event-hero.spec.ts:10` — the purchase + QR after payment are a money/auth path owed to Daniel.
- `apps/miyagisanchez/e2e/manual-payment-report.spec.ts:10` — show the reported state) is the browser smoke owed to Daniel (real sessions +
- `apps/miyagisanchez/e2e/mcp-configured-checkout.spec.ts:9` — artwork URL and a real payment, is owed to Daniel per sprint-4.md).
- `apps/miyagisanchez/e2e/mcp-order-read.spec.ts:11` — — that's owed to Daniel, same fixture gap `agent-connector.spec.ts` notes.
- `apps/miyagisanchez/e2e/onboarding-cobros-wizard.spec.ts:11` — real MP OAuth round-trip itself is owed to Daniel (money/auth).
- `apps/miyagisanchez/e2e/orders-bulk-status.spec.ts:7` — that live check is owed to Daniel. This asserts the proxy is Clerk-gated
- `apps/miyagisanchez/e2e/promoter-cadence.spec.ts:36` — NOT covered (owed to Daniel): a real one-time Stripe charge + confirming no
- `apps/miyagisanchez/e2e/refund-transition-api.spec.ts:7` — owed to Daniel (see sprint-1.md).
- `apps/miyagisanchez/e2e/rental-checkout.spec.ts:12` — smoke is owed to Daniel (flag is OFF in prod) — see sprint-2.md.
- `apps/miyagisanchez/e2e/shop-settings-money-sections.browser.spec.ts:14` — save, domain add/verify, agent-token issue/revoke) are owed to Daniel — see the
- `apps/miyagisanchez/e2e/subdomain-checkout.spec.ts:40` — NOT covered (owed to Daniel): a real yearly Stripe charge → white-label serves,
- `apps/miyagisanchez/e2e/subdomain-monthly.spec.ts:41` — NOT covered (owed to Daniel): a real $25/mo Stripe charge → white-label serves, a
- `apps/miyagisanchez/e2e/subdomain-pricing.spec.ts:25` — NOT covered here (owed to Daniel — sprint-1.md smoke walkthrough): the live 301

## auth-path (14)

- `apps/miyagisanchez/e2e/admin-audit.spec.ts:13` — inserts a row with my Clerk id/email" check is owed to Daniel (admin session).
- `apps/miyagisanchez/e2e/admin-featured.spec.ts:9` — session (it mutates Medusa product metadata) and is owed to Daniel.
- `apps/miyagisanchez/e2e/admin-flags-api.spec.ts:10` — must ALSO 401. The authed 200-upsert + audit render is owed to Daniel (sprint smoke).
- `apps/miyagisanchez/e2e/admin-tenant-entitlement.spec.ts:20` — admin Clerk session and are owed to Daniel (stated in the PR + sprint smoke).
- `apps/miyagisanchez/e2e/admin-tenants-api.spec.ts:8` — session and is owed to Daniel (stated in the PR + sprint smoke).
- `apps/miyagisanchez/e2e/cuenta-search.browser.spec.ts:11` — affordance). The authed Cuenta-menu open stays owed to Daniel.
- `apps/miyagisanchez/e2e/home-auth-leakage.spec.ts:12` — false-pass on a `*.vercel.app` preview (LEARNINGS) — that eyeball is owed to Daniel
- `apps/miyagisanchez/e2e/ml-resilience-gate.spec.ts:26` — The revoke-token re-auth + entitlement browser smokes are owed to Daniel (sprint-5.md).
- `apps/miyagisanchez/e2e/partner-grants.spec.ts:59` — itself — that requires a real authed seller session (owed to Daniel,
- `apps/miyagisanchez/e2e/pdp-redesign.browser.spec.ts:13` — The authed pending-offer bar state is OWED TO DANIEL (needs a buyer session with a
- `apps/miyagisanchez/e2e/pickup-appointment-api.spec.ts:7` — trip is the authed browser smoke owed to Daniel (see sprint-2.md).
- `apps/miyagisanchez/e2e/promoter-private-preview.spec.ts:23` — NOT covered here (owed to Daniel — sprint-1.md smoke): the authed promoter
- `apps/miyagisanchez/e2e/shop-settings-sections.browser.spec.ts:16` — + dev Clerk keys + MS_TEST_SELLER_EMAIL. The live save round-trips are owed to Daniel.
- `apps/miyagisanchez/e2e/tenant-intake-api.spec.ts:9` — (a real Clerk session) is owed to Daniel per the Sprint 1 smoke

## admin-only (4)

- `apps/miyagisanchez/e2e/admin-announcements-api.spec.ts:10` — + live-render round-trip is owed to Daniel (sprint smoke).
- `apps/miyagisanchez/e2e/admin-content-overrides-api.spec.ts:11` — round-trip is owed to Daniel (sprint smoke).
- `apps/miyagisanchez/e2e/admin-seleccion.browser.spec.ts:10` — The full pin → drag → homepage-reflects flow is owed to Daniel on prod.
- `apps/miyagisanchez/e2e/promoter-commission.spec.ts:22` — NOT covered (owed to Daniel — sprint-3.md smoke): the dashboard + admin settlement

## other (48)

- `apps/miyagisanchez/e2e/agent-connector.spec.ts:19` — NOT covered (owed to Daniel — sprint-2.md smoke walkthrough steps 2–4): the live
- `apps/miyagisanchez/e2e/agent-prompt.browser.spec.ts:14` — owed to Daniel.
- `apps/miyagisanchez/e2e/buyer-telegram-api.spec.ts:8` — row-safety, and a delivered Telegram message are owed to Daniel (need a real
- `apps/miyagisanchez/e2e/catalog-bulk.spec.ts:13` — mid-preview persistence, idempotent re-apply) is owed to Daniel per the
- `apps/miyagisanchez/e2e/conversation-ledger-api.spec.ts:12` — (owed to Daniel) — stated in the PR.
- `apps/miyagisanchez/e2e/cross-channel-trust.browser.spec.ts:18` — there. The live custom-domain + subdomain cosmetic look is owed to Daniel.
- `apps/miyagisanchez/e2e/custom-domain-paywall.spec.ts:31` — NOT covered here (owed to Daniel — sprint-1.md smoke walkthrough): the live
- `apps/miyagisanchez/e2e/custom-domain-paywall.spec.ts:133` — anonymously). Live card purchase is owed to Daniel (sprint-2.md smoke).
- `apps/miyagisanchez/e2e/custom-domain-paywall.spec.ts:173` — NOT covered here (owed to Daniel — sprint-3.md smoke): the live coupon
- `apps/miyagisanchez/e2e/domain-coupon.spec.ts:29` — NOT covered here (owed to Daniel — sprint-1.md smoke walkthrough): the live
- `apps/miyagisanchez/e2e/growth-track-api.spec.ts:9` — 200-skipped / 202-forwarded paths are owed to Daniel (Sprint 1 smoke —
- `apps/miyagisanchez/e2e/home-announcement.spec.ts:9` — persists, no layout shift" round-trip is owed to Daniel (sprint smoke walkthrough),
- `apps/miyagisanchez/e2e/home-personalization.browser.spec.ts:17` — confirm hydration on prod. The real signed-in eyeball is therefore owed to Daniel
- `apps/miyagisanchez/e2e/merchant-commerce-facts.spec.ts:27` — transition" claim needs a real database and is owed to Daniel as a browser/
- `apps/miyagisanchez/e2e/migrations-estimate.spec.ts:20` — only; the real DB round-trip is owed to Daniel, per convention).
- `apps/miyagisanchez/e2e/migrations-mapper.spec.ts:23` — live-Shopify-domain pull + parity-report eyeball is owed to Daniel. See
- `apps/miyagisanchez/e2e/migrations-parity.spec.ts:10` — pull + parity-report eyeball is owed to Daniel. See sprint-1.md.
- `apps/miyagisanchez/e2e/ml-connect.spec.ts:13` — The real ML-sandbox OAuth round-trip + encrypted-storage smoke is owed to Daniel
- `apps/miyagisanchez/e2e/ml-import.spec.ts:20` — The real ML-sandbox import smoke (render + dedupe re-run) is owed to Daniel.
- `apps/miyagisanchez/e2e/ml-publish.spec.ts:18` — The real ML-sandbox publish+edit+close smoke is owed to Daniel. See sprint-3.md.
- `apps/miyagisanchez/e2e/ml-stock-sync.spec.ts:29` — OWED TO DANIEL (correctness/oversell path — real ML sandbox, sprint-4.md smoke):
- `apps/miyagisanchez/e2e/ml-sync-monetization.spec.ts:30` — owed to Daniel — see sprint-6.md.
- `apps/miyagisanchez/e2e/nav-entry-points.browser.spec.ts:10` — The signed-in "Publicar" → /sell and PWA-standalone checks stay owed to Daniel.
- `apps/miyagisanchez/e2e/notification-preferences-api.spec.ts:10` — (owed to Daniel) — stated in the PR.
- `apps/miyagisanchez/e2e/panfleto-rename-alias.spec.ts:13` — `own-shop-seo.spec.ts`'s "positive path owed to Daniel" pattern, except
- `apps/miyagisanchez/e2e/partner-grants.spec.ts:11` — NOT covered here (owed to Daniel — sprint-2.md smoke walkthrough): the real
- `apps/miyagisanchez/e2e/pdp-gallery.browser.spec.ts:16` — live custom-domain/subdomain white-label look stays owed to Daniel.
- `apps/miyagisanchez/e2e/print-studio-api.spec.ts:21` — are set as env — until then it skips with a clear reason (owed to Daniel,
- `apps/miyagisanchez/e2e/promoter-cadence.spec.ts:34` — assertion) is owed to Daniel — see sprint-2.md.
- `apps/miyagisanchez/e2e/promoter-close-migration.spec.ts:12` — (a real quote closed, cash + net-remittance variants) is owed to Daniel —
- `apps/miyagisanchez/e2e/promoter-close.spec.ts:22` — NOT covered (owed to Daniel — sprint-4.md smoke): the live card charge on a
- `apps/miyagisanchez/e2e/promoter-close.spec.ts:164` — NOT covered here (owed to Daniel — sprint-1.md smoke walkthrough, and the
- `apps/miyagisanchez/e2e/promoter-landing-mobile.browser.spec.ts:8` — on-screen-keyboard viewport, safe-area insets) stay owed to Daniel.
- `apps/miyagisanchez/e2e/promoter-program.spec.ts:28` — NOT covered (owed to Daniel — sprint-1.md smoke walkthrough): the live discount
- `apps/miyagisanchez/e2e/promoter-transfer.spec.ts:25` — NOT covered (owed to Daniel — sprint-4.md smoke): a real transfer → approve →
- `apps/miyagisanchez/e2e/relationship-consent.spec.ts:121` — database — the route-level DB read is owed to Daniel (no two-promoter,
- `apps/miyagisanchez/e2e/relationship-operating-views.spec.ts:11` — NOT covered here (owed to Daniel — sprint-2.md's smoke walkthrough): the
- `apps/miyagisanchez/e2e/relationship-reconciliation-routes.spec.ts:10` — NOT covered here (owed to Daniel — sprint-3.md's smoke walkthrough steps
- `apps/miyagisanchez/e2e/relationship-stewardship.spec.ts:13` — NOT covered here (owed to Daniel — sprint-2.md's smoke walkthrough): the
- `apps/miyagisanchez/e2e/scorecard-endpoint-routes.spec.ts:18` — are owed to Daniel as the Sprint 1 smoke walkthrough (step 2).
- `apps/miyagisanchez/e2e/seller-acquisition-mobile.browser.spec.ts:7` — insets) still evade headless viewport checks and stay owed to Daniel (see sprint-4.md walkthrough).
- `apps/miyagisanchez/e2e/seller-mode.spec.ts:95` — sprint's stated "owed to Daniel" browser smokes (sprint-6.md);
- `apps/miyagisanchez/e2e/seller-unclaimed-s3.browser.spec.ts:18` — Until that fixture exists the 375px sub-nav check is owed to Daniel.
- `apps/miyagisanchez/e2e/shop-ping.spec.ts:7` — The live Telegram send is owed to Daniel; this asserts the deterministic seam
- `apps/miyagisanchez/e2e/shop-settings-returns.browser.spec.ts:17` — MS_TEST_SELLER_EMAIL. The live save round-trip is owed to Daniel.
- `apps/miyagisanchez/e2e/shop-settings-returns.browser.spec.ts:49` — The save CTA is present (the round-trip itself is owed to Daniel).
- `apps/miyagisanchez/e2e/tabbar.browser.spec.ts:14` — the PWA-only Favoritos dedup, and the device glass look stay owed to Daniel.
- `apps/miyagisanchez/e2e/ucp-rental-quote.spec.ts:117` — No rental listing exists in prod yet (owed to Daniel, same gap S1/S2 already

