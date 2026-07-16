---
status: shipped
slug: navigation-settings-reorg
---

# Epic — Navigation & Settings Reorg

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/navigation-settings-reorg.md`](../../00-ideas/seeds/navigation-settings-reorg.md)

**Branch:** `feat/nav-reorg` · LOW overall, with one HIGH sprint (S3 alters the global app-shell
suppression gate). Reviewer may auto-merge LOW stories on green CI **unless** they touch shared
layout; **S3 → Daniel merges.**
> **Status: ✅ EPIC COMPLETE — all 4 sprints shipped to prod 2026-06-11 + closed out.**
> S1 #75 `dc4c992` · S2 #77 `a7d6fe8` · S3 #80 `d6b0a6b` · S4 #81 `8e12782`.
> Source: nav + settings audit (Miyagi Sánchez). es-MX default.
>
> **⚠️ Partially superseded (2026-06-22) by [PWA Liquid-Glass Nav Polish](../pwa-liquid-glass-nav-polish/)** —
> Daniel knowingly reversed two of this epic's PWA-bar decisions. The bar is **no longer**
> `Inicio · Explorar · ⊕ · Mensajes · Cuenta` with a removed search circle and Favoritos-in-Cuenta; it is now
> **`Inicio · Mensajes · ⊕ Vender · Favoritos · Perfil`** (icons-only) with the **detached glass search bubble
> re-added** and **Favoritos back as a top-level tab**. S2's "persistent header search on every surface" is
> also reversed **in the installed PWA only** — there a bottom-sheet search is primary and the header search is
> hidden (`.pwa-hidden`); it **still persists on mobile web and desktop**. The `CuentaMenu`, seller-mode shell,
> and `/sell`-vs-`/vende` work below are unaffected and still current.

## Why
Buyer, seller, and agent destinations are all jammed into one set of chrome. The PWA bottom bar carries
five tabs **plus** a detached search circle **plus** a publish FAB — Favoritos and Vecindario compete with
the core journey, and search floats as its own control. The header scatters account actions (Mi tienda,
Favoritos, Mi cuenta, theme, agent) across the top level, and `/shop/manage` renders inside full **buyer**
chrome with no seller-distinct space. Bare ✨ agent icons appear in two places. This epic separates the
three audiences: a focused 4-tab + FAB buyer bar with persistent header search, one consolidated Cuenta
hub, and a dedicated seller-mode shell under `/shop/manage`.

## Context

| Question | Answer |
|---|---|
| **Who** | Buyers (web + PWA), sellers managing a shop, and AI-agent entry-point users |
| **Job** | Reach the right destination for *my* role without wading through another audience's chrome |
| **Outcome signal** | The PWA bar shows exactly 4 tabs + 1 FAB, hides contextually, and search lives in the header on every surface · one Cuenta menu holds all account links · `/shop/manage` renders a seller-distinct shell with no buyer chrome · one agent entry point, no bare ✨ |
| **In v1** | PWA bar trim + contextual hide · persistent search · `CuentaMenu` · seller-mode shell (`SellerNav` + `/shop/manage` layout) · `/sell` vs `/vende` entry-point wiring · one agent entry |
| **Out (deferred)** | `/comunidad → /vecindario` content merge + redirects (separate ask) · any `/vende` content change (owned by #6) · Flagsmith A/B + `.tabbar--peek` (const-switchable only) |
| **Risk tier** | LOW overall; **S3 HIGH** (global app-shell suppression). S2 + S3 touch shared `layout.tsx`/`globals.css` — announce. |

## Medusa-first note
**Frontend-only — `app/` + `globals.css`. No backend, no Cloud Run deploy, no migration, zero new tables.**
AGENTS rules #1 (Medusa) / #2 (Supabase) / #4 (Clerk) are untouched (no commerce, DB, or auth change);
#3 (UCP/MCP) is N/A (UI chrome, not a commerce capability); #5 (es-MX) — all new labels are es-MX, no new
bilingual surface. The epic re-scoped smaller once the shell was read: chrome suppression, the Explorar
link, header search, and every account/manage sub-page already exist.

## What already exists (reuse, don't rebuild)
- **Chrome-suppression gate** — `app/layout.tsx` already drops header/footer/`MobileTabBar` for white-label
  (`whiteLabel = isEmbed || isChannel`). **Extend** this branch with a pure seller-mode predicate; don't
  invent a new suppression mechanism.
- **`app/components/MobileTabBar.tsx`** — the live 5-tab + detached-search-circle + center FAB; trim in place.
- **`app/globals.css`** — `.pwa-only`, `.pwa-search-hide`, `.pwa-spacer`, `.glass`/`.glass-liquid` conventions.
- **Header search** — `<form action="/l" method="GET">` (mobile) + desktop **"Explorar" → `/l`** link already exist.
- **Account links already in the header** — `Mi tienda` (`/shop/manage`), `/account/favorites`, `/account`,
  `PlatformThemeToggle`, `/agent`, `AIAgentButton` → fold into `CuentaMenu`.
- **Existing sub-pages (no new pages)** — `/account/{favorites,orders,subscriptions,referrals,notificaciones}`
  and `/shop/manage/{orders,offers,analytics,promotions,eventos,import,settings,content}`.
- **`lib/neighborhood-pulse.ts`** — Vecindario copy/labels; Iconoir icons; Space Grotesk; liquid-glass tokens.
- **`/vende` anchor landing** — already built by epic #6 (`buildAnchorPageConfig`); this epic only wires entry points.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **1 · PWA bottom bar** | 1.1 Trim to 4 tabs + FAB (Inicio · Explorar · [⊕ Vender] · Mensajes · Cuenta); remove search circle; Favoritos→Cuenta, Vecindario→Inicio; icons-only (`LABEL_MODE` const) | LOW |
| | 1.2 Contextual hide — hide-on-scroll (8px down-delta, spring back up) · auto-hide on keyboard (visualViewport) · hide on `/l/[id]`, `/checkout`, `/messages/[id]`, `/sell` | LOW |
| **2 · Persistent search + Cuenta hub** | 2.1 Persistent header search (mobile + desktop; remove `.pwa-search-hide`); desktop centers search + inline "Agente IA" affordance | LOW (announce: shared `layout.tsx`/`globals.css`) |
| | 2.2 New `CuentaMenu.tsx`: Favoritos · Pedidos · Suscripciones · Referidos · Notificaciones · Agente IA · Tema · "Cambiar a modo vendedor" → `/shop/manage`; collapse the scattered header items into it | LOW |
| | 2.3 One agent entry point — remove the bare ✨ icons (desktop sparks, mobile `AIAgentButton`) | LOW |
| **3 · Seller-mode shell** | 3.1 Suppress buyer chrome under `/shop/manage` (extend the `layout.tsx` gate via a pure `isSellerModePath`) + `app/shop/manage/layout.tsx`; dark brand top bar + "Volver a comprar" | **HIGH** |
| | 3.2 New `SellerNav.tsx` — desktop left rail (Operar: Resumen·Pedidos·Ofertas·Anuncios / Crecer: Analítica·Promociones·Eventos·Importar·Ajustes); mobile bar (Resumen·Pedidos·Ofertas·Anuncios·Más) | LOW |
| **4 · Naming + one-agent-entry cleanup** | 4.1 `/sell` = publish action, `/vende` = signed-out landing — wire entry points (no `/vende` content edit) | LOW |
| | 4.2 Vecindario reachable from the Inicio feed + header/footer (it left the bar) | LOW |

## Deploy order
Frontend-only; each sprint independently shippable. **S1 → S2 → S3 → S4.** S3 is the only HIGH sprint
(Daniel merges). **S2 + S3 touch shared surface (`layout.tsx`, `globals.css`) — merge latest `main` first and
announce the cross-cutting touch** before opening each PR (LEARNINGS: shared-surface changes break sibling PRs).

## Definition of Done (epic)
- [x] All four sprints merged to `main` + smoke-tested (gaps stated)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs); PWA-standalone + seller-session steps flagged **owed to Daniel**
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated — 01 (PWA app experience) + Recent highlights; seller-mode line under 03
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Feature branch deleted; seed frontmatter `status: shipped`
