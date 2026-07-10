# Comparador de costos — Sprint 3: URL analyzer (CONDITIONAL)

**Status:** ⬜ not started — **conditional**

> **Build condition (decided at grooming, 2026-07-09):** build this sprint **only if**
> platform-migrations US-1.2 (the parity-score module) has landed on `main` by the time S2 closes.
> If it hasn't, **skip — do not stub** — and log a fast-follow seed instead. Verify against
> `origin/main` (PR state), not a local checkout (LEARNINGS).

## Stories

### Story 3.1 — Shop-URL analyzer → prefilled comparison + migration effort
**As a** merchant, **I want** to paste my current shop's URL and get a prefilled comparison plus an
estimated migration effort, **so that** the pitch starts from my actual store, not manual data entry.
**Acceptance:** entering a shop URL on `/comparador` detects the platform + a rough section/catalog
inventory, prefills the calculator, and shows an estimated migration effort rendered from the
migrations epic's shared parity-score module (built there, rendered here — no fork); the analyzer is
**rate-limited** (external fetch + token cost) and degrades gracefully to manual entry on any
failure/timeout; anonymous throughout.
**Risk:** med (external fetch + token cost — the rate limit is part of acceptance)

## Sprint QA
- **api spec(s):** analyzer spec with a fixture URL (platform detected, calculator prefilled);
  rate-limit spec (burst → friendly degrade); failure path degrades to manual entry.
- **browser smoke owed:** yes, to Daniel — analyze a real live shop URL end-to-end.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/comparador and paste a real Shopify shop URL into "Analiza tu tienda".
   → Within a few seconds the platform is detected and the calculator prefills; an estimated
     migration-effort summary appears.
2. Paste a nonsense URL.
   → A friendly es-MX error; manual entry still works.
3. Repeat the analysis several times quickly.
   → The rate limit engages with a friendly message, not a crash.

If any step fails, note the step number + what you saw — that's the bug report.
