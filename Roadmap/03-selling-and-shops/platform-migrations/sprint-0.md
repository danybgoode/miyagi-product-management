# Platform migrations — Sprint 0: Bug: ML re-auth churn

**Status:** ✅ fix merged + deployed 2026-07-11 (backend PR [#82](https://github.com/danybgoode/medusa-bonsai-backend/pull/82),
squash-merged `dbe484b`, live on Cloud Run revision `medusa-web-00158-8pt`). **Owed to Daniel: the
≥48h live-connection browser smoke** (see note in the post-merge section below on picking a
meaningful test seller).
**Risk:** HIGH (auth — Daniel merged). *Do first: live customer pain; blocks nothing in this epic.*

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

## Post-merge prod smoke (agent, 2026-07-11)
Daniel authorized live prod DB access for this check (a connector-attached Cloud Run Job on
`postgres:17-alpine`, torn down after — same pattern as `Roadmap/LEARNINGS.md`'s in-VPC ops note).

**Deploy confirmed live:** `medusa-web-00158-8pt` serving 100% traffic (rolled ~06:09 UTC, Cloud
Build `SUCCESS` ~06:11 UTC); `/health` → 200; zero ML-related log lines (error or otherwise) on the
new revision since deploy.

**Live data — honest finding, not a clean confirmation either way:**
- `ml_sync_event` has **12 rows total, ever** (`close`×10, `publish`×2, earliest 2026-07-04) — **zero
  `token_refresh` rows**, before or after this deploy.
- Only **2** `ml_connection` rows exist in prod, both `status: connected`, neither ever
  `needs_reauth`. But both have `expires_at` already **in the past** (one 7 days ago, one 3 days
  ago) with `last_refreshed_at` unchanged since `created_at` — i.e. neither connection's token has
  ever been refreshed, successfully or not.
- `product_ml_link` has **zero rows** — neither connected seller has a linked product.

**Why:** both reconcile cron jobs only call `getAccessTokenForSeller` for sellers they have work for
— `reconcile-ml-inventory` builds its per-seller set from `product_ml_link` rows,
`reconcile-ml-order-status` from ML-sourced Medusa orders. With no links and no ML orders, **neither
job has ever touched either connection**, so the refresh path (and therefore the race this fix
targets) has simply never fired in prod to date. This is consistent with — not contradicted by —
the code-level reproduction above; there just isn't enough live ML-sync traffic yet to have produced
a race one way or the other. It also means today's live state can't distinguish "fixed" from
"never exercised."

**Also surfaced (pre-existing, not part of this fix's scope):** a *successful* refresh was never
event-logged in the first place — only `flagReauth`'s failure path calls `recordSyncEvent(kind:
'token_refresh')`. The walkthrough below is corrected to not imply an `ok` `token_refresh` row will
appear; the log is a **failure signal only** today (a possible future enhancement, out of scope
here).

**Implication for Daniel's owed 48h smoke:** for it to actually exercise the fixed code path, the
test connection needs at least one **linked, sync-enabled product** (or an open ML order) — an
idle connection with nothing linked won't touch `getAccessTokenForSeller` at all, same as the two
prod connections above, and would smoke-test nothing.

### Story 0.1 — Reproduce, root-cause, and fix the ML re-auth churn
**As a** connected Mercado Libre seller, **I want** my connection to survive without daily
reconnects, **so that** sync keeps working unattended.
**Path (bug discipline, groom Stage 2):** write the reproduction first (from the live `ml_sync_event`
`token_refresh` trail — when does `needs_reauth` flip, and what did the refresh sequence look like?)
→ written root cause (read the module's refresh path; check serialization around the single-use
token — per-link Redis lock exists for inventory, does the token refresh have one?) → fix +
regression spec.
**Acceptance:**
- [x] The reproduction and root cause are written into this doc before the fix is coded (commit
      `0e45b2e`, root repo).
- [ ] A connected account rides ≥2 consecutive refresh cycles (>12 h) with no `needs_reauth`. —
      **owed to Daniel**; use a seller with a linked product per the walkthrough's note above.
- [x] The raced/concurrent-refresh path has a regression spec (two concurrent refreshes ⇒ exactly
      one wins, the winning token pair persists, no stale write) — `ml-resilience.unit.spec.ts`,
      backend commit `d2889bd` (PR [#82](https://github.com/danybgoode/medusa-bonsai-backend/pull/82),
      squash-merged `dbe484b`).
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

**Before starting:** pick (or set up) a test seller whose ML connection has **at least one linked,
sync-enabled product** (or an open ML order). The two-cron-job race this fix targets only ever
fires when a reconcile job actually has work for that seller — an idle connection with nothing
linked never calls the refresh path at all, so this walkthrough would pass trivially without
proving anything (confirmed live on 2026-07-11: prod's only 2 connections are both unlinked).

1. Go to https://miyagisanchez.com/shop/manage (the test shop above) → the ML status card shows
   "Conectado", no re-auth prompt.
2. Wait >12 h (≥2 access-token cycles, so at least one falls on a `:00`/`:30` reconcile tick), with
   sync activity happening in between (stock changes / an open order) so both cron jobs actually
   touch this seller's connection.
   → Status still "Conectado", no re-auth prompt. **(auth path — owed to Daniel)**
3. Check the `ml_sync_event` activity log for the window (shop status page, or
   `GET /internal/ml/events?seller_slug=…`).
   → **No `token_refresh` `fail` rows at all.** Note: a *successful* refresh is not separately
   event-logged today (only failures write a `token_refresh` event, via `flagReauth`) — so "log is
   empty" is the healthy outcome here, not evidence of absence. If a `fail` row does appear, that
   is the bug reproducing; note its timestamp and whether another job's activity landed in the same
   minute.

If any step fails, note the step number + what you saw — that's the bug report.
