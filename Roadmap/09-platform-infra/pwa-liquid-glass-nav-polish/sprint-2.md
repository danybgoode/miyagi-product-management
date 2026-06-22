# PWA Liquid-Glass Nav Polish — Sprint 2: Bottom-sheet search + dedup

**Status:** ✅ BUILT — draft PR [#99](https://github.com/danybgoode/miyagisanchezcommerce/pull/99)
(S2.1 `6d975c7` · S2.2 `1aebfcb`); gate green locally (tsc + build + new api spec 8/8), awaiting CI-vs-preview + merge ·
**Risk:** LOW (S2.2 touches shared `layout.tsx` — announced; branch current with `main`) ·
**Branch:** `feat/pwa-glass-nav-s2` off latest `main` (S1 PR #98 was squash-merged → its branch is a dead end; fresh branch per LEARNINGS) ·
**Files (actual):** new `app/components/SearchSheet.tsx`, new pure `lib/search-recents.ts`,
`e2e/search-recents.spec.ts` (api), `app/components/MobileTabBar.tsx` (wire trigger + mount sheet),
`app/layout.tsx` (PWA-only header-search demote), `locales/{es,en}.json` (`pwaSearch`).
`globals.css` **not** touched — S1 already tuned `.glass-liquid`; the sheet reuses it.

> Reuse the **Discovery Polish S2 filter bottom-sheet** seam — don't build a new overlay primitive.

> ### ⚠️ S2 builder — two things S1 settled (read before starting)
> 1. **The search trigger already ships (S1.2).** The detached glass search control is live as a `Link href="/l"`
>    (interim). **S2.1's first move is to convert it to a `<button>` that opens the sheet** (the `/l` link is the
>    seam to replace), not to add a new control. The bar already renders from the pure `BOTTOM_TABS` descriptor in
>    `lib/tabbar-visibility.ts` and the glass is fully tokenized in `globals.css` — reuse those.
> 2. **The mockup covers the BARS only.** `handoff/Liquid-Glass-Navbars-(standalone).html` (monorepo **root**
>    `handoff/`, NOT under `apps/`) specifies the top + bottom bars and the search bubble's glass/active state —
>    it does **NOT** depict the bottom-sheet panel. So **S2's sheet has no pixel mockup**: build it from the
>    groomed decision (Pattern B bottom-sheet, iOS-safe synchronous `focus()`) reusing the existing
>    `.sheet-backdrop` primitive + the liquid-glass tokens. If a sheet mockup later appears, drop it in `handoff/`
>    and name it here.

## Stories

### Story 2.1 — Bottom-sheet search ✅ (`6d975c7`)
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

### Story 2.2 — Demote the mobile header search (one primary search) ✅ (`1aebfcb`)
**As a** buyer on the PWA, **I want** a single obvious place to search **so that** I'm not faced with two
competing search controls (aesthetic & minimalist).
**Acceptance:**
- The persistent header search is **hidden on the mobile PWA standalone** (the bottom sheet is primary). It is
  hidden via the `.pwa-hidden` idiom — **deliberately scoped to PWA standalone, NOT all mobile**: the bottom
  bar (and its sheet search) is `.pwa-only`, so **mobile web has no bottom bar and must keep the header search**.
- **Desktop** header search is **unchanged** (separate block; no bottom bar there).
- No layout shift / dead space where the mobile header search was (a `.pwa-only` flex spacer fills it; the hidden
  form held the only mobile in-search agent button, so the agent is re-surfaced as a `.pwa-only` top-bar icon).
**Risk:** LOW (shared `layout.tsx` — **announced**; branch current with `main`)
**Build note:** implemented PWA-only (not a blanket removal) precisely because the bottom bar is PWA-only —
removing the header search on all mobile would have left **mobile-web with no search at all**.

### Story 2.3 — (optional) Top-bar glass-parity touch — ⏭️ SKIPPED (deferred)
Deliberately not built this sprint: purely cosmetic, and it would add further shared-surface
(`globals.css`/header) risk for no functional gain. Per its own "skip if time-boxed out." Can be a tiny
follow-up if Daniel wants the top bar's glass to match the bar exactly.
**As a** buyer, **I want** the top bar to feel consistent with the polished bottom bar **so that** the chrome
reads as one system.
**Acceptance (if revived):**
- The header's glass is aligned with the bar's tokens (light mode).
- Any redundant top-level action icons are collapsed/tidied (no IA overhaul — links/destinations unchanged).
- Purely cosmetic; no behaviour change.

## Sprint QA
- **api spec (the gate):** new `e2e/search-recents.spec.ts` — load the pure `lib/search-recents.ts`
  (add/dedupe/cap, build `/l?q=`) directly; assert ordering, de-dupe, cap, and query encoding. Free pure-logic coverage.
- **anonymous browser smoke (agent-covered):** open the sheet → type → submit → lands on `/l?q=`; scrim
  dismiss. (Keyboard auto-raise can't be asserted headless — see owed-to-Daniel.)
- **owed to Daniel (browser):** **real-device iOS** keyboard raising the sheet on tap; the **PWA-standalone**
  search flow end-to-end; the single-search-control look on a real phone.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com once merged · pre-merge use the PR #99 **branch preview URL**
(SSO-protected — the bypass token is wired for CI; for a hand smoke open the preview while signed in).

1. **[owed to Daniel — real-device iOS keyboard]** On an iPhone, launch the **installed PWA (standalone)** and
   tap the round **search** button (right of the bottom bar).
   → A glass sheet rises above the bar, the input is focused, and the **keyboard appears in the same tap**
   (no second tap); you see "Búsquedas recientes" (if you've searched before) and "Sugerencias".
2. Type `bonsái` and submit (or tap a suggestion).
   → You land on `/l?q=bons%C3%A1i` with results; the sheet closes.
3. Open search again.
   → `bonsái` now appears under **Búsquedas recientes**; tapping it re-runs the query. Tapping "Limpiar" clears them.
4. Open search, then tap the scrim (outside the sheet) — repeat with the **✕** close control and the **Esc** key.
   → Each dismisses the sheet; the keyboard closes; the bar returns.
5. **[owed to Daniel — PWA standalone]** Still in the installed PWA, look at the **top header**.
   → There is **no search bar in the header** — search lives only in the bottom control. The top bar shows the
   brand on the left and the actions (incl. the ✨ agent icon) on the right, with **no empty gap**.
6. **Mobile web (NOT the PWA):** open https://miyagisanchez.com in mobile Safari/Chrome (a normal browser tab).
   → The **header search IS still present** (there's no bottom bar in a browser tab) and works as before — it is
   only demoted inside the installed PWA. This is the deliberate `.pwa-hidden` scoping; a regression here would
   be "no search on mobile web."
7. **(desktop)** Open https://miyagisanchez.com on a laptop.
   → The desktop header search is unchanged and works as before.

**Agent-covered (anonymous, headless):** open sheet → type → submit → land on `/l?q=` → scrim dismiss.
The iOS keyboard auto-raise (step 1) and the PWA-standalone single-control look (step 5) **cannot** be asserted
headless — those are the steps flagged owed to Daniel.

If any step fails, note the step number + what you saw — that's the bug report.
