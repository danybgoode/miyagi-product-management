# Navigation & Settings Reorg — Sprint 1: PWA bottom bar

**Status:** ✅ BUILT 2026-06-10 — draft [PR #75](https://github.com/danybgoode/miyagisanchezcommerce/pull/75)
(`a91ed8a`), risk LOW, awaiting reviewer + merge · **Risk:** LOW · audit §1 ·
files: `app/components/MobileTabBar.tsx`, new pure `lib/tabbar-visibility.ts`,
`e2e/tabbar-visibility.spec.ts` (api), `e2e/tabbar.browser.spec.ts` (browser).

- **Story 1.1** ✅ `a91ed8a` — bar trimmed to Inicio · Explorar · ⊕ Vender FAB · Mensajes · Cuenta;
  search circle + Vecindario + Favoritos removed; `LABEL_MODE` const (icons-only default).
- **Story 1.2** ✅ `a91ed8a` — hide-on-scroll (8px delta) + `visualViewport` keyboard auto-hide +
  route-hide (returns `null`) on `/l/[id]`, `/checkout`, `/messages/[id]`, `/sell`.

## Stories

### Story 1.1 — Trim to 4 tabs + publish FAB
**As a** buyer on the PWA, **I want** a focused bottom bar — Inicio · Explorar · [⊕ Vender FAB] · Mensajes
· Cuenta — **so that** the destinations I actually use are one tap away.
**Acceptance:**
- Exactly **4 tabs + 1 center FAB** render; the detached search circle is gone.
- Favoritos no longer sits in the bar (it moves to the Cuenta hub, S2.2); Vecindario no longer sits in the
  bar (reachable from the Inicio feed, S4.2).
- Explorar → `/l`; FAB (⊕ Vender) → `/sell`; Mensajes → `/messages`; Cuenta → `/account` (signed-out → `/sign-in`).
- Labels are **icons-only by default** via a `LABEL_MODE` const (values `icons-only` (default) · `active-label`
  · `full-labels`); no Flagsmith, no peek mode.
**Risk:** LOW

### Story 1.2 — Contextual hide
**As a** buyer, **I want** the bar to get out of the way **so that** it never covers content or the keyboard.
**Acceptance:**
- Hide-on-scroll: the bar translates off past an **8px downward delta** and springs back on scroll-up.
- Auto-hides when the on-screen keyboard opens (via `visualViewport` resize).
- Hidden **entirely** on `/l/[id]` (PDP), `/checkout`, `/messages/[id]`, and `/sell`.
**Risk:** LOW

## Sprint QA — as shipped
- **api spec (the gate):** `e2e/tabbar-visibility.spec.ts` — 8 pass. Loads the pure, next-free
  `lib/tabbar-visibility.ts` (`shouldHideTabBar`, `nextTabBarHidden`, `LABEL_MODE`) directly and
  asserts the four route-hide patterns, the visible defaults (`/`, `/l`, `/messages`, `/account`),
  the 8px scroll-delta decision (down→hide, up→show, near-top→show, jitter→unchanged), and the
  `icons-only` default. Free pure-logic coverage; the component reads the same helpers so the rules
  can't drift.
- **anonymous browser smoke (agent-covered):** `e2e/tabbar.browser.spec.ts` — render + hide-on-scroll,
  2 pass / 1 skip locally. **Gotcha discovered:** the bar is `@media (display-mode: standalone)`-gated
  and `display-mode` is **not** an emulatable media feature in headless Chromium (CDP
  `Emulation.setEmulatedMedia` leaves `matchMedia('(display-mode: standalone)')` false), so the spec
  uses a phone viewport + a test-only `display:flex` override to force the bar visible, then asserts the
  4-tab + FAB render, the removed items' absence (scoped inside `.pwa-only`), and the real scroll-driven
  translate. The route-hide test needs a reachable catalog (a real `/l/[id]`) → skips locally, runs on
  the preview/prod.
- **browser smoke owed to Daniel:** the genuine **PWA-standalone** install behaviour and the
  **keyboard auto-hide on a real device** can't be fully driven by an automated browser (see steps 1 & 6).
- **deterministic gate:** `tsc --noEmit` ✅ + `npm run build` ✅ + Playwright `api` (8 pass) ✅ —
  green before merge; CI re-runs the `api` suite vs the branch preview.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL while testing pre-merge)

1. On a phone, open https://miyagisanchez.com and **Add to Home Screen**; launch from the icon (standalone). **[owed to Daniel — PWA standalone]**
   → The bottom bar shows exactly **Inicio · Explorar · ⊕ · Mensajes · Cuenta** — no floating search circle, no Favoritos/Vecindario tab.
2. Tap **Explorar**.
   → You land on the listings page (`/l`).
3. Tap the **⊕** FAB.
   → You land on the publish flow (`/sell`).
4. Scroll the home feed **down** a little, then back **up**.
   → The bar slides away on the downward scroll and springs back when you scroll up.
5. Open any product, e.g. tap a listing to reach `/l/<id>`.
   → The bottom bar is **gone** on the product page (also gone in `/checkout`, an open conversation `/messages/<id>`, and `/sell`).
6. Tap a search/text field so the keyboard opens. **[owed to Daniel — real device]**
   → The bar hides while the keyboard is up and returns when it closes.

If any step fails, note the step number + what you saw — that's the bug report.
