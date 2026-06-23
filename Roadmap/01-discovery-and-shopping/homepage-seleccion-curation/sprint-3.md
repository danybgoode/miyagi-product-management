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
Env: production (or the branch preview). `<url>` = the homepage (`https://miyagisanchez.com/`).
**Owed to Daniel** — the cross-window rotation is only observable across real ISR windows on a deployed
build (the pure determinism is covered by the spec; this confirms it *looks* alive in prod).

1. Open `<url>`, scroll to **"Selección de la semana"**, and note the order of the **unpinned** items
   (everything after any pinned/featured cards from Sprint 2). Screenshot it.
   → A given order is shown; no hydration warning in the browser console.
2. Reload several times **within** the same minute.
   → The order is **stable** within the window — no flicker, no reshuffle, no console hydration warning.
3. Wait past one ISR window (**> ~60 s**) and hard-reload (or come back a few minutes later).
   → The **unpinned** items appear in a **different order**; any **pinned** items (Sprint 2) are in the
     **same** position as before, and the **featured** card is unchanged (only the grid tail rotates).
4. (Optional) Repeat step 3 once or twice over a few minutes.
   → Each new window can show a fresh unpinned order; pinned/featured stay put throughout.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] S3.1 — **built** · `apps/miyagisanchez` `b38fb40` · draft PR
      [#114](https://github.com/danybgoode/miyagisanchezcommerce/pull/114) · risk LOW.
      Gate green locally: `tsc` clean · 24 `home-curation` specs pass (6 new) · `next build` keeps `○ /`.
      Cross-window "looks alive" eyeball **owed to Daniel** (prod, async — steps above).
