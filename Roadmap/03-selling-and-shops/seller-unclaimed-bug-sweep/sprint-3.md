# Seller & unclaimed-shop bug sweep — Sprint 3: shop/manage UI polish

**Status:** ⬜ not started · **Risk:** LOW (frontend CSS/tokens; reviewer may auto-merge on green CI) · **Repos:** frontend only

> Root cause (verified 2026-06-10): (4) the "+ Nuevo anuncio" button
> (`app/shop/manage/ManageDashboard.tsx:424-429`) uses ad-hoc arbitrary-value utilities
> `bg-[var(--accent)] text-[var(--fg-inverse)]`; the tokens are correct (green / `#ffffff`) and
> `.btn-primary` uses the same pair successfully, so the arbitrary-value text colour isn't applying
> (globals.css already manually patches one such case). Same pattern in 5 files. (5) the sub-nav strip
> (`ManageDashboard.tsx:327-415`) is a `flex` with ~12 links + `·` separators, **no wrap, no overflow
> scroll** → clips on mobile.

## Stories

### Story 3.1 — Legible accent buttons (the 5 occurrences)
**As a** seller, **I want** the "+ Nuevo anuncio" button (and its siblings) to show its white label on
green, **so that** I can actually read the primary action.
**Build:** replace `bg-[var(--accent)] text-[var(--fg-inverse)]` (+ `hover:bg-[var(--accent-hover)]`) with
the design-system `.btn .btn-primary` class in: `app/sell/setup/SetupClient.tsx`,
`app/shop/manage/ManageDashboard.tsx`, `app/shop/manage/import/ImportClient.tsx`,
`app/s/[slug]/claim/page.tsx`, `app/account/referrals/ReferralsClient.tsx`.
**Acceptance:** the white label is visible on green on https://miyagisanchez.com/shop/manage and the 4
sibling surfaces; the contrast guard stays green.
**Risk:** LOW.

### Story 3.2 — Responsive manage sub-nav
**As a** seller on a phone, **I want** the manage sub-nav not to clip, **so that** every section is
reachable.
**Build:** make the strip responsive — a single-row horizontal scroll (`overflow-x-auto whitespace-nowrap`,
hidden scrollbar) is preferred over `flex-wrap`; builder picks the cleaner against the design system.
**Acceptance:** at 375px width every nav item (Ver tienda pública → Importar catálogo) is reachable, with
no horizontal overflow of the page itself.
**Risk:** LOW.

## Sprint QA
- **api spec(s):** extend `e2e/design-token-foundation.spec.ts` — assert the accent CTA pairs to a legible
  foreground / no new raw-hex; (optionally) a guard that the 5 files no longer use the broken arbitrary
  pair.
- **browser smoke owed:** anonymous `browser` smoke — button label visible at desktop width; sub-nav
  reachable at a 375px viewport. No auth needed.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL pre-merge)

1. Sign in as a seller and open https://miyagisanchez.com/shop/manage
   → The "+ Nuevo anuncio" button shows **white** text on green — clearly legible.
2. Check the other accent buttons: https://miyagisanchez.com/sell/setup ,
   https://miyagisanchez.com/shop/manage/import , and https://miyagisanchez.com/account/referrals
   → Each primary button's label is legible (no green-on-green).
3. On a phone (or a 375px-wide window), reload https://miyagisanchez.com/shop/manage
   → The sub-nav strip under the shop name (Ver tienda pública · Pedidos · Ofertas · … · Importar
     catálogo) scrolls/wraps so every item is reachable; the page doesn't scroll sideways.

If any step fails, note the step number + what you saw — that's the bug report.
