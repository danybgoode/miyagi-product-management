---
title: "Hyper-performant website — mobile 65→90, LCP 12.2s→<2.5s (validated inputs)"
slug: hyper-performant-website
status: ready
area: "09"
type: feature
priority: "#4"
risk: low
epic: null
build_order: "#4"
updated: 2026-07-14
---

# Scope — Hyper-performant website (Maintainer archetype)

**Groomed in:** `Roadmap/00-ideas/audits/batch-groom-2026-07-14.md` (Ask 4). Approved 2026-07-14.
**Inputs validated 2026-07-14:** `references/PageSpeedInsightsmobile.md` (Google, run today: Perf 65,
LCP 12.2 s, 3.9 MB payload, A11y/BP/SEO 100) and `references/suggestions.md` (Gemini's draft — kept
with four corrections, below). TTFB is 10 ms — `marketplace-static-shell` did its job; this is an
**asset** problem, not a server problem.

## Sprint 1 — Images (the whale: ~2.6 MB of the 3.9 MB)
- R2 objects served from raw `pub-….r2.dev` with `Cache-Control: none`, original dimensions (913 KiB
  for a 321-px card). Route image delivery through the Cloudflare zone (custom domain / Cloudflare
  Images / `next/image` loader — spike-lite decision inside the sprint), add bucket `Cache-Control`,
  responsive `srcset`/`sizes` on listing cards.
- LCP element is a *dynamic* listing card → `fetchpriority="high"` + no `loading=lazy` on the first
  row; optional server-rendered dynamic preload (correction to Gemini's hard-coded preload, which
  would rot).
- Supply-import ingests external images into R2 (one hotlinked `teatrounam.com.mx` image = 369 KiB
  today).

## Sprint 2 — CSS/JS + the guard
- `iconoir.css` (204 KiB render-blocking from jsDelivr, ~200 KiB unused) → build-time subset / inline
  SVG. **Coordinate with the in-flight `emoji-to-iconoir-sweep` epic — announce, don't collide.**
- Font loading (`display=swap` verified), legacy-polyfill purge (~14 KiB), Clerk UI bundles
  lazy-mounted on interaction (Clerk auth untouched — AGENTS rule 4). Acceptance reframed from
  Gemini's unrealistic "zero long tasks >50 ms" to a **TBT budget < 200 ms**.
- **Perf-budget guard** in the deterministic gate (payload-size / Lighthouse-CI check) so 90 can't
  silently erode — same anti-erosion shape as the raw-color guard.

**Epic acceptance:** mobile Perf ≥ 90 · LCP < 2.5 s · payload < 1.5 MB · guard in CI.
**Risk:** low-to-med — no money paths, but `layout.tsx` head + shared image components → announce PRs.
**Smoke:** PageSpeed re-run (Daniel, URL-level) + spec-level payload assertions (agent).
