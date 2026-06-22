# Sprint 2 — One breadcrumb everywhere

**Epic:** [Seller nav consolidation](README.md) · **Risk:** all LOW · **Repo:** `apps/miyagisanchez`
**Goal:** every `/shop/manage/*` section renders the same **"Resumen / \<Section\>"** breadcrumb, derived from
the nav SSOT so it can't drift — replacing the six+ bespoke variants.

> Runs after Sprint 1 — the breadcrumb deriver reads the renamed/added entries S1 lands.

## Stories

### S2.1 — Shared `<SellerBreadcrumb>` deriving from the nav SSOT · LOW
**As a** seller, **I want** a single, predictable breadcrumb, **so that** I always know where I am and how to
go back.
- Add a pure helper to `lib/seller-nav.ts` (e.g. `sellerBreadcrumbTrail(pathname)`) returning
  `[{ label: 'Resumen', href: '/shop/manage' }, { label: <section>, href: null }]`, reusing
  `activeSellerNavHref` + the descriptor labels (so the section label = the canonical rail label).
- Add a `<SellerBreadcrumb>` component (client; reads `usePathname`) that renders the trail with a `/`
  separator, matching the eventos/sweepstakes look.
- **Acceptance:** the helper returns the correct two crumbs for each section route; the component renders them.
- **QA:** pure `lib/` spec (no network) covering each section pathname → expected trail.

### S2.2 — Replace every bespoke breadcrumb with it · LOW
**As a** seller, **I want** consistency, **so that** no section uses a different back affordance.
- Swap the bespoke back-link/breadcrumb for `<SellerBreadcrumb>` in: `orders` (← Panel), `offers` (← Panel),
  `analytics` (← Mi tienda), `subscriptions` (← Mi tienda), `content` (← Mi tienda), `import` (← Mi tienda),
  `promotions`, the settings sections (via `SectionSaveBar` / section headers, ← Volver al panel), and
  `orders/[id]` (← Pedidos → "Resumen / Pedidos / \<order\>" or "Resumen / Pedidos").
- **Acceptance:** every section shows "Resumen / \<Section\>"; grep for "← Panel" / "← Mi tienda" / "← Volver
  al panel" in `app/shop/manage/**` → zero.
- **QA:** grep to zero; authed rendered breadcrumb owed to Daniel (or `MS_TEST_*` browser spec).

### S2.3 — Reconcile the bilingual eventos/sweepstakes breadcrumbs · LOW
**As a** seller, **I want** events/sweepstakes to match, **so that** the standard is truly universal — without
breaking bilingual.
- Align `eventos` + `sweepstakes` to the shared shape and the "Resumen" home label, keeping es/en (update
  dict `breadcrumbHome`/`breadcrumbCurrent` keys as needed). If open question 3 lands "es-MX is fine
  seller-side," they can use the shared component directly and drop the dict dependency.
- **Acceptance:** both render the standardized breadcrumb and still pass the bilingual completeness gate
  (both locales present where required).
- **QA:** dict completeness check + a `?lang=en` spot-check on the relevant surface.

## Sprint QA
- Deterministic gate: the pure `lib/` breadcrumb-deriver spec + `tsc`/build/Playwright `api`. No money/auth/DB
  path. The rendered authed breadcrumb across sections is a seller browser smoke **owed to Daniel**.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: the branch's Vercel preview (then production after merge), signed in as a seller.

1. Go to `<preview>/shop/manage/orders`.
   → The top shows a breadcrumb **"Resumen / Pedidos"**; clicking "Resumen" returns to `/shop/manage`.
2. Visit `/shop/manage/analytics`, `/subscriptions`, `/content`, `/import`, `/promotions`, `/settings`.
   → Each shows the identical "Resumen / \<Section\>" breadcrumb (e.g. "Resumen / Analíticas",
     "Resumen / Cupones", "Resumen / Configuración") — no "← Panel" / "← Mi tienda" / "← Volver al panel".
3. Visit `/shop/manage/eventos` and `/shop/manage/sweepstakes`.
   → Both show the same standardized breadcrumb; with `?lang=en` the labels are present in English where the
     bilingual gate requires it.
4. Open a specific order at `/shop/manage/orders/<id>`.
   → The breadcrumb reads "Resumen / Pedidos" (deeper crumb optional), consistent with the rest.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S2.1 — _scaffolded_
- [ ] S2.2 — _scaffolded_
- [ ] S2.3 — _scaffolded_
