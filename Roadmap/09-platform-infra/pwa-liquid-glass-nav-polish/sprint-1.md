# PWA Liquid-Glass Nav Polish — Sprint 1: Bar restructure + glass polish (light)

**Status:** 📋 NOT STARTED · **Risk:** LOW (S1.3 touches `globals.css` — announce) ·
**Branch:** `feat/pwa-glass-nav` (off latest `main`) ·
**Files (expected):** `app/components/MobileTabBar.tsx`, `app/globals.css`,
`lib/tabbar-visibility.ts` (extend), `e2e/tabbar-visibility.spec.ts` (extend), `app/components/CuentaMenu.tsx` (Favoritos dedup for desktop).

> ⚠️ **Branch off latest `main`.** The repo's checked-out `feat/inventory` is stale (May-25, pre-reorg) —
> reference only. The live bar to restyle is the **reorg** `MobileTabBar.tsx` on `main`.

## Stories

### Story 1.1 — Re-order the bar + icons-only
**As a** buyer on the PWA, **I want** a bar ordered `Inicio · Mensajes · ⊕ Vender · Favoritos · Perfil`,
icons only, **so that** my core destinations are one thumb-tap away in a clean, native-feeling bar.
**Acceptance:**
- Bar renders exactly: **Inicio** (`/`) · **Mensajes** (`/messages`) · **⊕ Vender** center FAB (`/sell`) ·
  **Favoritos** (`/account/favorites`, signed-out → `/sign-in` or `/l` per current convention) · **Perfil**
  (`/account`, signed-out → `/sign-in`). **No text labels.**
- The **Explorar** tab is gone (search now lives in the detached control, S1.2 + S2.1).
- Favoritos is removed from `CuentaMenu` on **mobile PWA only** (it's a tab there) but **stays in
  `CuentaMenu` on desktop** (no tab bar on desktop) — no duplicate primary control on any one surface.
- Active-tab capsule + unread dot on Mensajes preserved. 44 px min hit targets.
**Risk:** LOW

### Story 1.2 — Detached liquid-glass search control
**As a** buyer, **I want** a distinct glass search button beside the bar **so that** search is always one tap
away without crowding the tabs.
**Acceptance:**
- A detached, circular **`.glass-liquid`** search control sits to the right of the pill (mockup layout).
- Tapping it opens the bottom-sheet search (wired in S2.1); until then it is present + styled + accessible
  (`aria-label="Buscar"`).
- Respects safe-area + the existing contextual-hide behaviour (hides with the bar).
**Risk:** LOW

### Story 1.3 — Liquid-glass visual polish (light)
**As a** buyer, **I want** the bar to look like polished iOS-26 liquid glass **so that** the installed app
feels premium.
**Acceptance:**
- Tune the bar/control glass to the mockup in **light mode**: fill opacity, backdrop blur, saturation,
  **active-capsule** opacity, and an optional **specular** top highlight — driven by `globals.css` tokens
  (`--glass-fill-liquid`, `--glass-blur*`, `.glass-liquid`), not per-component hardcoding.
- Dark tokens (`:root[data-mode="dark"]`) left intact and roughly correct, but **not** the focus this sprint.
- Safe-area insets + `lib/tabbar-visibility.ts` contextual hide unchanged in behaviour.
- No regression to non-PWA / desktop chrome.
**Risk:** LOW (shared `globals.css` — **announce** before PR; merge latest `main` first)

## Sprint QA
- **api spec (the gate):** extend `e2e/tabbar-visibility.spec.ts` — assert the new tab set/order +
  `icons-only` default via the pure `lib/tabbar-visibility.ts` helpers (route-hide patterns unchanged).
- **anonymous browser smoke (agent-covered):** bar render + 4-tab+FAB+search-control presence (use the
  reorg's phone-viewport + forced-visible override — `display-mode: standalone` is not emulatable in headless Chromium).
- **owed to Daniel (browser):** the real **PWA-standalone** look + the **glass appearance** on a device.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL while testing pre-merge)

1. On a phone, open https://miyagisanchez.com and **Add to Home Screen**; launch from the icon (standalone). **[owed to Daniel — PWA standalone]**
   → The bottom bar shows exactly **Inicio · Mensajes · ⊕ · Favoritos · Perfil** (icons only) **plus a separate round search button** to the right. No "Explorar" tab.
2. Tap **Favoritos**.
   → You land on `/account/favorites` (signed-out → sign-in).
3. Tap **Perfil**.
   → You land on `/account` (signed-out → sign-in).
4. Tap the **⊕** center button.
   → You land on the publish flow (`/sell`).
5. Look at the bar against the colorful feed. **[owed to Daniel — device]**
   → The glass reads as translucent, blurred, saturated — matching the light-mode mockup; the active tab has a soft capsule.
6. Scroll the feed down then up.
   → The bar (and search button) slide away on scroll-down and spring back on scroll-up; gone on `/l/[id]`, `/checkout`, `/messages/[id]`, `/sell`.

If any step fails, note the step number + what you saw — that's the bug report.
