# Setup guide on dashboard — Sprint 1: Setup guide card on Resumen (lib seam · card · dismiss/restore · metrics)

**Status:** ✅ all 4 stories built on `feat/seller-portal-setup-guide` — deterministic gate green, PR pending
Daniel's review + live smoke.

Build the four stories in order — B.1 is the skateboard (an invisible, regression-guarded refactor that
de-risks everything after); B.2 is the visible win; B.3/B.4 finish the loop.

## Stories

### Story 1.1 — `lib/setup-guide.ts` seam + settings refactor
**As a** developer, **I want** the value-based completion logic extracted from `settings/page.tsx` into a
pure `lib/setup-guide.ts`, **so that** the settings page and the new dashboard card share one source of truth
(and I get free unit coverage on a pure seam).
**Detail:** expose `getSetupSteps({ shop, productCount, shareDone })` → the ordered 5 steps
(`id · label · done · cta · estimate`) with "one open at a time" resolution (first incomplete step open;
payments/step-3 open by default when incomplete). Repoint `settings/page.tsx` at the seam — **identical
render**. Step map: 1 perfil (`name && description`) · 2 catálogo (`productCount > 0`) · 3 pagos
(`stripe_ok || mp_enabled || clabe_ok`) · 4 envíos (`envios_ok`) · 5 comparte (`shareDone`).
**Acceptance:** the settings page's "N de … secciones configuradas" counter is unchanged after the refactor;
`getSetupSteps` returns the right done/open state for a shop with only profile+payments set (steps 1 & 3 done,
step 2 open).
**Risk:** low
**Status:** ✅ done — `lib/setup-guide.ts` (`computeShopCompletion`/`completedSectionKeys`/`getSetupSteps`),
`settings/page.tsx` repointed (byte-identical render, diff reviewed), `e2e/setup-guide.spec.ts` (12 tests,
`api` project). Gate green: `tsc --noEmit`, `next build`, `playwright test --project=api` (pre-existing,
unrelated prod-hitting flakes confirmed present on unmodified `main` too — not a regression). Commit `9804c98`
on `feat/seller-portal-setup-guide`.

### Story 1.2 — "Pon tu tienda en marcha" card on Resumen
**As a** new merchant, **I want** a persistent setup guide on my dashboard, **so that** I know exactly what's
left to start selling — with payments named up front, not sprung on me later.
**Detail:** card in `ManageDashboard` reading the seam: "n de 5" progress + bar; one step open at a time;
completed steps collapse with strikethrough; **step 3 payments** open-by-default-when-incomplete, "~4 min"
pill, body "Conecta Mercado Pago, Stripe o SPEI. Sin esto tus compradores no pueden pagarte.", CTA
"Configurar cobros" → `/shop/manage/settings/pagos`. Built on P0·A `<Card>`/`<Button>` (or `globals.css`
tokens if P0·A unmerged). es-MX copy throughout.
**Acceptance:** on a not-fully-configured shop, `/shop/manage` shows the card with an accurate "n de 5" bar;
payments step is open with the "~4 min" pill; clicking "Configurar cobros" lands on the pagos page.
**Risk:** low
**Status:** ✅ done — `SetupGuideCard.tsx` (new), wired into `ManageDashboard.tsx`; `page.tsx` adds one
lightweight Supabase read (same `ShopRow` columns `settings/page.tsx` selects, so completion state can't
drift between the two surfaces) — product count reuses `listings.length`, no new fetch there. Built on P0·A
`<Card>`/`<StatusBadge>`; the CTA is a `Link` styled with the same `.btn-primary` classes `Button` wraps
(avoids nesting a `<button>` inside an `<a>`). Commit `a6524d9`.

### Story 1.3 — Dismiss + restore + share-complete
**As a** merchant who's done, **I want** to hide the guide (and get it back if I need it), **so that** my
dashboard isn't cluttered once I'm set up.
**Detail:** "Ocultar" ghost (and auto-collapse when all 5 done) persisting `guide_dismissed` via the existing
`PATCH /api/sell/shop`; a restore toggle in Configuración; step 5 "Comparte" marks `share_done` on the first
share action. Flags live in `metadata.settings` (non-commerce). Fail-safe: absent flag = show the guide.
**Acceptance:** "Ocultar" removes the card and it stays hidden across reload; Configuración → restore brings
it back; performing a share ticks step 5 to done.
**Risk:** low
**Status:** ✅ done — `SetupGuideCard.tsx` is now a client component (`useSettingsSave`, the same PATCH hook
every settings section uses): "Ocultar" optimistically hides + persists `guide_dismissed` (reverts on PATCH
failure); the comparte step's CTA triggers a real share (`navigator.share`, clipboard fallback) then persists
`share_done` and `router.refresh()`s. New `GuideRestoreToggle.tsx` in Configuración flips `guide_dismissed`
back off. Added a typed `guide` block to the PATCH route's `ShopUpdatePayload` for consistency with the other
sections (the route's deep-merge would have accepted it either way). Fail-safe preserved: absent/malformed
flag reads `false` (guide shows). Commit `26987fd`.

### Story 1.4 — Instrument guide step events (Grower signal)
**As a** product owner, **I want** guide interaction events, **so that** I can see whether the guide moves
merchants toward payable — not just that it renders.
**Detail:** wire the S6 metrics: `guide_view`, `guide_step_open`, `guide_step_complete` (per step id),
`guide_dismiss`, `guide_restore`, `first_share_tap`.
**Acceptance:** opening the dashboard fires `guide_view`; expanding a step fires `guide_step_open`;
completing payments fires `guide_step_complete` for step 3 — visible in the metrics sink.
**Risk:** low
**Status:** ✅ done — new `lib/analytics-events.ts` (`pushAnalyticsEvent`), the first reusable custom-event
pusher into the GTM `dataLayer` `<SiteAnalytics>` bootstraps (site-wide-analytics-gtm epic shipped only the
container load, no event API — this is new code, not reuse, because nothing to reuse existed). Respects the
same `shouldLoadAnalytics` gate the container itself loads under; an optional `localStorage` dedupe key keeps
a step's first completion / first share tap from re-firing on every `router.refresh()`. All 6 events wired.
No dedicated spec (Sprint QA doesn't name one for B.4; the module reads `window.location` so it isn't
Node-testable the way `analytics-gating.ts`'s param-based function is — verified via `tsc` + `next build` +
manual code review instead). Commit `2f21e80`.

## Sprint QA
- **api spec(s):** `e2e/setup-guide.spec.ts` (pure-logic, `api` project, 12 tests) — every step's `done`
  predicate, the fixed 5-step ordering, one-open-at-a-time resolution (incl. the story's own "profile+payments
  only → steps 1&3 done, step 2 open" case), the all-done/all-incomplete edges, and the exact payments body
  copy + CTA. This is the logic B.2's render and B.3's dismiss/restore/share all sit on top of.
  **Correction vs. the original plan:** B.2/B.3's card-render/dismiss/restore behavior was **not** added to
  `e2e/seller-mode.spec.ts` — that file's existing pattern is pure-logic (`isSellerModePath`/`SELLER_NAV`),
  unrelated to this authed, server-rendered page. `/shop/manage` requires a Clerk session (redirects
  anonymous requests to `/sign-in`), so an unauthenticated API/browser check can't reach the rendered card at
  all — there was no lower-cost automated substitute available here, unlike the money-path OAuth step below.
- **browser smoke owed:** yes, to Daniel — two distinct gaps, not just one:
  1. The payments step's connect flow is the **existing pagos OAuth** (not built here; the card only links to
     it) — walkthrough step 4.
  2. **The entire card's on-screen render + interaction** (walkthrough steps 1–3, 5–7: n/5 bar, payments pill,
     CTA navigation, share-completes-step-5, Ocultar-hides, restore-brings-back) needs a real authed seller
     session to exercise — stated here explicitly rather than glossed, per the Definition of Done.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge — confirmed
  green on the full suite (not just this epic's new spec); the design-token-foundation raw-hex guard caught a
  real allowlist-location bug from the B.1 extraction, fixed same-session (commit `8af356f`).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/shop/manage as a merchant whose shop isn't fully configured.
   → You see the "Pon tu tienda en marcha" card with a "n de 5" progress bar and one step open.
2. Look at step 3 "Activa cómo cobrar".
   → It's open by default, shows a "~4 min" pill, and a "Configurar cobros" button.
3. Click "Configurar cobros".
   → You land on https://miyagisanchez.com/shop/manage/settings/pagos.
4. **(money/auth path — owed to Daniel)** Connect a payment method (Mercado Pago / Stripe / SPEI) via the
   existing pagos OAuth, then return to https://miyagisanchez.com/shop/manage.
   → Step 3 is now checked, collapsed with strikethrough, and the next incomplete step is open; the bar advanced.
5. Perform a share action (step 5 "Comparte tu tienda").
   → Step 5 ticks to done.
6. Click "Ocultar", then reload the page.
   → The card is gone and stays gone.
7. Go to https://miyagisanchez.com/shop/manage/settings and use the restore toggle, then return to Resumen.
   → The card is back.

If any step fails, note the step number + what you saw — that's the bug report.
