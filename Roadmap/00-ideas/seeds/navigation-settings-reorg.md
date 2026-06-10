---
title: "Navigation & Settings Reorg"
slug: navigation-settings-reorg
status: scaffolded                  # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "09"                          # 09-platform-infra (the app-shell / chrome lives here)
type: epic
priority: null
risk: high                          # one sprint touches the global app-shell suppression gate
epic: "09-platform-infra/navigation-settings-reorg"
build_order: null
updated: 2026-06-10
---

# Navigation & Settings Reorg — scope (Definition of Ready)

> Source: nav + settings audit (Miyagi Sánchez). Branch: `feat/nav-reorg`. es-MX default.
> Groomed via the `groom` skill (Cowork). **Planning only — this doc is the gate; nothing scaffolds
> until Daniel approves it.**

## Mirror (the ask in one line)
Separate **buyer / seller / agent** navigation: trim the PWA bottom bar to 4 tabs + a publish FAB,
make header search persistent and the bar contextual, consolidate buyer account links into one Cuenta
hub, and give `/shop/manage` a dedicated seller-mode shell — so each audience gets chrome that fits
their job.

## Classification
**Feature epic** (new seller-nav surface + restructured buyer chrome), carrying a few **chore**-class
naming/entry-point slices. Frontend-only.

## Stage 2.5 — orientation (can we already do this?)
Mostly **light enhancement on existing primitives**, not net-new build:
- **Chrome suppression already exists.** `app/layout.tsx` already drops header/footer/tab-bar for
  white-label (`whiteLabel = isEmbed || isChannel`). Seller mode is a **third suppression context** —
  extend that gate, don't invent one.
- **"Explorar" already exists** as a desktop nav link → `/l`; the new tab adopts the same target.
- **Persistent search** ≈ delete the `.pwa-search-hide` CSS rule + reuse the header `<form action="/l">`.
- **Cuenta hub** consolidates links **already present** in the header (Mi tienda, Favoritos, Mi cuenta,
  theme toggle, `/agent`).
- **`/vende` is already the signed-out seller landing** (built by epic #6 — see Finding below), so the
  audit's point-5 "/vende reframe" is **already live** (bucket 1: already possible) — this epic only
  wires *entry points*, it does not rebuild `/vende`.

**Genuinely new:** the seller-mode shell (`SellerNav.tsx` + a `/shop/manage` layout) and the
`CuentaMenu.tsx` component. Everything else is reorganization of what's there.

## Finding that re-scoped the epic — epic #6 is doc-drift, not unfinished
`#6 seller-acquisition-landing-pages` reads 🏗️ in `BUILD-ORDER.md` with Sprint 3/4 open, but the **code
is fully built**: `app/vende/` has the anchor landing (`buildAnchorPageConfig`, `es.sellerAcquisition.anchor`),
persona pages (`creadores` / `negocios` / `servicios`), the WC wedge (`mundial`), `opengraph-image.tsx`, and
the A/B `SellerAcquisitionVariantTag`. The close-out (epic README ticks + `RETROSPECTIVE.md` + poster line +
LEARNINGS promotion) was never done.
**Action (separate from this epic):** a small doc close-out pass on #6. **Consequence for this epic:** we
**carve `/vende` out** — this epic never edits `/vende` content, removing the shared-surface collision with
#6 entirely.

## Decisions locked with Daniel (2026-06-10)
1. **/vende:** carved out (already shipped by #6). This epic only wires entry-points; #6 needs a doc close-out (tracked separately).
2. **/comunidad → /vecindario merge:** **DEFERRED to a separate ask** (it migrates live publish routes — `comunidad/nuevo`, `comunidad/mis-aportes` — which is heavier than a chrome reorg).
3. **Bar labels:** ship **icons-only as the default**. Keep a code-level `LABEL_MODE` const (values: `icons-only` (default) · `active-label` · `full-labels`) so it's switchable in a commit; **no Flagsmith wiring, no peek mode** for now (overrides the audit's "active-label" default).
4. **Home + shape:** one epic under **09-platform-infra**, ~4 sprints mapping to the audit's 5 sections.

## Medusa-first reframe — what already exists (reuse, don't rebuild)
- `app/layout.tsx` — the `whiteLabel` suppression branch (`isEmbed || isChannel`) → **extend** with a
  seller-mode predicate; the header/footer/`MobileTabBar` render is already gated here.
- `app/components/MobileTabBar.tsx` — the live 5-tab + detached-search-circle + center FAB; trim it in place.
- `app/globals.css` — `.pwa-only`, `.pwa-search-hide`, `.pwa-spacer`, `glass-liquid` conventions.
- Header search `<form action="/l" method="GET">` (mobile) + desktop "Explorar" → `/l` link.
- Account links already in the header: `Mi tienda` (`/shop/manage`), `/account/favorites`, `/account`,
  `PlatformThemeToggle`, `/agent`, `AIAgentButton` → fold into `CuentaMenu`.
- `lib/neighborhood-pulse.ts` (Vecindario copy), Iconoir icons, Space Grotesk, liquid-glass tokens.
- `app/account/*` subpages already exist (favorites, orders, subscriptions, referrals, notificaciones) →
  Cuenta hub just links them.
- `app/shop/manage/*` subpages already exist (orders, offers, analytics, promotions, eventos, import,
  settings, content) → SellerNav just links them; **no new seller pages**.

**AGENTS five rules:** #1 Medusa / #2 Supabase / #4 Clerk — **untouched** (no commerce, no DB, no auth).
#3 UCP/MCP — N/A (UI chrome, not a commerce capability). #5 es-MX — all new labels are es-MX; no new
bilingual surface.

**Scope of change: `app/` + `globals.css` only. No backend, no Cloud Run deploy, no migration, zero new tables.**

## In scope (v1)
- PWA bottom bar: 4 tabs + publish FAB; remove detached search circle; Favoritos→Cuenta, Vecindario→Inicio
  feed; icons-only labels; hide-on-scroll; auto-hide on keyboard; hide entirely on PDP/checkout/messages/[id]/sell.
- Persistent header search (mobile + desktop); desktop center search + inline "Agente IA" affordance.
- `CuentaMenu.tsx` consolidating Favoritos · Pedidos · Suscripciones · Referidos · Notificaciones · Agente IA
  · Tema · "Cambiar a modo vendedor" → `/shop/manage`.
- Seller-mode shell: suppress buyer chrome under `/shop/manage`; dark brand top bar + "Volver a comprar";
  desktop left rail + mobile seller bar (`SellerNav.tsx` + `/shop/manage` layout).
- Naming: `/sell` = publish action, `/vende` = signed-out landing (entry-point wiring only); one agent
  entry point, remove bare ✨ icons.

## Out of scope (v1)
- `/comunidad → /vecindario` content merge + route redirects (**deferred**, separate ask).
- Any `/vende` landing-page content change (owned by #6).
- Flagsmith A/B wiring + `.tabbar--peek` compact mode (deferred; const-switchable only).
- Any backend / Medusa / Supabase / Clerk change.
- The #6 doc close-out (tracked separately, not built here).

## Slices (skateboard → car) — 4 sprints

### Sprint 1 — PWA bottom bar (audit §1) · risk LOW
- **US-1.1** As a buyer on the PWA, I want a focused bottom bar (Inicio · Explorar · [⊕ Vender] · Mensajes
  · Cuenta) so the most-used destinations are one tap away. Remove the detached search circle; move
  Favoritos→Cuenta and Vecindario→Inicio. Icons-only default (`LABEL_MODE` const).
  *Acceptance:* exactly 4 tabs + 1 FAB render; no search circle; tapping Cuenta → `/account`, Vender → `/sell`.
- **US-1.2** As a buyer, I want the bar to get out of the way — hide-on-scroll (translateY off past an 8px
  down-delta, spring back on scroll-up), auto-hide on keyboard (visualViewport resize), and hide entirely on
  `/l/[id]` (PDP), `/checkout`, `/messages/[id]`, `/sell`.
  *Acceptance:* bar hides scrolling down / returns scrolling up; gone on those four route patterns; gone when
  the keyboard is open.
- *QA:* extract route-hide logic into a pure `lib/tabbar-visibility.ts` → **api spec** (free coverage).
  Scroll/keyboard behaviour → **anonymous browser smoke**. PWA-standalone install behaviour → **owed to Daniel**.

### Sprint 2 — Persistent search + Cuenta hub (audit §2 + §3) · risk LOW (announce: touches `layout.tsx` + `globals.css`)
- **US-2.1** As a buyer, I want search always visible (mobile + desktop) so I can search from anywhere.
  Remove `.pwa-search-hide`; desktop centers the search bar with an inline "Agente IA" affordance.
  *Acceptance:* search field renders in the PWA standalone header; desktop search is centered with the
  Agente IA affordance inline.
- **US-2.2** As a buyer, I want one Cuenta menu (`CuentaMenu.tsx`): Favoritos · Pedidos · Suscripciones ·
  Referidos · Notificaciones · Agente IA · Tema · "Cambiar a modo vendedor" → `/shop/manage`. Collapse
  Mi tienda / Favoritos / Mi cuenta / theme / agent out of the top-level header into it.
  *Acceptance:* the menu lists all eight entries pointing at the existing routes; header no longer shows
  the separate Mi tienda / Favoritos / theme / agent items.
- **US-2.3** As any user, I want a single agent entry point — remove the bare ✨ icons (desktop sparks link,
  mobile `AIAgentButton`) in favour of the "Agente IA" affordance.
  *Acceptance:* no standalone ✨ icon in header/footer; exactly one agent entry (search affordance + Cuenta).
- *QA:* Cuenta menu items list → pure module → **api spec**. Persistent-search render + menu open →
  **anonymous browser smoke** (header search renders without `.pwa-search-hide`).

### Sprint 3 — Seller-mode shell (audit §4) · risk HIGH (Daniel merges — alters the global app-shell suppression gate)
- **US-3.1** As a seller, I want buyer chrome suppressed under `/shop/manage` and a dark brand top bar with
  "Volver a comprar", so managing my shop feels like a distinct space. Add `app/shop/manage/layout.tsx` +
  extend the `layout.tsx` suppression predicate (reuse the `whiteLabel` pattern via a pure
  `isSellerModePath`/seller-mode flag).
  *Acceptance:* `/shop/manage/*` shows no buyer header/tab-bar; the dark seller top bar renders; "Volver a
  comprar" returns to the marketplace.
- **US-3.2** As a seller, I want a seller nav (`SellerNav.tsx`): desktop left rail (Operar:
  Resumen·Pedidos·Ofertas·Anuncios / Crecer: Analítica·Promociones·Eventos·Importar·Ajustes); mobile bar
  (Resumen·Pedidos·Ofertas·Anuncios·Más) — linking the existing `/shop/manage/*` subpages.
  *Acceptance:* every rail/bar entry routes to its existing manage subpage; active state reflects the route.
- *QA:* the suppression predicate + nav section config → pure modules → **api specs**. Chrome-suppression
  render (no buyer header on `/shop/manage`) → **authed browser smoke owed to Daniel** (seller session).
  ⚠️ Blast radius = the whole app shell; CI-vs-preview is the gate, plus a Daniel visual pass.

### Sprint 4 — Naming & one-agent-entry cleanup (audit §5, comunidad deferred) · risk LOW
- **US-4.1** As a signed-out visitor, I want "Vende"/"Publicar" CTAs to land on the `/vende` landing, while
  the publish action stays `/sell`, so the sell story and the publish action are distinct.
  *Acceptance:* signed-out seller CTAs → `/vende` (the existing #6 landing); the bottom-bar FAB + "Publicar"
  → `/sell`. No `/vende` content edits.
- **US-4.2** As a buyer, I want Vecindario reachable from the Inicio feed (since it left the bar) and from
  header/footer, so the move doesn't orphan it.
  *Acceptance:* a Vecindario entry point exists in the Inicio feed; header/footer Vecindario links still work.
- *QA:* entry-point hrefs → covered by the existing route/link **api spec**; signed-out vs signed-in CTA →
  **anonymous browser smoke**.

## Deploy order
Frontend-only, each sprint independently shippable. **S1 → S2 → S3 → S4.** S3 is the only HIGH sprint
(Daniel merges); S1/S2/S4 are LOW (reviewer may auto-merge on green CI) but **S2 and S3 touch shared
surface (`layout.tsx`, `globals.css`) — announce before merge** to avoid breaking sibling PRs (per LEARNINGS).

## Open risks / notes
- **Shared-surface contention.** `layout.tsx` + `globals.css` are edited by S2 + S3 and by sibling epics.
  Merge latest `main` before opening each PR; announce the cross-cutting touch.
- **Duplicate-render idiom caution (LEARNINGS).** If S1/S3 reorder elements between mobile/desktop, drive
  show/hide from classes only — never an inline `display` on a toggled element (it beats `md:hidden`).
- **White-label vs seller-mode.** Confirm the seller-mode suppression composes with (doesn't double-fire
  against) the existing `whiteLabel` branch — a seller managing a shop on a custom domain is an edge to test.
- **PWA standalone smoke is owed to Daniel** (install-to-home-screen behaviour, keyboard auto-hide on a real
  device — an automated browser can't fully cover it).

## Definition of Ready — checklist
- [x] "As a / I want / so that" per story; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (mostly light-enhancement; seller shell + CuentaMenu are the new bits).
- [x] v1 in/out boundary written (comunidad merge + /vende content + Flagsmith out).
- [x] Reuse list produced (Medusa-first reframe done — frontend-only, no backend).
- [x] Each story risk-tiered; QA stage named; PWA smoke owner = Daniel.
- [ ] **Daniel approves this scope doc** ← the gate.
