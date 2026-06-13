---
title: "PWA Liquid-Glass Nav Polish"
slug: pwa-liquid-glass-nav-polish
status: scaffolded                  # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "09"                          # 09-platform-infra (the app-shell / chrome lives here)
type: feature                       # frontend-only UI/UX polish + partial revert of nav-reorg
priority: null
risk: low                           # frontend-only; touches shared globals.css/layout.tsx (announce)
epic: "09-platform-infra/pwa-liquid-glass-nav-polish"   # scaffolded 2026-06-13
build_order: null                   # brand-new ask, not part of the #1–#7 batch
updated: 2026-06-13
---

# PWA Liquid-Glass Nav Polish — scope (Definition of Ready)

> Source: a Claude-Design redesign of the PWA bottom bar (`handoff/Liquid-Glass-Navbars-(standalone).html`).
> Groomed via the `groom` skill (Cowork). **Planning only — this doc is the gate; nothing scaffolds until
> Daniel approves it.** es-MX default. Light mode ships first.

## Mirror (the ask in one line)
Restyle the installed-PWA bottom bar to the new iOS-26 **Liquid-Glass** design — reorder it to
**Inicio · Mensajes · ⊕ Vender · Favoritos · Perfil** (icons-only, no text labels) with a **detached glass
search control** that opens a **bottom-sheet search** (keyboard-focused, iOS-safe) — light mode first — so
the installed app feels like a polished, native glass app. Right?

## Classification
**Feature — frontend-only UI/UX polish**, carrying a deliberate **partial revert** of the Navigation &
Settings Reorg (shipped 2026-06-11). No backend, no DB, no auth, no UCP surface. The focus is design / UX /
UI at the highest level: glass quality + the search interaction.

## ⚠️ Two findings that reshape this ask (validated, not assumed)

### 1. The checked-out code is stale — do **not** build from it
`apps/miyagisanchez` is currently on branch **`feat/inventory`** (last touched **2026-05-25**), which
**predates** the nav-reorg. Its `app/components/MobileTabBar.tsx` already shows the *old* 5-element layout
(Inicio · Mensajes · ⊕ · Favoritos · Perfil **+ detached search circle**, **with labels**) — which happens
to resemble the target, but it is **not what is live** and **not latest `main`**.
**Action:** build branches off **latest `main`** (the reorg state). The `feat/inventory` `MobileTabBar.tsx`
is a useful **reference** for the detached-search markup and the iOS synchronous-`focus()` trick — reference
only, never the base.

### 2. This ask reverses two decisions the nav-reorg shipped 2 days ago — Daniel confirmed, eyes open
What is **live on prod today** (screenshot + reorg docs): **Inicio · Explorar(🔍→`/l`) · ⊕ Vender · Mensajes
· Cuenta** — 4 tabs + center FAB, icons-only, **no detached search circle**, **Favoritos lives in the Cuenta
hub**. Tapping Explorar/search **navigates to `/l`** (a page) — *validated; this is the "takes the user to a
new page" behaviour Daniel flagged.*
The new design **re-adds the detached search** (reorg removed it: *"search floats as its own control"*) and
**promotes Favoritos back to a top-level tab** (reorg moved it into Cuenta: *"Favoritos… competes with the
core journey"*). **Daniel chose the full reversal knowingly (2026-06-13).** Consequence: the epic close-out
**must** update the nav-reorg docs + product poster so they don't silently lie (LEARNINGS: doc-drift).

## Decisions locked with Daniel (2026-06-13)
1. **Order:** **full reversal** → `Inicio · Mensajes · ⊕ Vender · Favoritos · Perfil` + a detached search control.
2. **Labels:** **icons-only** (no text labels). (Reuse the reorg's `LABEL_MODE` const if still present; default `icons-only`.)
3. **Search interaction:** **bottom-sheet search** (pattern B). Tap the detached search → a glass sheet rises
   above the bar with the input (keyboard-focused, iOS-safe) + **recent + suggested searches**; submit → `/l?q=`.
   *(Pattern A in-place morph was the `feat/inventory` attempt that "didn't work" — the iOS 18 PWA keyboard
   bug, not the concept. B is more robust and adds recognition-over-recall. Morph kept only as optional polish.)*
4. **Search is primary at the bottom:** **demote / hide the persistent header search on the mobile PWA** so
   there is one primary search control (desktop header search unchanged).
5. **Theme:** **light mode first**. Dark wired via the existing `:root[data-mode="dark"]` glass tokens but
   validated in a later pass (deferred, not dropped).
6. **Scope discipline:** "not a huge project — mostly polishing the liquid glass + the interaction."

## Stage 2.5 — orientation (can we already do this?) → mostly **light enhancement on existing primitives**
- **The bar exists** — `app/components/MobileTabBar.tsx` (live, reorg version). Re-order + restyle in place.
- **The detached-search affordance + iOS-safe `focus()` already shipped once** (pre-reorg, on `feat/inventory`)
  — reference its markup; don't reinvent.
- **A glass bottom-sheet pattern already ships** — Discovery Polish S2's **apply-gated mobile filter
  bottom-sheet** ("Filtrar y ordenar" → live "Ver X resultados"). **Reuse that sheet mechanism** for the search
  sheet; don't build a new overlay primitive.
- **Search target exists** — `/l` (and `/l?q=`) is the Medusa-backed listings/search page. The sheet only
  composes a query and navigates.
- **Favoritos already exists** — `/account/favorites` page + `marketplace_favorites` (Supabase, AGENTS rule #2).
  Promoting it to a tab is a **link**, not new data. Keep it in `CuentaMenu` for **desktop** (no tab bar there);
  add the **mobile-PWA tab** — different surfaces, no duplication conflict.
- **Liquid-glass tokens exist** — `globals.css`: `--glass-fill-liquid`, `--glass-blur*`, `.glass-liquid`
  (`blur(32px) saturate(200%) brightness(1.05)`), dark variants under `:root[data-mode="dark"]`. Tune these to
  the mockup; don't hand-roll new glass.
- **Contextual hide exists** — `lib/tabbar-visibility.ts` (`shouldHideTabBar`, hide-on-scroll, keyboard,
  immersive routes). Keep + extend for the new sheet/keyboard interplay.

**Genuinely new (small):** the search **bottom-sheet** component (composed from the existing sheet seam) and a
small pure **recent-searches** helper. Everything else is reorder + restyle + relink.

## Medusa-first reframe (reuse, don't rebuild)
**Frontend-only — `app/` + `globals.css`. No backend, no Cloud Run, no migration, zero new tables.** AGENTS
rules #1 (Medusa) / #2 (Supabase — favorites already there) / #4 (Clerk) untouched; #3 (UCP/MCP) N/A (UI
chrome, not a commerce capability); #5 (bilingual) — any new string (e.g. "Búsquedas recientes") gets
`es` + `en` keys.

| Need | Reuse |
|---|---|
| Bottom bar | `app/components/MobileTabBar.tsx` (live) — re-order + restyle in place |
| Detached search markup + iOS `focus()` | `feat/inventory` `MobileTabBar.tsx` — **reference only** |
| Search overlay | Discovery Polish S2 **filter bottom-sheet** seam |
| Search results | `/l?q=` (Medusa-backed) |
| Favoritos | `/account/favorites` + `marketplace_favorites`; `CuentaMenu` (desktop) |
| Glass look | `globals.css` `.glass-liquid` + `--glass-*` tokens (light + dark) |
| Contextual hide | `lib/tabbar-visibility.ts` |

## UX heuristics (the lens — Daniel asked to always come back to these)
- **#8 Aesthetic & minimalist (Nielsen)** — icons-only bar; **one** primary search control (kills the
  header-vs-bar search redundancy); restrained glass, not noise.
- **#6 Recognition over recall** — the search sheet surfaces **recent + suggested** searches, not a blank box.
- **#4 Consistency & standards** — matches the iOS-26 floating-glass tab-bar convention buyers expect on an installed app.
- **#1 Visibility of system status** — active-tab capsule, the bar's contextual hide, keyboard-aware sheet.
- **Fitts's law / thumb-zone** — primary actions sit in the bottom reach arc; **44 px** minimum hit targets;
  the ⊕ FAB stays center as the fattest target.
- **Heuristic risk to manage** — promoting Favoritos + re-adding search **re-introduces the exact competition
  the reorg removed**. Mitigation: icons-only keeps it light, and search is a *detached* control, not a 6th tab.

## In scope (v1)
- Re-order the live bar to `Inicio · Mensajes · ⊕ Vender · Favoritos · Perfil`, **icons-only**.
- Detached **liquid-glass search control** to the right of the pill.
- **Bottom-sheet search** (iOS-safe focus, recent + suggested, submit → `/l?q=`).
- **Demote/hide** the persistent header search on the mobile PWA.
- **Liquid-glass visual polish (light)** — tune fill opacity, blur, saturation, active-capsule opacity,
  optional specular highlight to the mockup; preserve safe-area + contextual hide.

## Out of scope (deferred — prevents creep)
- **Dark-mode polish pass** (tokens stay wired; validated later).
- **Top bar** — beyond an optional light glass-parity touch (see Sprint 2.3); no IA overhaul this round.
- In-place **morph** animation (optional future polish; sheet ships first).
- Any backend / Medusa / UCP / Supabase change. Any `/l` search-results redesign.

## Slices (skateboard → car) — small; compressible to one sprint if Daniel prefers

### Sprint 1 — Bar restructure + glass polish (light)
- **1.1** Re-order to `Inicio · Mensajes · ⊕ Vender · Favoritos · Perfil`; icons-only; drop the Explorar tab
  (search moves to the detached control); Favoritos→tab (mobile) while staying in `CuentaMenu` (desktop). **LOW**
- **1.2** Detached liquid-glass search control (button) restored to the right of the pill; opens the sheet (S2). **LOW**
- **1.3** Liquid-glass visual polish (light) — tune `.glass-liquid` / bar to mockup (fill · blur · saturation ·
  active-capsule · specular); keep safe-area + `tabbar-visibility`. **LOW** *(touches `globals.css` — announce)*

### Sprint 2 — Bottom-sheet search + dedup (+ optional top-bar touch)
- **2.1** Bottom-sheet search overlay — reuse the filter-sheet seam; input with **synchronous `focus()` in the
  tap + `touch-action: auto`**; **recent searches** (pure helper + localStorage) + suggested; submit → `/l?q=`;
  scrim + dismiss; keyboard/safe-area aware. **LOW**
- **2.2** Demote/hide the persistent header search on the mobile PWA (bottom is primary); desktop unchanged. **LOW**
  *(touches shared `layout.tsx`/`globals.css` — announce)*
- **2.3 (optional)** Top-bar glass-parity touch — align header glass with the bar; collapse any redundant
  top-level action icons. **LOW**

## QA / smoke (per WAYS-OF-WORKING — every story names its gate)
- **api specs (the gate):** extend `e2e/tabbar-visibility.spec.ts` for the new order/`icons-only`; new pure
  `lib/search-recents.ts` (add/dedupe/cap recents; build `/l?q=`) with its own spec. `tsc --noEmit` + `npm run
  build` + Playwright `api` green before merge.
- **anonymous browser smoke (agent-covered):** sheet open/dismiss + the bar render (note: `display-mode:
  standalone` is **not emulatable** in headless Chromium — use the reorg's phone-viewport + forced-visible
  override idiom).
- **owed to Daniel (browser):** real **PWA-standalone** install look, **real-device keyboard** raising the
  sheet on iOS, and the **glass appearance** on a real screen.

## Open risks
1. **Stale branch** — must branch off latest `main`; `feat/inventory` is reference only.
2. **iOS 18 PWA keyboard bug** (WebKit #279904) — the keyboard can fail to appear for inputs in installed PWAs;
   mitigate with synchronous `focus()` + `touch-action: auto` on the input. The bottom-sheet pattern degrades
   gracefully (a tap on the visible field always raises the keyboard).
3. **`display-mode: standalone` non-emulatable** — automated browser can't fully cover the real PWA bar; PWA
   smoke owed to Daniel.
4. **2026 DMA note** — in some regions PWAs may open in Safari tabs rather than standalone, which would hide the
   `.pwa-only` bar; out of scope but worth a sanity check on the target install path.
5. **Doc-drift** — this reverses nav-reorg decisions; epic close-out **must** reconcile the nav-reorg docs +
   poster, or the next groom inherits a lie.

## Research citations (present-day, confirmed 2026-06-13)
- iOS shows the keyboard only on **synchronous** `focus()` inside the user gesture (no `setTimeout`).
- iOS 18 PWA keyboard-on-input regression + the `touch-action: auto` workaround — WebKit bug #279904.
- 2026 PWA/DMA note: PWAs may open in Safari tabs in some contexts.
  Sources: magicbell.com PWA-iOS guide; WebKit #279904; martijnhols.nl on-screen-keyboard detection.

## Definition of Ready — met
- [x] As-a/I-want/so-that clear; acceptance testable by Daniel (smoke walkthroughs at scaffold).
- [x] Stage-2.5 bucket named (**light enhancement** on existing primitives).
- [x] v1 in/out boundary written; iOS research cited.
- [x] Reuse list produced (Medusa-first reframe done).
- [x] Each story risk-tiered (all LOW; shared-surface announces flagged); QA stage named; PWA/keyboard smokes owed to Daniel.
- [ ] **Daniel approves this scope doc → then scaffold the epic under `09-platform-infra/`.**
