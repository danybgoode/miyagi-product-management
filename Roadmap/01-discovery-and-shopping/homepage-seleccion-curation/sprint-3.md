# Sprint 3 — Dynamic rotation (shuffle per ISR window)

**Epic:** [Homepage Selección: bug sweep + admin curation + dynamic rotation](README.md) · **Repo:** `apps/miyagisanchez`
**Goal:** make the Selección visibly rotate over time without un-static-ing the homepage and without any GCP job —
a **deterministic per-ISR-window shuffle of the unpinned remainder**. Pinned / admin-ordered items (Sprint 2)
stay fixed; only the auto-filled slots rotate. `next build` must keep `/` at `○`.

## Story

### S3.1 — Deterministic per-window shuffle of the unpinned remainder · LOW
**As a** returning buyer, **I want** the Selección to change over time, **so that** the homepage feels alive.
- **Why it can't be per-refresh:** `app/(site)/page.tsx` is a static CDN asset (`revalidate = 60`); the same HTML
  serves all visitors until it revalidates. A per-browser-refresh shuffle would need a per-request function —
  forbidden by LEARNINGS ("don't un-static the shell"). So the shuffle is **per ISR window**, not per refresh.
- **Fix (in `lib/home-curation.ts`, the next-free seam):** seed a shuffle of the **unpinned qualifying** pool by
  the current ISR time-bucket (e.g. `Math.floor(now / REVALIDATE_MS)`), so the order is **deterministic within a
  window** (no hydration mismatch) and **rotates across windows**. Pinned items keep their `featured_rank` order
  (S2.3); the featured pick stays the lowest-rank pin (or, when no pins, the per-window top of the shuffled fresh
  pool — Daniel's eyeball decides whether the *featured* card should rotate too or stay "freshest"; default:
  rotate the grid, keep featured = lowest-rank pin / freshest).
- **Acceptance:** pure-logic spec — same seed ⇒ identical order (deterministic); different time-buckets ⇒ different
  order; **pinned items never move**; unpinned remainder is a stable permutation within a window. `next build`
  emits `○ /`.
- **QA:** extend `e2e/home-curation.spec.ts` (pure/api gate — free coverage). A "looks different in a later window"
  eyeball owed to Daniel on prod.

## Sprint QA
- Deterministic gate: `tsc` + `build` (assert `○ /`) + the extended `home-curation` pure spec (determinism +
  pinned-fixed + cross-window-difference). No money/auth path.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production (or the branch preview). `<url>` = the homepage.

1. Open `<url>`, note the order of the **unpinned** items in "Selección de la semana".
   → A given order is shown.
2. Wait past one ISR window (~60s) and hard-reload (or come back later).
   → The **unpinned** items appear in a **different order**; any **pinned** items (from Sprint 2) are in the
     **same** position as before.
3. Reload several times **within** the same minute.
   → The order is **stable** within the window (no flicker / no hydration warning in the console).

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S3.1 — _pending_
