# Sprint 1 — One nav, one name per destination

**Epic:** [Seller nav consolidation](README.md) · **Risk:** all LOW · **Repo:** `apps/miyagisanchez`
**Goal:** the left rail is the single nav source — every destination present, one canonical label each — and
the duplicate horizontal row is gone without losing the pending-count signal.

## Stories

### S1.1 — Descriptor: add 3 entries + apply renames · LOW
**As a** seller, **I want** every section reachable from the left rail with one consistent name, **so that** I
don't hunt across two bars with conflicting labels.
- In `lib/seller-nav.ts` `SELLER_NAV` (Crecer): add **Suscripciones** (`/shop/manage/subscriptions`),
  **Contenido** (`/shop/manage/content`), **Sorteos** (`/shop/manage/sweepstakes`); rename **Promociones →
  Cupones**, **Analítica → Analíticas**, **Ajustes → Configuración**, **Importar → Importar catálogo**.
  Proposed Crecer order: Cupones · Suscripciones · Contenido · Eventos · Sorteos · Analíticas · Importar
  catálogo · Configuración (confirm/adjust — open question 2).
- Pick Iconoir icons for the 3 new entries (subscriptions / content / sweepstakes) consistent with the set.
- **Acceptance:** the desktop rail and the mobile "Más" overflow list all destinations with the canonical
  names; clicking each lands on the right existing page.
- **QA:** extend `e2e/seller-mode.spec.ts` — assert every entry maps to a real route + the active matcher
  resolves (pure/api; free coverage).

### S1.2 — Remove the redundant horizontal row · LOW
**As a** seller, **I want** a single nav, **so that** the dashboard isn't cluttered with a second conflicting
link row.
- In `app/shop/manage/ManageDashboard.tsx`, remove the `·`-separated nav-link row from the shop header.
  **Keep** "Ver tienda pública". **Preserve the Pedidos/Ofertas pending-count badges** — move them onto the
  rail entries, or keep a compact "N pedidos · N ofertas pendientes" line (open question 1; recommend rail
  badges).
- **Acceptance:** the dashboard header has no duplicate nav row; the pending counts are still visible.
- **QA:** visual check (authed dashboard — owed to Daniel) + a spec asserting the pending-count element still
  renders when counts > 0.

### S1.3 — Canonical labels on section page titles · LOW
**As a** seller, **I want** each section's own title to match its nav label, **so that** naming is consistent
end-to-end (no "Promociones" page reached from a "Cupones" link).
- Update the in-page header/title of `/promotions` (→ Cupones), `/analytics` (→ Analíticas), `/settings`
  (→ Configuración), `/import` (→ Importar catálogo) to the canonical labels.
- **Acceptance:** no section titles itself with an old name.
- **QA:** grep the suite + pages for the old strings ("Promociones", "Analítica", "Ajustes", "Importar" as a
  standalone title) → zero in user-facing copy.

## Sprint QA
- Pure/api: `e2e/seller-mode.spec.ts` (extended) is the deterministic gate — every entry → real route + active
  matcher. No money/auth/DB path. The rendered authed rail/dashboard is a seller browser smoke **owed to
  Daniel** (he holds the seller session), or a `MS_TEST_*` browser spec if the fixture exists.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the branch's Vercel preview (then production after merge), signed in as a seller.

1. Go to `<preview>/shop/manage`.
   → The left rail lists, under Crecer: Cupones, Suscripciones, Contenido, Eventos, Sorteos, Analíticas,
     Importar catálogo, Configuración (plus Operar: Resumen · Pedidos · Ofertas · Anuncios).
2. Look at the shop header under the shop name/address.
   → There is **no** second horizontal row of section links; "Ver tienda pública" is still present, and the
     Pedidos/Ofertas pending counts are still shown.
3. Click "Cupones" in the rail.
   → Lands on the promotions page, whose own title now reads **Cupones**. Repeat for Analíticas /
     Configuración / Importar catálogo — each page title matches its rail label.
4. Narrow to mobile width → open "Más".
   → The overflow lists the Crecer entries with the canonical names.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S1.1 — _scaffolded_
- [ ] S1.2 — _scaffolded_
- [ ] S1.3 — _scaffolded_
