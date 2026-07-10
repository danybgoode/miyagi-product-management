# Platform migrations — Sprint 0: Bug: ML re-auth churn

**Status:** ⬜ not started
**Risk:** HIGH (auth — Daniel merges). *Do first: live customer pain; blocks nothing in this epic.*

## Context
ML access tokens live 6 h; refresh tokens are **6 months, single-use, latest-only valid** (research
cited in the scope seed). The module already auto-refreshes with a 5-min skew and only sets
`needs_reauth` on a dead refresh token — so "reconnect daily" is a **bug to reproduce, not a design
gap**. Prime suspect: a lost/raced single-use refresh (two concurrent refreshes → the loser persists
a stale token → the stored refresh token is invalid). Evidence trail: the per-seller `ml_sync_event`
`token_refresh` log (mercadolibre-sync S5).

## Stories

### Story 0.1 — Reproduce, root-cause, and fix the ML re-auth churn
**As a** connected Mercado Libre seller, **I want** my connection to survive without daily
reconnects, **so that** sync keeps working unattended.
**Path (bug discipline, groom Stage 2):** write the reproduction first (from the live `ml_sync_event`
`token_refresh` trail — when does `needs_reauth` flip, and what did the refresh sequence look like?)
→ written root cause (read the module's refresh path; check serialization around the single-use
token — per-link Redis lock exists for inventory, does the token refresh have one?) → fix +
regression spec.
**Acceptance:**
- The reproduction and root cause are written into this doc before the fix is coded.
- A connected account rides ≥2 consecutive refresh cycles (>12 h) with no `needs_reauth`.
- The raced/concurrent-refresh path has a regression spec (two concurrent refreshes ⇒ exactly one
  wins, the winning token pair persists, no stale write).
**Risk:** high

## Sprint QA
- **api spec(s):** regression spec on refresh serialization (single-use, latest-only, concurrent-safe)
  — pure seam if extractable, else backend unit test in the module.
- **browser smoke owed:** yes, to Daniel — a real connected ML account left ≥48 h with sync activity,
  no reconnect prompt (agent can't hold a live ML session).
- **deterministic gate:** backend `medusa build` + `tsc --noEmit` + `npm run test:unit` green before
  merge (no per-branch preview — post-merge prod smoke split stated in the PR).

## Sprint 0 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Go to https://miyagisanchez.com/shop/manage (your test shop with ML connected) → the ML status
   card shows "Conectado", no re-auth prompt.
2. Wait >12 h (≥2 access-token cycles), with at least one sync action in between.
   → Status still "Conectado"; the activity log shows successful `token_refresh` events, no
   `needs_reauth`. **(auth path — owed to Daniel)**
3. Check the `ml_sync_event` log for the window.
   → No token-refresh failures or repeated refresh attempts within the same minute.

If any step fails, note the step number + what you saw — that's the bug report.
