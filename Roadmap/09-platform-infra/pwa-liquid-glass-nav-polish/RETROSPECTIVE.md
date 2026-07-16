# Retrospective — PWA Liquid-Glass Nav Polish

_Closed: 2026-06-22_

**Shipped 2026-06-22 · 2 sprints · frontend-only · LOW risk.**
S1 squash `071246d` ([PR #98](https://github.com/danybgoode/miyagisanchezcommerce/pull/98)) ·
S2 squash `4ab597c` ([PR #99](https://github.com/danybgoode/miyagisanchezcommerce/pull/99)).

## What shipped
The installed-PWA bottom bar is now the iOS-26 **Liquid-Glass** experience from Daniel's redesign, and
mobile search moved off the page-nav into an in-app sheet — a **knowing partial reversal** of two
nav-reorg (2026-06-11) decisions (detached search control re-added; Favoritos pulled back to a top-level tab).

- **S1 — Bar restructure + glass polish.** Re-ordered to `Inicio · Mensajes · ⊕ Vender · Favoritos · Perfil`
  (icons-only), Favoritos back as a mobile tab (kept in `CuentaMenu` on desktop), the detached glass search
  control restored (interim `→ /l`), and `.glass-liquid` tuned to match the handoff `.glass-surface` exactly
  (fill 0.50 · blur 32 · sat 180% · edge-refraction ring · white active capsule). Rendered from the pure
  `BOTTOM_TABS` descriptor; contextual hide via `lib/tabbar-visibility.ts`.
- **S2 — Bottom-sheet search + dedup.** The detached control now opens a `.glass-liquid` **bottom-sheet**
  (no page transition): recent searches (pure `lib/search-recents.ts` + `localStorage`) + a suggested set
  (top categories), submit → Medusa `/l?q=`. The header search is demoted **in PWA standalone only**, and a
  spec-covered pure helper carries the recents logic.

## What went well
- **Reuse over rebuild paid off twice.** The sheet is the Discovery-Polish-S2 filter-sheet idiom (scrim ·
  `translate-y` toggle · Esc · scroll-lock) in a new component, not a new overlay primitive; the glass is the
  S1 `.glass-liquid` token, untouched. `globals.css` was never opened in S2.
- **The pure-seam pattern gave free, real coverage.** `lib/search-recents.ts` (normalize / case-insensitive
  `dedupeCap` / `searchHref`) is next-free + DOM-free, so `e2e/search-recents.spec.ts` (api) tests it directly
  — including the `bonsái → bons%C3%A1i` encoding — with no browser.
- **The CI guards earned their keep.** The design-token raw-color guard caught the WebKit bug number
  `#279904` in a comment as a hex color (local tsc/build/own-spec were green — only CI caught it), exactly the
  "fresh client island bites the guard, only CI catches it" pattern.
- **Cross-review found real a11y bugs the author missed.** Codex flagged that the always-mounted sheet kept
  focus trapped behind an `aria-hidden` offscreen dialog and left the iOS keyboard up on close — fixed with
  `inert` + an on-close `blur()` + a proper dialog label, all before merge.

## What we learned (promoted to LEARNINGS.md)
- **iOS keyboard from a sheet needs an always-mounted input + synchronous `focus()` in the tap handler.**
  The keyboard only raises from a real, already-present element on a user gesture — so the sheet toggles via
  transform (never conditional mount), and the trigger calls `focus()` before `setState`, with
  `touch-action: auto` on the input (WebKit bug 279904).
- **Scope a "demote/hide a control on mobile" change to the right display-mode.** The bottom bar is
  `.pwa-only`, so removing the header search on *all* mobile would have left **mobile web with no search at
  all**. Hide it `.pwa-hidden` (PWA-standalone only) and keep mobile web; re-surface anything the hidden
  control uniquely held (here the in-search agent button → a `.pwa-only` top-bar icon).
- **A `.pwa-only` surface is not headless-smokeable** — Playwright can't emulate `display-mode: standalone`,
  so the rendered sheet flow is genuinely owed to Daniel; the pure spec + the gate are the agent coverage.
- **An always-mounted-but-hidden dialog must be `inert` when closed** (removes it from tab order + the a11y
  tree, moves focus out) and should `blur()` its input on close so the mobile keyboard dismisses.

## Gaps / follow-ups
- **Owed to Daniel (real device — can't be headless):** iOS keyboard raising synchronously on the search
  tap; the PWA-standalone open→type→submit→`/l?q=`→dismiss flow; the single-search-control look; and the
  **mobile-web regression check** (header search must still be present in a normal browser tab).
- **S2.3 (top-bar glass-parity) deferred** — cosmetic; revivable as a tiny follow-up if the top bar's glass
  should match the bar exactly.

## Process note
Mid-session the shared monorepo-root working tree was switched to a sibling agent's `chore/postgres-cloudsql-s3`
branch, so the first close-out doc commit landed on *their* branch. Recovered by capturing the commit on a
planning branch and `git reset --mixed` (not `--hard`) back to base — **preserving the sibling's 7 uncommitted
files** — then doing all subsequent root-repo doc work in a dedicated `git worktree`. Reconfirms the LEARNINGS
rule: planning/scaffold commits need their own worktree, and the root tree can move under you to a *feature*
branch, not just collide the index.
