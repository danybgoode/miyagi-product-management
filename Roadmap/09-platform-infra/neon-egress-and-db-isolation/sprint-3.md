# Neon egress reduction — Sprint 3: Neon org split (isolate side-projects)

**Status:** ⬜ Not started. Neon console/CLI only (no app deploy). Risk: med — touches the Neon org that hosts
the prod commerce DB, but **medusa-bonsai's project is NOT moved** (the side-projects leave). **Daniel executes**
(his Neon account + side-projects). This is an **isolation** lever, not the egress fix (it frees ~3.7%).

## Why
All three projects share one Neon org (`org-fancy-pond-57061061`) and the 5 GB egress allowance is
**per-org**, so `panfleto-miniflux` (a continuously-polling RSS aggregator — 362 active-hours/period) and
`justread` draw from medusa-bonsai's commerce pool and will **grow**. Moving them to a separate org isolates
the mental model and protects commerce headroom from their future growth. Neon **project transfer between orgs**
keeps the endpoint host/DSN unchanged, so there is **no DSN rotation** and `deploy-invariants` is untouched.

## Stories

### Story 3.1 — Move `panfleto-miniflux` + `justread` to a separate Neon org
**As** Daniel, **I want** the two side-projects off the commerce org, **so that** their egress + future growth
can't eat medusa-bonsai's 5 GB headroom and each project is cleanly isolated.
**Acceptance:**
- A destination Neon org exists (created first; **verify free-tier org/project limits before moving** — close
  the spike's open caveat).
- `panfleto-miniflux` (`square-mode-16910372`) and `justread` (`curly-pond-03179354`) are transferred to it via
  Neon **project transfer** (Console → project → Transfer, or `POST /projects/{id}/transfer`).
- **medusa-bonsai (`shiny-paper-72860331`) stays put** in `org-fancy-pond-57061061` — untouched.
- Each side-project's app still connects (host/DSN unchanged on transfer — confirm the side apps are healthy).
- `org-fancy-pond-57061061` now reports **only medusa-bonsai** egress; the side-projects' share is gone from its pool.
**Risk:** med (operate-on-the-right-project care; medusa-bonsai's commerce DB is not transferred → prod commerce
unaffected; rollback = transfer back, same operation).

## Sprint QA
- **api spec(s):** none (Neon console operation, no repo code change).
- **browser smoke owed:** **Daniel** — confirm both side-project apps still load post-transfer, and that
  medusa-bonsai prod commerce is unaffected (it wasn't moved).
- **deterministic gate:** N/A (no repo change). If any infra doc records the org, update it.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: Neon Console (https://console.neon.tech) · `neonctl`

1. Create the destination org; confirm it accepts the two projects within free-tier limits.
   → new org exists; limits OK.
2. Transfer `panfleto-miniflux`, then `justread`, into it. Leave `medusa-bonsai` where it is.
   → `neonctl projects list` shows the two under the new org; medusa-bonsai still under `org-fancy-pond-57061061`.
3. **(Owed to Daniel)** Open each side-project's app.
   → both still connect/load (host/DSN unchanged).
4. Verify medusa-bonsai prod commerce is unaffected: load https://miyagisanchez.com and a PDP.
   → renders normally (its DB was never moved).
5. Re-read the commerce org's egress.
   → only medusa-bonsai's number remains in that org's pool.

If any step fails, note the step number + what you saw — that's the bug report.
