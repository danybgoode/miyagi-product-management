# Retrospective — Homepage Selección: bug sweep + admin curation + dynamic rotation

**Macro-section:** 01 · Discovery & Shopping · **Status:** ✅ shipped 2026-06-23 (3 sprints) ·
**Repos:** `apps/miyagisanchez` (all) + one `apps/backend` admin-scoped route (S2.1).

## What shipped

A mixed epic — two real homepage **bugs** plus a **light-enhancement** to the already-live "Selección de la
semana" curation — delivered in three sprints over a single day, all behind the existing static-shell guardrail.

- **S1 — bug sweep + auth audit** (PR #112 `1a4c4a4`, LOW). Categorías now highlights per-row on hover/focus
  (`.card-panel` container + `.cat-row` hover, no whole-card lift); the post-static-shell auth leak is closed —
  signed-out-only CTAs (`Únete a la comunidad`, footer `/sign-up`, empty-state recruit) are gated with the client
  `AuthShow when="signed-out"` so the page stays `○ /`; full signed-out/in audit table recorded; new
  `e2e/home-auth-leakage.spec.ts`.
- **S2 — admin curation** (FE PR #113 `4a59644` + BE PR #37 `815994f`, MED). `/admin/seleccion` lets an admin
  pin/unpin and drag-reorder the Selección (@dnd-kit). The pin is **Medusa product metadata** (`metadata.featured`
  + new `metadata.featured_rank` asc) — the write goes through a new **admin-scoped backend route**
  (`PATCH /internal/admin/featured/[id]`) reusing `updateSellerProduct`, behind `requireAdmin`/`withAdmin`, busting
  the `listings` tag. `byPinnedThenFresh` honors `featured_rank`.
- **S3 — dynamic rotation** (PR #114 `a5b23ca`, LOW). The unpinned grid remainder now shuffles **per ISR window**
  via a deterministic seed (`windowSeed(now) = floor(now / REVALIDATE_MS)`, locked to `CACHE.LISTING`) + a pure
  `mulberry32` PRNG + non-mutating `seededShuffle`, threaded through `curateGrid`'s new optional `seed`. Pinned /
  admin-ordered items and the featured pick stay fixed. `/` stays `○`.

## What went well

- **One next-free seam carried all three sprints.** `lib/home-curation.ts` (pinning, `featured_rank` order,
  per-window shuffle) stayed next-import-free, so the pure `e2e/home-curation.spec.ts` `api` spec proved every rule
  — 24 tests, zero network/auth — and grew by one block per story for free coverage.
- **The static-shell guardrail held end-to-end.** Every sprint reconfirmed `next build` emits `○ /`; the rotation
  was deliberately designed as a per-ISR-window (not per-visitor) shuffle precisely so it never re-introduces a
  per-request function. Threading the seed was pure arithmetic on the `now` the page already computed → no page edit.
- **Cross-agent review earned its keep on every PR.** Codex caught real should-fixes on S1 (testid scoping) and S2
  (rank-preservation, coerced-rank rejection, rank-collision `max+1`); on S3 it found a comment-accuracy nit (fixed)
  and surfaced a semantics question that was worth answering explicitly (declined, with rationale recorded).
- **Bugs-first packaging paid off.** S1 shipped as a standalone quick-win drop before the feature work, so the two
  visible defects were fixed without waiting on the admin UI.

## What we learned (promoted to LEARNINGS.md)

- **Rotate a static/ISR surface by seeding the shuffle on the revalidate time-bucket, not per request.** A
  `floor(now / REVALIDATE_MS)` seed is stable within a window (same static HTML for all visitors → no hydration
  mismatch) yet rotates across windows — "feels alive" without un-static-ing the page or adding any infra. Keep the
  PRNG + shuffle pure and non-mutating in the next-free seam so the determinism is spec-proven.
- **"Shuffle the pool" ≠ "reorder the visible slots" — and the grooming doc decides which.** A cross-review flagged
  that shuffling the whole qualifying pool before slicing can surface an older (but still in-window) item over a
  fresher one. That was the *intended* behavior (rotating only a fixed top-N's order shows the same items every
  window), so it was declined — but only because the scope doc said "shuffle the unpinned *pool*." Resolve
  shuffle-vs-reorder scope at grooming, and a reviewer's semantics question is cheap to answer against it.

## Gaps / owed (operational — none block the epic)

- **S1:** signed-in CTA-absence + per-row hover eyeball (auth/island can't false-pass on a `*.vercel.app` preview).
- **S2:** admin Clerk-session pin/reorder smoke + a UCP `featured` metadata check on prod.
- **S3:** the cross-window "looks alive" eyeball — only observable across real ISR windows on a deployed build.

All owed items are prod browser/session smokes Daniel holds the credentials for; the deterministic gate
(`tsc` + `next build` `○ /` + Playwright vs preview) is green for all three sprints.
