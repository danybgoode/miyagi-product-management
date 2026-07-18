# UI refresh before launch — Sprint 3: Polish passes — seller portal + checkout

**Status:** 🟨 in progress — both stories built, PR open (`feat/ui-refresh-s3` against
`apps/miyagisanchez`, title: "ui-refresh S3: seller portal + checkout visual polish [3.1 LOW / 3.2
HIGH — Daniel merges]"), **Daniel's merge + money-path smoke owed before merge (HIGH tier — do not
merge on green CI alone)**.

## Stories

### Story 3.1 — Polish pass: seller portal ✅ built, PR open (Daniel's preview review owed)
**As** a seller, **I want** the portal to carry the new feel on the rails foundation, **so that**
the operating experience matches the buyer-facing polish.
Build on `seller-portal-rails-foundation` components; extend `enforcedSweptPaths` per file touched.
**Acceptance:** Daniel preview-approves the dashboard, Catálogo, settings tree spot-set; rails lint +
guards green.
**Risk:** low

**Status:** built on `feat/ui-refresh-s3` (commit `76425a2`). Same mechanical sweep as S2 (bare
`rounded`/`rounded-md/lg/xl/2xl/full` → `--r-*`, literal `fontSize: 15/17` → `--t-base`/`--t-md`), run
across `/shop/manage/*` and `/sell/*` (33 files touched) plus a `bg-white` → `bg-[var(--fg-inverse)]`
zero-diff sweep (10 of those files, including the JSX chrome around `SupportWidgetSection.tsx`'s
iframe preview — the preview's own `srcDoc` HTML string, which needs literal colors per its existing
`allowedLiteralRules` entries, was left untouched). Radius mapping: bare `rounded`/`rounded-md` →
`--r-sm`; `rounded-lg`/`rounded-xl` → `--r-md` (Card's "tile" role); `rounded-2xl` → `--r-lg` (Card's
"panel" role, rail R3); `rounded-full` → `--r-pill`. 9 of the 33 files (5 radius-only, 4
fontSize-only) had zero pre-existing raw-palette debt and are now fully clean — added to
`lib/design-token-audit.ts`'s `enforcedSweptPaths`. The other 24 files still carry pre-existing raw
Tailwind palette classes (status pills, success/error banners, a terminal-style JSON preview) — a
color-*value* redesign out of this token-re-skin sprint's scope, same rationale as
`SubscriptionSection.tsx` in S2.1 — so radius/bg-white were fixed but they're deliberately NOT added
to `enforcedSweptPaths`. No Toast/Banner forks introduced (rail R6 untouched) — rails-compliant by
construction (pure class-attribute substitution, no new feedback primitives).
**Verified pre-PR:** `tsc --noEmit` clean; `npm run build` succeeds, `/` still static;
`design-token-foundation.spec.ts` (19 specs, both new `enforcedSweptPaths` gates) green.
**Owed to Daniel:** the preview walkthrough (dashboard, Catálogo, settings tree spot-set) — no visual
review has happened yet, only the deterministic guards.

### Story 3.2 — Polish pass: checkout flow ✅ built, PR open (Daniel's merge + money-path smoke owed)
**As** a buyer paying, **I want** the checkout to feel as trustworthy as the rest, **so that** the
money moment doesn't look like a different product.
**Money path — HIGH tier: Daniel merges; visual changes only, zero flow/logic changes** (any logic
itch found here becomes a separate seed, not scope creep).
**Acceptance:** visual diff only (flow identical); a full test-card purchase (Stripe 4242) completes on
preview AND prod post-merge; existing checkout specs green.
**Risk:** high — Daniel merges

**Status:** built on `feat/ui-refresh-s3` (commit `6d03c3e`). Strictly class-attribute / inline
`style.fontSize` value swaps, same S1/S2 pattern, across `/checkout` + the payment-step component:
`CheckoutExperience.tsx` (3× `fontSize: 15` → `var(--t-base)` on section headings),
`checkout/page.tsx` (1× same, on the order-summary listing title),
`checkout/bundle/BundleCheckoutClient.tsx` (1× same, on a remove-item icon),
`CheckoutPayButton.tsx` (1× `rounded-xl` → `rounded-[var(--r-md)]` on the pay button — its
provider-conditional background/color/border stay untouched inline styles, only the radius class
moved), and `payment/success/page.tsx` (15× `rounded-xl/lg/full` → `rounded-[var(--r-md)]`/
`rounded-[var(--r-pill)]` across the digital-delivery notice, order-summary cards, CTA links, and the
success/pending status icons — its pre-existing raw `bg-blue-50`/`bg-green-100`/`bg-amber-100` status
colors were deliberately left untouched, same color-value-out-of-scope rationale as 3.1).
`checkout/bundle/page.tsx` was scanned and had zero radius/palette/bg-white/font-size debt — not
touched. None of these 5 files were added to `enforcedSweptPaths` (payment/success/page.tsx still
carries the raw-palette debt noted above).
**Verified pre-PR:** `tsc --noEmit` clean; `npm run build` succeeds, `/` still static;
`design-token-foundation.spec.ts` (19 specs) green; full Playwright `api` project green (2464 passed)
modulo the same 6 pre-existing, unrelated live-network/flag failures (`launchpad-*`,
`not-found-shape`) documented in S2 — every checkout-suite spec passes.
**Owed to Daniel:** the real money-path smoke below — **HIGH tier, do not merge on green CI alone.**

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
