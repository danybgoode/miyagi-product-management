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

## Reproduction (2026-07-10)
**Live data access attempted, not available to the agent:** prod's Postgres is Cloud SQL, private-IP
only (per `Roadmap/LEARNINGS.md` — unreachable from this laptop/session without a connector-attached
Cloud Run Job). The local `apps/backend/.env` `DATABASE_URL` points at the retired dev-scoped Neon
instance, not prod — querying it would prove nothing about live churn. The only HTTP path to
`ml_sync_event` rows is the per-seller `GET /internal/ml/events?seller_slug=…` route
(`src/api/internal/ml/events/route.ts`), gated by `MEDUSA_INTERNAL_SECRET` (a prod Secret-Manager
value, not present locally) and requiring a *known* connected seller's slug — there is no
cross-seller admin view of the log. **This live-data confirmation is therefore owed to Daniel**
(who holds prod DB/admin access) as a quick, separate check from the already-owed 48h connection
smoke: pull `token_refresh` rows for any connected seller and look for a `fail`
(`code: ML_REAUTH_REQUIRED`) event landing in the same minute as an `ok` event for that seller, or
`fail` events clustering at `:00`/`:30` wall-clock.

**Code-level reproduction (verified directly against `apps/backend/src/`):** the triggering
condition is real and mechanical, not hypothetical —
- `src/jobs/reconcile-ml-order-status.ts:212` and `src/jobs/reconcile-ml-inventory.ts:179` both
  declare `schedule: '*/30 * * * *'` — **the identical cron tick**, confirmed by direct `grep`, so
  both jobs run in the same process at the same wall-clock minute.
- Each job resolves `MercadolibreModuleService` independently and calls
  `ml.getAccessTokenForSeller(sellerId)` for every seller it touches
  (`reconcile-ml-order-status.ts:82`'s own `tokenCache`; `reconcile-ml-inventory.ts:102`'s
  per-seller fetch, plus internal calls inside `applyMlOrderToLink`/`pushStockToMl`). Neither job
  knows about the other's cache.
- `getAccessTokenForSeller` (`src/modules/mercadolibre/service.ts:130`) has no concurrency control
  around the refresh-and-persist section. Any seller with both an open ML order (job 1) and an
  active stock-linked product (job 2) whose token falls inside the 5-min refresh-skew window at a
  `:00`/`:30` tick gets it called **twice, concurrently, by two different jobs** — reproducible by
  inspection of the schedule + call graph alone, independent of live data.

## Root cause
`getAccessTokenForSeller` refreshes when `shouldRefresh(expires_at)` (within 5 min of expiry) but
serializes nothing. Two concurrent callers (the race above) read the *same* `refresh_token_enc`
before either writes back, decrypt to the same refresh token, and both call `refreshMlToken()`. ML's
refresh grant is **single-use**: it honors one caller and rejects the other (400,
`invalid_grant`-shaped) because that token was already consumed. The catch block
(`service.ts:140-149`) cannot tell that apart from a genuinely dead refresh token — *any*
`refreshMlToken` failure, including this benign race loss and a plain transient ML-side hiccup
(5xx / 429 / network blip), is treated as unconditional proof the refresh token is dead and
immediately persists `metadata.needs_reauth: true` via `flagReauth`. That write can land **after**
the winning call's own write clears the flag, leaving the connection stuck reading "reconnect
required" even though it holds a perfectly valid, just-refreshed token pair. This is the observed
churn: not a real dead token, but a false positive from (a) an un-serialized race on a single-use
credential between two identically-scheduled jobs, and (b) no distinction between a non-retryable
rejection and a transient/racy one.

**Fix approach (see the epic PR for the full design):** a self-contained DB-level check-before-act
fix in `service.ts`/`_utils.ts` — re-check `shouldRefresh` immediately before calling ML (closes
most of the race window for free), snapshot-and-compare `refresh_token_enc` before persisting a
refresh (never overwrite a concurrent winner's write), and classify a refresh failure (raced vs.
transient vs. genuinely dead) before ever calling `flagReauth`. A real distributed lock
(`Modules.LOCKING`, matching inventory's per-link lock) was considered and rejected: the module
service has no container access to it without threading `scope` through ~8 methods and every
route/job caller — too wide a blast radius for a HIGH-risk auth path fixing one narrow bug.

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
