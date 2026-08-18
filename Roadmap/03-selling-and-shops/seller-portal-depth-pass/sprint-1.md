# Seller-portal depth pass — Sprint 1: Visible and thumb-safe

**Status:** ✅ shipped — frontend commit `3504ae3` (included in PR #388)

## Stories

### Story 1.1 — Every seller route has a truthful loading state
**As a** seller moving through my workspace, **I want** the next page to acknowledge my click with a
layout-shaped placeholder, **so that** I know the portal is working and what kind of page is coming.

**Acceptance:** every `page.tsx` under `/shop/manage` resolves to a co-located or explicitly-shared
`loading.tsx`; a small shared skeleton component covers real dashboard, table/list, form, and detail shapes
using `.skeleton`; the seller shell/nav stay stable; there is no global spinner, fake percentage, or silent
route; a source-population guard derives the route tree and fails when a new seller page has no boundary.
Buttons changed in this epic retain their own progressive busy label.

**Risk:** low

### Story 1.2 — Named mobile controls meet the thumb floor
**As a** seller working from my phone, **I want** selection and row actions I can hit reliably without
opening the wrong order/listing, **so that** routine catalog and fulfillment work is safe on mobile.

**Acceptance:** OrdersInbox and CatalogTable selection controls expose at least a 44×44 hit area without
oversizing the glyph; SellWizard's subscription-tier, remove-plan, and price-on-request controls meet the
same floor; catalog pause/channel/delete clusters collapse behind one labelled `Más` trigger on mobile and
open the existing sheet pattern with the same actions/outcome copy; desktop keeps efficient inline actions;
no action disappears at either breakpoint.

**Risk:** low

## Sprint QA
- **api/pure spec(s):** a seller-loading-boundary population spec derives all `page.tsx` paths and rejects
  an uncovered route; extend the existing seller design/surface spec only for files swept here.
- **browser spec:** at 390px measure the named hit rectangles, open the catalog row-action sheet, and prove
  every action remains reachable; at desktop prove inline controls remain. Throttle navigations to dashboard,
  orders, catalog, settings, and one order detail and observe a content-shaped skeleton before content.
- **browser smoke owed:** Daniel's live authenticated phone walkthrough only if the test seller fixture
  cannot exercise these routes; no money/checkout action.
- **red proof:** deliberately remove one loading boundary and shrink one target below 44px; observe the new
  specs fail before restoring the implementation.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (use the frontend preview URL pre-merge)

1. Sign in as a seller and go to https://miyagisanchez.com/shop/manage.
   → Resumen loads inside the seller shell; on a throttled connection its dashboard-shaped skeleton appears
   before real shop content without replacing the nav.
2. Open https://miyagisanchez.com/shop/manage/orders, then Catálogo and Configuración from the seller nav.
   → Each route shows a content-shaped loading state; no route sits blank and no global spinner covers the shell.
3. Set the viewport to 390px and open https://miyagisanchez.com/shop/manage/catalogo.
   → Each selection control is easy to tap and each row offers one labelled `Más` action.
4. Tap `Más`, then exercise Pausar/Activar and close the sheet without confirming delete.
   → The sheet exposes the same actions as desktop and the row link never opens by mistake.
5. Open https://miyagisanchez.com/sell at 390px and inspect a subscription plan plus `Precio a consultar`.
   → Checkbox/remove controls have comfortable hit areas; returning to desktop shows the original inline layout.

If any step fails, note the step number + what you saw — that's the bug report.
