---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: seller-nav-consolidation
---

# Epic — Seller nav consolidation + breadcrumb standardization (`/shop/manage`)

**Macro-section:** 09 · Platform & Infra (follows the shipped *Navigation & Settings Reorg* that created the SellerNav).
**Class:** Chore — frontend-only information-architecture cleanup. No buyer/seller/agent capability change.
**Scope doc:** [`Roadmap/00-ideas/2. readyforscope/seller-nav-consolidation.md`](../../00-ideas/2.%20readyforscope/seller-nav-consolidation.md) — APPROVED 2026-06-22.

## Why

`/shop/manage` carries **two** competing navigations: the canonical left rail (`lib/seller-nav.ts`) and a
hardcoded horizontal link row in the dashboard header (`ManageDashboard.tsx`). The rail is **missing**
Suscripciones, Contenido and Sorteos; the two bars use **different labels for the same routes** (Promociones
vs Cupones · Analítica vs Analíticas · Ajustes vs Configuración · Importar vs Importar catálogo); and **every
section renders a different breadcrumb** (← Panel · ← Mi tienda · ← Volver al panel · dict "Inicio / Eventos"
· ← Pedidos). This epic makes the rail the single nav source of truth, picks one canonical name per
destination, and standardizes on one breadcrumb — all reusing the existing nav descriptor as the SSOT.

## Context

| | |
|---|---|
| **What it is** | Frontend IA: the nav descriptor, the dashboard header, and per-section breadcrumbs |
| **Repos touched** | `apps/miyagisanchez` only. No backend, no DB, no Medusa/Supabase, no route-slug changes |
| **Output** | One rail with every destination + one canonical label each; one shared "Resumen / \<Section\>" breadcrumb |
| **SSOT** | `lib/seller-nav.ts` — both the rail and the new breadcrumb derive from it |

## Decisions (Daniel, 2026-06-22)

1. **Rail = single source of nav truth** — add the 3 missing links; **remove the redundant horizontal row**
   (keep "Ver tienda pública"; preserve the Pedidos/Ofertas pending-count badges).
2. **Canonical labels = the descriptive set** — **Cupones · Analíticas · Configuración · Importar catálogo**.
3. **Breadcrumb = two-part "Resumen / \<Section\>"**, shared component, bilingual preserved for eventos/sweepstakes.

## Medusa-first note

N/A — zero commerce surface. AGENTS five-rule check: rules 1–3 (Medusa / Supabase / UCP-MCP) untouched (no
products/orders/payments/tables/agent endpoints; **route slugs unchanged** — only labels); rule 4 (Clerk)
untouched; rule 5 (bilingual) **load-bearing** — eventos/sweepstakes seller breadcrumbs stay bilingual, all
new/renamed labels are es-MX and copy-complete (no orphan old labels left).

## What already exists (reuse, don't rebuild)

- **`lib/seller-nav.ts`** (`SELLER_NAV`, `activeSellerNavHref`) — the pure, tested nav SSOT. Add entries +
  renames here; **derive the breadcrumb trail from this same module** so nav and breadcrumb can't drift.
- **`app/shop/manage/SellerNav.tsx`** — desktop rail + mobile "Más" overflow, both rendered from the
  descriptor. New Crecer entries flow into the overflow automatically; no renderer change needed.
- **`app/shop/manage/ManageDashboard.tsx`** — the shop-header `<div>` with the redundant `·`-separated row to
  remove (keep "Ver tienda pública" + the pending-count badges).
- **`app/shop/manage/eventos/page.tsx` + `sweepstakes/page.tsx`** — the dict-backed two-part breadcrumb shape
  to standardize on; these stay bilingual.
- **`app/shop/manage/settings/_components/SectionSaveBar.tsx`** — the settings shared back-link; one update
  aligns many settings sections.
- **`e2e/seller-mode.spec.ts`** — asserts every nav entry maps to a real route + the active matcher; extend it.

## Scope — stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **[S1](sprint-1.md)** | S1.1 Descriptor: add Suscripciones/Contenido/Sorteos + apply canonical renames | low |
| **[S1](sprint-1.md)** | S1.2 Remove the redundant horizontal row (keep "Ver tienda pública" + pending badges) | low |
| **[S1](sprint-1.md)** | S1.3 Canonical labels on section page titles/headers | low |
| **[S2](sprint-2.md)** | S2.1 Shared `<SellerBreadcrumb>` deriving "Resumen / \<Section\>" from the nav SSOT | low |
| **[S2](sprint-2.md)** | S2.2 Replace every bespoke breadcrumb with it | low |
| **[S2](sprint-2.md)** | S2.3 Reconcile the bilingual eventos/sweepstakes breadcrumbs | low |

## Deploy order

Frontend-only, single repo. Branch `chore/seller-nav-consolidation` off latest `main`. **S1 before S2** (the
breadcrumb deriver in S2 reads the renamed/added entries S1 lands). Merges to `main` = Vercel deploy; each
PR gets a preview. No backend/Cloud Run involvement.

## Definition of Done (epic)

- [ ] The left rail shows every destination (incl. Suscripciones, Contenido, Sorteos) with **one canonical
      label each** (Cupones · Analíticas · Configuración · Importar catálogo); the duplicate horizontal nav row
      is gone; the Pedidos/Ofertas pending-count signal is preserved.
- [ ] Every `/shop/manage/*` section renders the same **"Resumen / \<Section\>"** breadcrumb; no "← Panel" /
      "← Mi tienda" / "← Volver al panel" variants remain (grep to zero).
- [ ] eventos/sweepstakes breadcrumbs still pass the bilingual completeness gate.
- [ ] `e2e/seller-mode.spec.ts` updated + green; pure `lib/` specs cover the breadcrumb deriver.
- [ ] Each `sprint-N.md` has its smoke walkthrough + status ticked with commit refs.
- [ ] This `README.md` marked ✅ (`status: shipped`); `RETROSPECTIVE.md` written; durable learnings promoted to `Roadmap/LEARNINGS.md`.
- [ ] Poster: update the `03 · Selling & Shops` seller-mode-shell line in `Roadmap/README.md` to the canonical
      labels; ran `node scripts/build-order.mjs`; staged `BUILD-ORDER.md`.
