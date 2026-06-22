# Seller nav consolidation + breadcrumb standardization (`/shop/manage`)

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **09 · Platform & Infra** (follows the shipped *Navigation & Settings Reorg* that created the
SellerNav; borderline with 03 · Selling & Shops — move if you prefer). Slug: `seller-nav-consolidation`.
Class: **Chore** — frontend-only information-architecture cleanup. No buyer/seller/agent capability change.

## Mirror-back
> On `/shop/manage` there are **two** navigations: the left rail and a horizontal link row under the shop
> name. The rail is **missing Suscripciones, Contenido, Sorteos**; the two bars use **different names for the
> same routes**; and **every section has a different breadcrumb**. You want one nav (rail) as the source of
> truth, one canonical name per destination, and one standard breadcrumb. Right?

## Daniel's grooming calls (2026-06-22)
1. **Rail = single source of nav truth** — add the 3 missing links to the left rail and **remove the
   redundant horizontal nav row** from the dashboard header (keep non-nav links like "Ver tienda pública").
2. **Canonical labels = the descriptive (row) set** — **Cupones · Analíticas · Configuración · Importar
   catálogo** (renaming the rail's current Promociones / Analítica / Ajustes / Importar).
3. **Breadcrumb standard = a two-part "Resumen / \<Section\>"** shared component, preserving the bilingual
   dict pattern for eventos/sweepstakes.

## Stage-2.5 bucket — **light enhancement (wiring + renaming + one shared component)**
Every destination **already exists and renders** — Suscripciones (`/subscriptions`), Contenido
(`/content`), Sorteos (`/sweepstakes`) are already linked from the horizontal row. Nothing new is built;
this is nav wiring, label standardization, and replacing N bespoke breadcrumbs with one.

## What already exists (reuse, don't rebuild) — verified against the repo 2026-06-22
| Capability | Where | Reuse for |
|---|---|---|
| The canonical nav descriptor (pure, next-free) + active-href matcher, tested | `lib/seller-nav.ts` (`SELLER_NAV`, `activeSellerNavHref`) + `e2e/seller-mode.spec.ts` | Add the 3 entries + apply the renames here; derive the breadcrumb trail from this **same SSOT** so it can't drift |
| The rail/mobile-bar renderer | `app/shop/manage/SellerNav.tsx` (desktop rail + mobile "Más" overflow, both from the descriptor) | No change needed beyond the descriptor; new Crecer entries flow into the "Más" overflow automatically |
| The redundant horizontal row (to remove) | `app/shop/manage/ManageDashboard.tsx` shop-header `<div>` (the `· `-separated Link list) | Strip the nav links; keep "Ver tienda pública" + preserve the Pedidos/Ofertas pending-count badges (see in-scope note) |
| The two-part, dict-backed breadcrumb pattern to standardize ON | `app/shop/manage/eventos/page.tsx` + `sweepstakes/page.tsx` (`breadcrumbHome / breadcrumbCurrent`, `/` separator) | The shape the shared component mirrors; these two stay bilingual (es/en) |
| Settings shared footer back-link | `app/shop/manage/settings/_components/SectionSaveBar.tsx` ("← Volver al panel") | Aligns to the new breadcrumb/home label; one place updates many settings sections |
| es-MX-default + bilingual allow-list rule | `AGENTS.md` rule #5 | eventos/sweepstakes breadcrumbs must remain bilingual; new labels are es-MX |

## The exact current inconsistencies (the inventory this epic resolves)
**Two bars, same routes, different names:**

| Route | Left rail (today) | Horizontal row (today) | **Canonical (decided)** |
|---|---|---|---|
| `/promotions` | Promociones | Cupones | **Cupones** |
| `/analytics` | Analítica | Analíticas | **Analíticas** |
| `/settings` | Ajustes | Configuración | **Configuración** |
| `/import` | Importar | Importar catálogo | **Importar catálogo** |
| `/subscriptions` | *(absent)* | Suscripciones | **Suscripciones** *(add to rail)* |
| `/content` | *(absent)* | Contenido | **Contenido** *(add to rail)* |
| `/sweepstakes` | *(absent)* | Sorteos | **Sorteos** *(add to rail)* |

**Breadcrumb variants (all to replace with "Resumen / \<Section\>"):**
`orders`/`offers` → "← Panel" · `analytics`/`subscriptions`/`content`/`import` → "← Mi tienda" · settings
sections → "← Volver al panel" · `orders/[id]` → "← Pedidos" · `eventos`/`sweepstakes` → dict "Inicio /
Eventos" (two-part, bilingual).

## Proposed final rail (order adjustable at plan time)
- **Operar:** Resumen · Pedidos · Ofertas · Anuncios
- **Crecer:** Cupones · Suscripciones · Contenido · Eventos · Sorteos · Analíticas · Importar catálogo · Configuración

## Medusa-first reframe (AGENTS five-rule check)
**N/A — zero commerce surface.** Rules 1–3 (Medusa / Supabase / UCP-MCP) untouched — no products, orders,
payments, tables, or agent endpoints; route **slugs are unchanged** (only labels change). Rule 4 (Clerk)
untouched. Rule 5 (bilingual): **load-bearing** — eventos/sweepstakes seller breadcrumbs stay bilingual;
all new/renamed labels are es-MX and must be copy-complete (no orphan old labels left anywhere).

## In scope (v1)
- Add **Suscripciones, Contenido, Sorteos** to `SELLER_NAV` (Crecer) and apply the canonical renames
  (**Cupones, Analíticas, Configuración, Importar catálogo**) in the descriptor.
- **Remove the horizontal nav row** from `ManageDashboard.tsx`, keeping "Ver tienda pública" and
  **preserving the Pedidos/Ofertas pending-count badges** (the one genuinely useful signal that row carried —
  move them onto the rail entries or keep a compact status line; don't lose the count affordance).
- Apply the canonical label to each **section's own page title/header** (copy-completeness), not just the nav.
- A **shared `<SellerBreadcrumb>`** rendering **"Resumen / \<Section\>"**, deriving the trail from
  `lib/seller-nav.ts` (single SSOT), used by every section; eventos/sweepstakes keep bilingual labels.
- Update `e2e/seller-mode.spec.ts` for the new entries + labels; grep the suite for stale label assertions
  (e.g. "Promociones", "Analítica", "Ajustes") and the breadcrumb strings.

## Out of scope (v1)
- **Renaming route slugs** (e.g. English `/promotions` vs Spanish `/eventos`). That needs 301s + risk; the
  ask is about *labels and breadcrumbs*, not URLs. Explicitly out.
- Any change to what the sections *do* — pure IA/labels only.
- Re-grouping Operar vs Crecer beyond placing the 3 new entries (order is a plan-time tweak, not new scope).
- Buyer-side nav / the PWA bar (covered by other epics).

## Slicing — skateboard → car (2 sprints, both LOW)
Branch `chore/seller-nav-consolidation` (frontend repo only). QA = pure-logic specs on `lib/seller-nav.ts`
(active matcher + breadcrumb deriver — free coverage) + the updated `e2e/seller-mode.spec.ts`; the rendered
authed breadcrumb/rail is an authed-seller browser smoke **owed to Daniel** (or a `MS_TEST_*` browser spec).

### Sprint 1 — One nav, one name per destination · **risk: LOW**
- **S1.1 — Descriptor: add 3 entries + apply renames.** Update `SELLER_NAV` (Crecer) with Suscripciones,
  Contenido, Sorteos and rename to Cupones/Analíticas/Configuración/Importar catálogo. *Acceptance:* the rail
  (desktop + mobile "Más") shows all destinations with the canonical names. *QA:* `e2e/seller-mode.spec.ts`
  asserts every entry maps to a real route + the active matcher; extend it.
- **S1.2 — Remove the redundant horizontal row.** Strip the nav-link row from `ManageDashboard.tsx`; keep
  "Ver tienda pública"; preserve the Pedidos/Ofertas pending-count badges. *Acceptance:* the dashboard header
  has no duplicate nav row, and the pending counts are still visible somewhere. *QA:* visual + spec for the
  badge survival.
- **S1.3 — Canonical labels on section page titles.** Each section's own header matches the rail label
  (Cupones, Analíticas, Configuración, Importar catálogo). *Acceptance:* no page still titles itself with an
  old name. *QA:* grep for the old strings across the suite + pages.

### Sprint 2 — One breadcrumb everywhere · **risk: LOW**
- **S2.1 — Shared `<SellerBreadcrumb>` deriving from the nav SSOT.** A pure helper in `lib/seller-nav.ts`
  returns the trail `[Resumen → <Section>]` for a pathname (reusing the active matcher + labels); the
  component renders it. *Acceptance:* the helper returns the right two crumbs for each section route. *QA:*
  pure `lib/` spec (no network).
- **S2.2 — Replace every bespoke breadcrumb with it.** orders, offers, analytics, subscriptions, content,
  import, promotions, settings sections (via `SectionSaveBar`/section headers), orders/[id]. *Acceptance:*
  every section shows "Resumen / \<Section\>" with the same look; no "← Panel"/"← Mi tienda"/"← Volver al
  panel" variants remain. *QA:* grep the old strings to zero; authed render owed to Daniel.
- **S2.3 — Reconcile the bilingual eventos/sweepstakes breadcrumbs.** Align them to the shared shape and the
  "Resumen" home label while keeping es/en (update dict keys if needed). *Acceptance:* both render the
  standardized breadcrumb and still pass the bilingual completeness gate. *QA:* dict check + `?lang=en` spot.

## Risk tiers (WAYS §6 / groom Stage 6)
Both sprints → **LOW**: frontend-only labels/IA, no commerce/money/auth/DB. Caveat to flag in the PR:
`SellerNav` renders inside the shared `/shop/manage` layout, and `lib/seller-nav.ts` is covered by
`e2e/seller-mode.spec.ts` — update the spec in the same PR so the gate stays green.

## Open questions (validate before/at the sprint — don't assume)
1. **Pending-count badges (S1.2):** the horizontal row's Pedidos/Ofertas links carry pending-count badges.
   Preferred home for them once the row is gone — count badges on the rail entries, or a compact "N pedidos ·
   N ofertas pendientes" line in the dashboard header? (Recommend rail badges.)
2. **Crecer order (S1.1):** confirm the proposed Crecer order, or reorder (e.g. surface Suscripciones/Eventos
   higher). Cosmetic, but your call.
3. **Bilingual seller breadcrumbs (S2.3):** must the *seller-side* eventos/sweepstakes breadcrumbs stay
   bilingual, or is es-MX fine there (the public `/g/[slug]` & `/e/[slug]` flows are the allow-listed
   bilingual surfaces)? If es-MX is fine, the shared component drops the dict dependency for them.

## Research note
No external standard is load-bearing — pure in-repo IA. The only "current reality" to respect is the live
nav SSOT (`lib/seller-nav.ts`) + its spec, both already read for this doc.

## Definition of Ready — checklist
- [x] "As a / I want / so that" clear; acceptance testable by Daniel (rail shows all destinations with one
      name each; no duplicate row; every section shows the same "Resumen / \<Section\>" breadcrumb).
- [x] Stage-2.5 bucket named (light — wiring/renaming + one shared component).
- [x] v1 in/out boundary written (route-slug renames + behavior changes explicitly out).
- [x] Reuse list produced (`lib/seller-nav.ts` SSOT, SellerNav renderer, eventos/sweepstakes pattern, SectionSaveBar).
- [x] Each story risk-tiered (all LOW); QA stage named (pure `lib/` specs + updated seller-mode spec; authed render owed to Daniel).
- [ ] **Daniel approves this scope doc** → then scaffold the epic + 2 sprint docs and emit the kickoffs.
