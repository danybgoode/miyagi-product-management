# PWA Liquid-Glass Nav Polish — Sprint 1: Bar restructure + glass polish (light)

**Status:** ✅ BUILT — [PR #98](https://github.com/danybgoode/miyagisanchezcommerce/pull/98) (draft, risk LOW);
deterministic gate green locally (`tsc` + `build` + Playwright `api`, 15 pure tests) + anonymous bar browser
smoke passing vs local `next start`; awaiting CI-vs-preview + reviewer + merge.
Commits: S1.1 `ff90a63` · S1.2 `f07e4d0` · S1.3 `7e3535b` + mockup-match `90677c5` · smoke `3b46783`. · **Risk:** LOW
(S1.3 touches `globals.css` — announced; branch merged latest `main` first) ·
**Branch:** `feat/pwa-glass-nav` (off latest `main`) ·
**Files (touched):** `app/components/MobileTabBar.tsx`, `app/globals.css`,
`lib/tabbar-visibility.ts` (+ `BOTTOM_TABS` / `resolveBottomTabHref` / `isBottomTabActive`),
`e2e/tabbar-visibility.spec.ts` (extended), `e2e/tabbar.browser.spec.ts` (flipped to new shape),
`app/components/CuentaMenu.tsx` + `app/layout.tsx` (PWA-only Favoritos dedup via new `.pwa-hidden`).

> ⚠️ **Branch off latest `main`.** The old `feat/inventory` `MobileTabBar.tsx` (merged commit `36ba5ca`,
> 2026-05-30, pre-reorg) is **reference only** — that branch is merged into `main` and deleted. The live bar
> to restyle is the **reorg** `MobileTabBar.tsx` on `main`.

## Stories

### Story 1.1 — Re-order the bar + icons-only ✅ `ff90a63`
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
**Implemented:** bar renders from a pure `BOTTOM_TABS` descriptor in `lib/tabbar-visibility.ts` (single
source the api spec reads). Favoritos dedup is **CSS-only** — a new `.pwa-hidden` utility (mirror of
`.pwa-only`) tags the Favoritos row on the **mobile-header** `CuentaMenu` instance, so it hides only under
`display-mode: standalone` and stays visible on desktop **and mobile web**. Signed-out targets → `/sign-in`.

### Story 1.2 — Detached liquid-glass search control ✅ `f07e4d0`
**As a** buyer, **I want** a distinct glass search button beside the bar **so that** search is always one tap
away without crowding the tabs.
**Acceptance:**
- A detached, circular **`.glass-liquid`** search control sits to the right of the pill (mockup layout).
- Tapping it opens the bottom-sheet search (wired in S2.1); until then it is present + styled + accessible
  (`aria-label="Buscar"`).
- Respects safe-area + the existing contextual-hide behaviour (hides with the bar).
**Risk:** LOW
**Implemented:** the wrapper is now a flex row — the pill (`flex:1`) + a 56px `.glass-liquid` circle (reusing
the `.search-circle-btn` press class) sharing the wrapper's hide transform. **Interim:** the control is a
`Link href="/l"` (search one tap away; never a dead button on prod between sprint merges) — **S2.1 swaps it to
a button that opens the bottom-sheet search.**

### Story 1.3 — Liquid-glass visual polish (light) ✅ `7e3535b`
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
**Implemented:** matched the handoff mockup **`handoff/Liquid-Glass-Navbars-(standalone).html`** (`.glass-surface`)
exactly (commit `90677c5`):
- glass = fill `rgba(249,249,247,0.50)`, `blur(32px) saturate(180%) brightness(1.018)`, and the exact box-shadow
  (top specular `0.78` + bottom rim + **edge-refraction ring** + outer hairline + dual float shadow); a dark
  `.glass-liquid` override added from the mockup's dark `.glass-surface`.
- geometry = pill height 64 / radius 32 / padding `0 8px`, tabs `flex:1`; search bubble 60px (`fg-muted` icon);
  FAB 46 / icon 24 / mockup shadow.
- active capsule = the **white inner-glass pane** `rgba(255,255,255,0.68)` per `.tab-btn.active::before`
  (replaces the prior pale-green `--accent-soft` pill), tokenized `--glass-capsule-fill/-stroke` so light **and**
  dark read right.
- All values are **`:root` tokens** (`--glass-blur/sat/bright/specular/fill-liquid`, `--glass-capsule-*`) →
  dialed from one place, no per-component hardcoding. Same glass applies to `SellerNav.tsx` (shared `.glass-liquid`).

**Owed to Daniel:** the device eyeball confirming the on-screen match (translucency/legibility of `0.50` fill vs
the mockup is a real-screen call — automation can't see `display-mode: standalone` glass).

## Sprint QA
- **api spec (the gate) ✅:** extended `e2e/tabbar-visibility.spec.ts` — asserts `BOTTOM_TABS` set/order,
  `resolveBottomTabHref` (signed-out → `/sign-in`), `isBottomTabActive`, and `icons-only` via the pure
  `lib/tabbar-visibility.ts` helpers (route-hide patterns unchanged). 15 tests pass.
- **anonymous browser smoke (agent-covered) ✅:** `e2e/tabbar.browser.spec.ts` flipped to the new shape
  (set/order, detached search control present, Explorar/Cuenta gone, FAB→`/sell`, Buscar→`/l`, auth-gated →
  `/sign-in`) + hide-on-scroll. Passed vs local `next start` (phone-viewport + forced-visible override —
  `display-mode: standalone` is not emulatable in headless Chromium; PDP route-hide skipped — no local catalog).
- **owed to Daniel (browser):** the real **PWA-standalone** look, the **device glass appearance** vs the
  mockup, the **real-device keyboard**, and the **PWA-only Favoritos dedup** (standalone media not emulatable).
- **deterministic gate ✅:** `tsc --noEmit` + `npm run build` + Playwright `api` green locally; CI re-runs the
  `api` suite vs the PR's Vercel preview (authoritative pre-merge signal).

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
5. Tap the **round search button** (right of the pill).
   → Interim S1 behaviour: you land on the listings page `/l`. *(S2.1 will replace this with a glass bottom-sheet that rises over the bar — not a page change.)*
6. Open the **Cuenta** menu (top-right user icon). **[owed to Daniel — PWA standalone]**
   → In the installed PWA there is **no "Favoritos" row** (the bottom tab carries it). On desktop / mobile-web browser the Favoritos row is **still present** in that menu.
7. Look at the bar against the colorful feed. **[owed to Daniel — device]**
   → The glass reads as translucent, blurred, saturated — polished iOS-26 liquid glass; the active tab has a soft capsule. *(Pixel-exact match vs the mockup is dialed via the `--glass-*-liquid` tokens.)*
8. Scroll the feed down then up.
   → The bar (and search button) slide away on scroll-down and spring back on scroll-up; gone on `/l/[id]`, `/checkout`, `/messages/[id]`, `/sell`.

If any step fails, note the step number + what you saw — that's the bug report.
