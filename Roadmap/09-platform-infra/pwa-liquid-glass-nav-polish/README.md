---
status: scaffolded
slug: pwa-liquid-glass-nav-polish
---

# Epic — PWA Liquid-Glass Nav Polish

> **Macro-section:** [09 · Platform & Infra](../README.md) · **Branch:** `feat/pwa-glass-nav` ·
> **Risk: LOW overall** (frontend-only; S1.3 + S2.2 touch shared `globals.css`/`layout.tsx` — announce).
> Reviewer may auto-merge LOW stories on green CI **unless** they touch shared layout.
> **Status: 📋 SCAFFOLDED — not started.** Scope doc:
> [`00-ideas/seeds/pwa-liquid-glass-nav-polish.md`](../../00-ideas/seeds/pwa-liquid-glass-nav-polish.md).
> Source: Claude-Design redesign (`handoff/Liquid-Glass-Navbars-(standalone).html`). es-MX default · light mode first.

## Why
The installed-PWA bottom bar is functional but not yet the polished iOS-26 **Liquid-Glass** experience a
native-feeling marketplace app should have. Daniel produced a redesign that (a) lifts the glass quality and
(b) rethinks the search interaction. The redesign also **deliberately reverses two nav-reorg decisions**
(2026-06-11): it re-adds a **detached search control** and pulls **Favoritos** back to a top-level tab.
Daniel chose the full reversal knowingly. This epic restyles + restructures the live bar and replaces the
page-nav search with an in-app **bottom-sheet search** — frontend-only, reusing existing primitives.

## Context

| Question | Answer |
|---|---|
| **Who** | Buyers on the installed PWA (iOS + Android) |
| **Job** | Reach my core destinations and search **without leaving the page**, in an app that feels native |
| **Outcome signal** | Bar reads `Inicio · Mensajes · ⊕ · Favoritos · Perfil` (icons-only); tapping the detached search opens a glass **bottom-sheet** (keyboard-focused, recent + suggested) — **no page transition**; glass matches the mockup in light mode; one primary search control on mobile |
| **In v1** | Bar re-order + icons-only · detached glass search control · bottom-sheet search (iOS-safe) · demote mobile header search · liquid-glass polish (light) |
| **Out (deferred)** | Dark-mode polish pass (tokens stay wired) · top-bar IA overhaul (only an optional glass-parity touch) · in-place morph animation · any `/l` results redesign · any backend/Medusa/UCP/Supabase change |
| **Risk tier** | LOW overall. S1.3 + S2.2 touch shared `globals.css`/`layout.tsx` — **announce** before each PR. |

## Medusa-first note
**Frontend-only — `app/` + `globals.css`. No backend, no Cloud Run, no migration, zero new tables.**
AGENTS rules #1 (Medusa) / #2 (Supabase — favorites already there) / #4 (Clerk) untouched; #3 (UCP/MCP) N/A
(UI chrome); #5 (bilingual) — any new string (`Búsquedas recientes`, etc.) ships `es` + `en` keys.

## What already exists (reuse, don't rebuild)
- **`app/components/MobileTabBar.tsx`** (live, reorg version) — re-order + restyle **in place**.
- **Old `MobileTabBar.tsx` at merged commit `36ba5ca`** (2026-05-30, pre-reorg; the `feat/inventory`
  branch is merged into `main` and deleted) — **reference only** for the detached-search markup and the
  iOS synchronous-`focus()` trick. **Not the base** — branch off latest `main`.
- **Discovery Polish S2 filter bottom-sheet** — the apply-gated mobile sheet ("Filtrar y ordenar" → live
  "Ver X resultados"). **Reuse this sheet seam** for the search sheet; don't build a new overlay primitive.
- **`/l` + `/l?q=`** — Medusa-backed listings/search. The sheet only composes a query and navigates.
- **`/account/favorites` + `marketplace_favorites`** + `CuentaMenu` — Favoritos is a **link** (keep in
  `CuentaMenu` for desktop; add the mobile-PWA tab).
- **`globals.css`** — `--glass-fill-liquid`, `--glass-blur*`, `.glass-liquid`, `:root[data-mode="dark"]`
  glass tokens. Tune to the mockup; don't hand-roll glass.
- **`lib/tabbar-visibility.ts`** — contextual hide (scroll / keyboard / immersive routes). Keep + extend.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| **1 · Bar restructure + glass polish (light)** | 1.1 Re-order to `Inicio · Mensajes · ⊕ Vender · Favoritos · Perfil`; icons-only; drop Explorar tab; Favoritos→tab (mobile) + keep in `CuentaMenu` (desktop) | LOW |
| | 1.2 Detached liquid-glass search control restored right of the pill; opens the sheet (S2) | LOW |
| | 1.3 Liquid-glass visual polish (light) — tune fill · blur · saturation · active-capsule · specular to mockup; keep safe-area + `tabbar-visibility` | LOW (announce: `globals.css`) |
| **2 · Bottom-sheet search + dedup** | 2.1 Bottom-sheet search — reuse filter-sheet seam; synchronous `focus()` + `touch-action:auto`; recent (pure helper + localStorage) + suggested; submit → `/l?q=`; scrim/dismiss; keyboard/safe-area aware | LOW |
| | 2.2 Demote/hide persistent header search on mobile PWA (bottom is primary); desktop unchanged | LOW (announce: shared `layout.tsx`/`globals.css`) |
| | 2.3 (optional) Top-bar glass-parity touch — align header glass with the bar; collapse redundant top-level action icons | LOW |

## Deploy order
Frontend-only; each sprint independently shippable. **S1 → S2.** S1.3 + S2.2 touch shared surface — **merge
latest `main` first and announce the cross-cutting touch** before opening each PR (LEARNINGS: shared-surface
changes break sibling PRs). Compressible to a single sprint if Daniel prefers.

## Definition of Done (epic)
- [ ] Both sprints merged to `main` + smoke-tested (gaps stated).
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs); **PWA-standalone + real-device-keyboard steps flagged owed to Daniel**.
- [ ] This README marked ✅; every sprint status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] **Reconcile the doc-drift this epic creates:** update the **nav-reorg** docs + the **product poster**
      (the PWA bar is no longer `Inicio · Explorar · ⊕ · Mensajes · Cuenta` with Favoritos-in-Cuenta).
- [ ] Team memory + `MEMORY.md` index updated; durable learnings promoted to `LEARNINGS.md`.
- [ ] Feature branch deleted; seed frontmatter `status: shipped`.
