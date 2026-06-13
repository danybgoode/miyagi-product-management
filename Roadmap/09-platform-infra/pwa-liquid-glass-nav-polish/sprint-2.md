# PWA Liquid-Glass Nav Polish — Sprint 2: Bottom-sheet search + dedup

**Status:** 📋 NOT STARTED · **Risk:** LOW (S2.2 touches shared `layout.tsx`/`globals.css` — announce) ·
**Branch:** `feat/pwa-glass-nav` (continue) ·
**Files (expected):** `app/components/MobileTabBar.tsx` (or a new `SearchSheet.tsx`), `app/globals.css`,
new pure `lib/search-recents.ts`, `e2e/search-recents.spec.ts` (api), `app/layout.tsx` (mobile header search demote),
`locales/{es,en}.json` (new strings).

> Reuse the **Discovery Polish S2 filter bottom-sheet** seam — don't build a new overlay primitive.

## Stories

### Story 2.1 — Bottom-sheet search
**As a** buyer, **I want** tapping search to raise an in-app glass sheet with the field already focused and my
recent searches **so that** I can search instantly without a page jump (recognition over recall).
**Acceptance:**
- Tapping the detached search control (S1.2) opens a **`.glass-liquid` bottom-sheet** above the bar, over a scrim.
- The input is **keyboard-focused on iOS**: `focus()` is called **synchronously inside the tap handler** (no
  `setTimeout`), and the input has **`touch-action: auto`** (WebKit #279904 workaround). Graceful fallback: a
  visible field that always raises the keyboard on a direct tap.
- Sheet shows **recent searches** (from a pure `lib/search-recents.ts` helper backed by `localStorage` —
  add / dedupe / cap to N) and a small **suggested** set.
- Submitting (enter / a recent / a suggestion) navigates to **`/l?q=<query>`** and records the term in recents.
- Dismiss via scrim tap, a close affordance, and Esc; the sheet is keyboard- and safe-area-aware and never
  covers its own input when the keyboard is up.
- New strings (`Búsquedas recientes`, placeholder, etc.) added to `es` **and** `en`.
**Risk:** LOW

### Story 2.2 — Demote the mobile header search (one primary search)
**As a** buyer on the PWA, **I want** a single obvious place to search **so that** I'm not faced with two
competing search controls (aesthetic & minimalist).
**Acceptance:**
- The persistent header search is **hidden/removed on the mobile PWA** (the bottom sheet is primary).
- **Desktop** header search is **unchanged** (no bottom bar there).
- No layout shift / dead space where the mobile header search was.
**Risk:** LOW (shared `layout.tsx`/`globals.css` — **announce**; merge latest `main` first)

### Story 2.3 — (optional) Top-bar glass-parity touch
**As a** buyer, **I want** the top bar to feel consistent with the polished bottom bar **so that** the chrome
reads as one system.
**Acceptance:**
- The header's glass is aligned with the bar's tokens (light mode).
- Any redundant top-level action icons are collapsed/tidied (no IA overhaul — links/destinations unchanged).
- Purely cosmetic; no behaviour change.
**Risk:** LOW · **skip if time-boxed out** (it's optional).

## Sprint QA
- **api spec (the gate):** new `e2e/search-recents.spec.ts` — load the pure `lib/search-recents.ts`
  (add/dedupe/cap, build `/l?q=`) directly; assert ordering, de-dupe, cap, and query encoding. Free pure-logic coverage.
- **anonymous browser smoke (agent-covered):** open the sheet → type → submit → lands on `/l?q=`; scrim
  dismiss. (Keyboard auto-raise can't be asserted headless — see owed-to-Daniel.)
- **owed to Daniel (browser):** **real-device iOS** keyboard raising the sheet on tap; the **PWA-standalone**
  search flow end-to-end; the single-search-control look on a real phone.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL while testing pre-merge)

1. Launch the installed PWA (standalone). Tap the round **search** button. **[owed to Daniel — real-device keyboard]**
   → A glass sheet rises above the bar, the input is focused, and the **keyboard appears**; you see "Búsquedas recientes".
2. Type `bonsái` and submit.
   → You land on `/l?q=bons%C3%A1i` with results; the sheet closes.
3. Open search again.
   → `bonsái` now appears under recent searches; tapping it re-runs the query.
4. Open search, then tap the scrim (outside the sheet) / the close control.
   → The sheet dismisses; the keyboard closes; the bar returns.
5. Confirm there is **no second search bar** in the header on the phone.
   → Search exists only as the bottom control on mobile PWA.
6. (desktop) Open https://miyagisanchez.com on a laptop.
   → The desktop header search is unchanged and works as before.

If any step fails, note the step number + what you saw — that's the bug report.
