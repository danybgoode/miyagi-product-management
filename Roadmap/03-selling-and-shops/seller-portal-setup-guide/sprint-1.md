# Setup guide on dashboard — Sprint 1: Setup guide card on Resumen (lib seam · card · dismiss/restore · metrics)

**Status:** ⬜ not started

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

### Story 1.3 — Dismiss + restore + share-complete
**As a** merchant who's done, **I want** to hide the guide (and get it back if I need it), **so that** my
dashboard isn't cluttered once I'm set up.
**Detail:** "Ocultar" ghost (and auto-collapse when all 5 done) persisting `guide_dismissed` via the existing
`PATCH /api/sell/shop`; a restore toggle in Configuración; step 5 "Comparte" marks `share_done` on the first
share action. Flags live in `metadata.settings` (non-commerce). Fail-safe: absent flag = show the guide.
**Acceptance:** "Ocultar" removes the card and it stays hidden across reload; Configuración → restore brings
it back; performing a share ticks step 5 to done.
**Risk:** low

### Story 1.4 — Instrument guide step events (Grower signal)
**As a** product owner, **I want** guide interaction events, **so that** I can see whether the guide moves
merchants toward payable — not just that it renders.
**Detail:** wire the S6 metrics: `guide_view`, `guide_step_open`, `guide_step_complete` (per step id),
`guide_dismiss`, `guide_restore`, `first_share_tap`.
**Acceptance:** opening the dashboard fires `guide_view`; expanding a step fires `guide_step_open`;
completing payments fires `guide_step_complete` for step 3 — visible in the metrics sink.
**Risk:** low

## Sprint QA
- **api spec(s):** **B.1 → new `e2e/*.spec.ts` pure-logic unit spec on `getSetupSteps`** (the main gate:
  each step's `done` predicate, ordering, one-open-at-a-time). B.2/B.3 → extend `e2e/seller-mode.spec.ts`
  (card renders on Resumen with n/5; payments pill present; dismiss hides; restore in Configuración brings back).
- **browser smoke owed:** yes, to Daniel — the payments step's connect flow is the **existing pagos OAuth**
  (not built here; the card only links to it), so the money-path step below is owed to Daniel by name.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

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
