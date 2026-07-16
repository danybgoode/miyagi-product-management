# Retrospective — Seller nav consolidation (`/shop/manage`)

_Closed: 2026-06-23_

**Shipped:** 2026-06-23 · **Sprints:** 2 · **Risk:** LOW throughout (frontend-only IA) · **Repo:** `apps/miyagisanchez`
**PRs:** S1 [#105](https://github.com/danybgoode/miyagisanchezcommerce/pull/105) `2ca1605` · S2 [#107](https://github.com/danybgoode/miyagisanchezcommerce/pull/107) `2debdf7`

## What it was

`/shop/manage` carried **two** competing navigations — the canonical `SellerNav` left rail (`lib/seller-nav.ts`)
and a hardcoded horizontal link row in the dashboard header — that disagreed on labels for the same routes
(Promociones vs Cupones · Analítica vs Analíticas · Ajustes vs Configuración · Importar vs Importar catálogo),
the rail was **missing** Suscripciones/Contenido/Sorteos, and **every section rendered a different breadcrumb**
(`← Panel` · `← Mi tienda` · `← Volver al panel` · `← Pedidos` · dict "Mi tienda / Eventos"). The epic made the
nav descriptor the single source of truth for both the rail and a new shared breadcrumb.

## What shipped

- **S1 — one nav, one name.** Added the 3 missing Crecer entries + applied the canonical labels in `SELLER_NAV`;
  removed the duplicate horizontal row (pending Pedidos/Ofertas counts preserved via a pure
  `lib/seller-pending-summary.ts` compact line); section titles were already canonical, so an anti-erosion
  title guard was added instead of a rename. (`seller-mode.spec.ts` extended.)
- **S2 — one breadcrumb everywhere.** Pure `sellerBreadcrumbTrail()` on the same SSOT (section label = the
  canonical rail label) + one client `<SellerBreadcrumb>`. `extra` appends deeper crumbs keeping the
  intermediate link (order detail `Resumen / Pedidos / <id>`, settings sub-section
  `Resumen / Configuración / <section>`); `crumbs` lets the bilingual eventos/sweepstakes server pages pass
  dict labels into the same markup (home label standardized to **Resumen / Summary**). An fs-guard fails CI if
  any banned back-link reappears.

## What went well

- **Derive, don't duplicate.** Both the rail and the breadcrumb read one descriptor, so they cannot drift —
  the same discipline #105 applied to the nav, extended to the back affordance. The deriver reuses the existing
  `activeSellerNavHref` matcher rather than re-implementing prefix matching.
- **The anti-erosion fs-guard caught the long tail.** The initial sweep missed four settings sections
  (`Pagos`/`Agentes`/`Devoluciones`/`Canal`) that carried their own inline `← Volver al panel` save bars,
  separate from the shared `SectionSaveBar`. The grep-to-zero guard surfaced them immediately; without it they'd
  have shipped as stragglers.
- **Cheap real verification beat assumption.** The cross-review nit ("caller `mb-6` may not override the base
  `mb-1`") was a real spacing-regression risk — checking the generated CSS byte offsets (`mb-1` < `mb-3` < `mb-6`,
  ascending → caller wins) confirmed it works rather than guessing or over-fixing.

## What we learned

- **The local app `main` was behind `origin/main`.** S1 had squash-merged on the remote but the local checkout
  hadn't pulled it, so `lib/seller-nav.ts` showed the *old* labels locally — the S2 worktree had to be cut off a
  freshly-fetched `origin/main`, not local `main`. Always `git fetch` + branch off `origin/main` for a follow-on
  sprint.
- **Worktree placement matters for npm workspaces.** A worktree created inside the monorepo's `apps/` glob
  collides on the workspace package name (`must not have multiple workspaces with the same name`). Place app
  worktrees **outside** the monorepo root.
- **Removing a back-link orphans its `Link` import.** `next build`'s ESLint fails on the unused import — sweep
  the import line whenever you delete the only `<Link>` usage.
- **agy is non-functional headless (1.0.10).** The requested Antigravity cross-review produced empty output even
  on a trivial "2+2" prompt (no headless auth in this session; version drift from pinned 1.0.7). Codex carried
  the review — same outcome as S1. Don't block a merge on agy.
- **Prod WAF shadows one spec.** `not-found-shape.spec.ts` (`/l/wp-admin` → 403 not 404) fails on a prod-targeted
  local run (`x-vercel-mitigated: deny`) but is green on previews; CI-vs-preview is authoritative. Not a regression.

## Gaps / follow-ups

The authed seller browser smoke across sections (rail labels + the "Resumen / \<Sección\>" breadcrumb on every
section, incl. the `?lang=en` `Summary / Events` · `Summary / Sweepstakes` spot-check) — he holds the seller
session and the Claude-in-Chrome MCP wasn't connected to the build session. Steps are in `sprint-1.md` / `sprint-2.md`.
