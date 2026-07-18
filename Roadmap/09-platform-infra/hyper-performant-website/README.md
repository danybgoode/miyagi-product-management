---
status: shipped
slug: hyper-performant-website
---

# Epic: Hyper-performant website

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/hyper-performant-website.md`](../../00-ideas/seeds/hyper-performant-website.md)

## Why
Mobile PageSpeed 65 with LCP 12.2 s (validated Google run, 2026-07-14) on a marketplace about to
launch. TTFB is 10 ms — `marketplace-static-shell` did its job; this is an **asset** problem: raw R2
JPEGs with no cache TTL (~2.6 MB excess), a render-blocking 204 KiB icon CSS from jsDelivr, deferred-able
Clerk UI bundles. Target: Perf ≥ 90 · LCP < 2.5 s · payload < 1.5 MB, with a CI guard so it sticks.

## Medusa-first note
No commerce logic changes. Listing images stay in R2; only the **delivery** path changes.

## What already exists (reuse, don't rebuild)
- `marketplace-static-shell` (TTFB solved) · `design-token-foundation` CI-guard shape (for the perf budget)
- Cloudflare zone in front of Cloud Run — the delivery rail the images should ride
- R2 buckets + `lib/r2.ts` upload path (where `Cache-Control` and ingest-on-import land)
- In-flight `emoji-to-iconoir-sweep` epic — **coordinate on Story 2.1, don't collide**
- `references/PageSpeedInsightsmobile.md` + `references/suggestions.md` (validated, corrections in seed)

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 R2 image delivery through the zone + Cache-Control + responsive sizes | low |
| 1 | 1.2 LCP priority: first-row `fetchpriority=high`, no lazy, dynamic preload | low |
| 1 | 1.3 Supply-import ingests hotlinked external images into R2 | low |
| 2 | 2.1 Iconoir subset (build-time / inline SVG) — coordinate with iconoir sweep | low |
| 2 | 2.2 Clerk UI lazy-mount + legacy-polyfill purge (TBT < 200 ms budget) | low |
| 2 | 2.3 Perf-budget guard in the deterministic gate | low |

## Deploy order
Frontend only; Story 1.1 may add a Cloudflare rule / image-resizing config → shared edge infra, announce.
Nothing money-path; images degrade gracefully (old URLs keep serving).

## Definition of Done (epic)
- [x] All sprints merged + smoke-tested; **PageSpeed mobile re-run ≥ 90** (Daniel, URL-level)
- [x] Each `sprint-N.md` has its smoke walkthrough
- [x] This README marked ✅; sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written · poster updated · memory updated · learnings promoted
- [x] Feature branch deleted; **frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
