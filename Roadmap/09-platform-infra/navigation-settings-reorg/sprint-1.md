# Navigation & Settings Reorg — Sprint 1: PWA bottom bar

**Status:** ⬜ not started · **Risk:** LOW · audit §1 · file: `app/components/MobileTabBar.tsx`

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

## Sprint QA
- **api spec(s):** extract the route-hide decision into a pure `lib/tabbar-visibility.ts`
  (`shouldHideTabBar(pathname)`, `LABEL_MODE`) → `e2e/tabbar-visibility.spec.ts` asserts the four hide
  patterns + the visible defaults (free pure-logic coverage).
- **browser smoke owed:** yes, to **Daniel** — the **PWA-standalone** install behaviour and the
  **keyboard auto-hide on a real device** can't be fully driven by an automated browser. Hide-on-scroll +
  the 4-tab render are covered by an anonymous Chromium smoke.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

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
