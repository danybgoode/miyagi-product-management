# Hyper-performant website — Sprint 2: CSS/JS + the guard

**Status:** ⬜ not started

## Stories

### Story 2.1 — Iconoir subset (kill the 204 KiB render-blocking CSS)
**As** a mobile buyer, **I want** only the icons we use shipped, inline or build-time subset,
**so that** a jsDelivr stylesheet (200 KiB unused) stops blocking first paint for 2.5 s.
**Coordinate with the in-flight `emoji-to-iconoir-sweep` epic — announce; one icon rail, not two.**
**Acceptance:** zero render-blocking requests from external CDNs; "Reduce unused CSS" clears.
**Risk:** low (shared `layout.tsx` head → announce)

### Story 2.2 — Clerk UI lazy-mount + legacy-polyfill purge
**As** a mobile buyer, **I want** auth UI bundles loaded on interaction and Baseline polyfills gone,
**so that** the main thread stops parsing ~378 KiB of unused JS at boot.
Clerk **auth** untouched (AGENTS rule #4) — this defers UI bundles only. Acceptance reframed from the
Gemini draft's unrealistic "zero long tasks": **TBT budget < 200 ms**.
**Acceptance:** TBT < 200 ms on the PageSpeed mobile run; sign-in still works on first click
(marketplace, subdomain, and custom-domain channels).
**Risk:** low

### Story 2.3 — Perf-budget guard in the deterministic gate
**As** the team, **I want** a CI check asserting payload/asset budgets (and optionally Lighthouse-CI),
**so that** 90 can't silently erode — same anti-erosion shape as the raw-color guard.
**Acceptance:** budget spec red when a >150 KiB render-blocking asset or an uncached first-row image
is introduced (observed-red via deliberate mutation); green on `main`.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/perf-budget.spec.ts` hardened (budgets + cache-header asserts)
- **browser smoke owed:** yes, to Daniel — final PageSpeed run (the epic acceptance: ≥ 90 / LCP < 2.5 s / < 1.5 MB), plus one real sign-in on prod (auth-adjacent change in 2.2)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Run https://pagespeed.web.dev on https://miyagisanchez.com (Mobile).
   → Performance ≥ 90 · LCP < 2.5 s · total payload < 1.5 MB.
2. Hard-refresh the homepage with DevTools → Network.
   → No cdn.jsdelivr.net request; icons render correctly across home, browse, PDP, seller portal.
3. Click "Iniciar sesión" and complete a real sign-in. (auth path — owed to Daniel)
   → Clerk UI loads on demand (slight fetch on click is OK) and sign-in completes normally.

If any step fails, note the step number + what you saw — that's the bug report.
