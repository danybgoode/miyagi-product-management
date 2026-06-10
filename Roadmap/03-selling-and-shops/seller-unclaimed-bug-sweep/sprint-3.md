# Seller & unclaimed-shop bug sweep — Sprint 3: shop/manage UI polish

**Status:** ✅ BUILT 2026-06-10 — [PR #76](https://github.com/danybgoode/miyagisanchezcommerce/pull/76), CI pending · **Risk:** LOW (frontend CSS/tokens; reviewer may auto-merge on green CI) · **Repos:** frontend only

> **Commits (branch `feat/seller-unclaimed-bug-sweep-s3` off main `dc4c992`):** `d26a654` (S3.1+S3.2 UI
> fixes) · `848815a` (regression guard + browser smoke). Gate green locally: `tsc` ✓ · `build` ✓ ·
> `design-token-foundation.spec.ts` api 8/8 ✓.

> Root cause (verified 2026-06-10): (4) the "+ Nuevo anuncio" button
> (`app/shop/manage/ManageDashboard.tsx:424-429`) uses ad-hoc arbitrary-value utilities
> `bg-[var(--accent)] text-[var(--fg-inverse)]`; the tokens are correct (green / `#ffffff`) and
> `.btn-primary` uses the same pair successfully, so the arbitrary-value text colour isn't applying
> (globals.css already manually patches one such case). Same pattern in 5 files. (5) the sub-nav strip
> (`ManageDashboard.tsx:327-415`) is a `flex` with ~12 links + `·` separators, **no wrap, no overflow
> scroll** → clips on mobile.

## Stories

### Story 3.1 — Legible accent buttons (the 5 occurrences) ✅ `d26a654`
**As a** seller, **I want** the "+ Nuevo anuncio" button (and its siblings) to show its white label on
green, **so that** I can actually read the primary action.
**Build:** replace `bg-[var(--accent)] text-[var(--fg-inverse)]` (+ `hover:bg-[var(--accent-hover)]`) with
the design-system `.btn .btn-primary` class in: `app/sell/setup/SetupClient.tsx`,
`app/shop/manage/ManageDashboard.tsx`, `app/shop/manage/import/ImportClient.tsx`,
`app/s/[slug]/claim/page.tsx`, `app/account/referrals/ReferralsClient.tsx`.
**Acceptance:** the white label is visible on green on https://miyagisanchez.com/shop/manage and the 4
sibling surfaces; the contrast guard stays green.
**Risk:** LOW.

### Story 3.2 — Responsive manage sub-nav ✅ `d26a654`
**As a** seller on a phone, **I want** the manage sub-nav not to clip, **so that** every section is
reachable.
**Build:** make the strip responsive — a single-row horizontal scroll (`overflow-x-auto whitespace-nowrap`,
hidden scrollbar) is preferred over `flex-wrap`; builder picks the cleaner against the design system.
**Acceptance:** at 375px width every nav item (Ver tienda pública → Importar catálogo) is reachable, with
no horizontal overflow of the page itself.
**Risk:** LOW.

## Sprint QA
- **api spec ✅:** extended `e2e/design-token-foundation.spec.ts` with the new pure
  `findInvisibleAccentButtonOffenders` guard (`lib/design-token-audit.ts`) — flags any line co-locating
  `bg-[var(--accent)]` with an untyped `text-[var(--fg-inverse)]` (exactly this defect). Real-tree
  assertion green + negative fixture red-on-violation. The existing "Inverse text on accent" contrast-pair
  audit (≥4.5) is unchanged. **8/8 pass.**
- **browser smoke ✅ (`e2e/seller-unclaimed-s3.browser.spec.ts`):** *anonymous* claim-page CTA legibility
  (near-white label, distinct from green fill) — the one public surface among the five; *authed* 375px
  sub-nav reachability on `/shop/manage` (skips without `MS_TEST_BROWSER_AUTH` + `MS_TEST_SELLER_EMAIL`).
  > **Honest scope note:** `/shop/manage`, `/sell/setup`, `/shop/manage/import`, `/account/referrals` are
  > **auth-gated**, so the "anonymous sub-nav at 375px" the sprint originally imagined isn't reachable
  > without a login. Button legibility across all five files is locked by the deterministic guard +
  > contrast audit (no browser needed); the 375px sub-nav visual is **owed to Daniel** (authed) until the
  > `MS_TEST_*` seller fixtures exist.
- **deterministic gate ✅:** `tsc --noEmit` clean · `npm run build` passes · Playwright `api` green.
- **Built as:** buttons/CTAs → `.btn .btn-primary` (8 sites across the 5 files); non-button chips/badges
  (the "Reclamada" chip + 3 circular step badges) → typed `text-[color:var(--fg-inverse)]`.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL pre-merge)

**Anonymous — no login (covered by `seller-unclaimed-s3.browser.spec.ts`):**
1. Open a **claimed** shop's public claim page: https://miyagisanchez.com/s/<slug>/claim
   → The "Ir a mi panel de ventas →" button shows a **white** label on green (legible), and the
     "Reclamada" chip's text is white on green — neither is green-on-green.

**Owed to Daniel — authed seller session (`/shop/manage` etc. are behind login):**
2. Sign in as a seller and open https://miyagisanchez.com/shop/manage
   → The "+ Nuevo anuncio" button shows **white** text on green — clearly legible.
3. Check the other accent buttons: https://miyagisanchez.com/sell/setup ,
   https://miyagisanchez.com/shop/manage/import , and https://miyagisanchez.com/account/referrals
   → Each primary button's label is legible (no green-on-green).
4. On a phone (or a 375px-wide window), reload https://miyagisanchez.com/shop/manage
   → The sub-nav strip under the shop name (Ver tienda pública · Pedidos · Ofertas · … · Importar
     catálogo) **scrolls horizontally** so every item is reachable; the page itself doesn't scroll sideways.
   *(This step lights up automatically once `MS_TEST_BROWSER_AUTH=1` + `MS_TEST_SELLER_EMAIL` repo secrets
   exist — the authed spec then replaces this hand-run.)*

If any step fails, note the step number + what you saw — that's the bug report.
