# Retrospective — Backend Production Readiness

> Epic close, 2026-06-12. Five sprints (S0 audit → S1 staging → S2 backups → S3 recovery → S4 monitoring)
> that took the Medusa backend from "deploys straight to prod, no staging, unverified backups, no
> observability" to a hardened, recoverable, monitored service. Pure infra — zero commerce-code change.

## What shipped
- **S0 — Audit (the gate).** Six-dimension readiness audit → 15-gap prioritized list + the staging-platform
  decision (Cloud Run + Neon branch; reject Render). `tasks/backend-production-readiness-audit.md`. Daniel-approved.
- **S1 — Staging environment.** `medusa-web-staging` Cloud Run (min=0, Redis-off) + a Neon copy-on-write DB
  branch + a `staging`-branch Cloud Build trigger + 10 isolated `*_STAGING` secrets. Prod JWT/COOKIE rotated.
  The backend finally has a place to rehearse change before prod.
- **S2 — Verified backups.** Neon PITR restore **drilled on staging**; a daily `pg_dump`→R2 escrow pipeline for
  both Neon + Supabase (Cloud Run Job + Scheduler, WORM-locked bucket) with **both restore drills executed**
  (exact match vs live). RPO/RTO runbook. Caught: Supabase dumps were silently empty without a `BYPASSRLS`
  backup role — always count-check a backup.
- **S3 — Graceful recovery.** Rollback runbook (revision repin + `git revert`, decision table, time-to-recover);
  startup+liveness probes upgraded **TCP→HTTP `/health`** in both deploy scripts and **applied to live prod**;
  forward-only migration posture; admin-exposure decision (keep `/app` + harden). Staging rollback drill
  executed (repin ~9 s; a bad revision is denied traffic by the startup gate).
- **S4 — Monitoring & alerting.** `provision-monitoring.sh` (idempotent): uptime check on `/health` + Cloud Run
  alert policies (5xx, p95 latency, memory, instance saturation) + an ERROR-log alert (GCP Error Reporting,
  not Sentry) → the existing `MiyagiDevopsTele` channel; **rehearsed end-to-end on staging then torn down**.
  Verified deploy-event pings already flow (`cicd-telegram-build-notifier` ACTIVE). Dependabot CVE scanning in
  the backend repo. **Story 4.2 (S3 fast-follow):** reconciled `deploy.sh` to live (9 env + 13 secrets — a full
  re-run had silently drifted and would have errored) + a static `node:test` **drift guard** in CI that locks
  the probe/CORS/parity invariants.

## What went well
- **Audit-first paid off.** Opening with a written audit + a Daniel-approved gap list meant S1–S4 were a
  finalized backlog, not a moving target — each sprint shipped against a known scope.
- **Reuse over rebuild.** Staging reused `cloudbuild.yaml`/`deploy.sh` parameterized; the DB is a Neon branch
  not a new database; monitoring reused the existing channel + the live deploy-notifier (the audit's "not
  shipped" was stale — verified instead of rebuilt). Error tracking chose GCP-native Error Reporting over a new
  `@sentry` dependency on the live service — zero prod-code change.
- **Rehearse-on-staging is real, not ceremony.** The S4 monitoring rehearsal caught **three** script bugs
  before they could touch prod (JSON quote-escaping, an org-policy warning from `config set`, unsupported
  comparison enums) — exactly the failures a "looks fine, ship it" would have hit on the prod run.
- **The drift guard turns an invisible footgun into a CI gate.** The §5 `deploy.sh`↔live drift (found in S3,
  confirmed by the cross-agent review) would have broken Flagsmith/MP on the next full deploy; it's now both
  reconciled and guarded so it can't recur silently.

## What we learned (promoted to Roadmap/LEARNINGS.md)
- **Image-only CI deploys let a deploy script silently drift from live** — the full-config script is never
  re-applied, so missing secrets / wrong sources accumulate until a full run errors. Reconcile against
  `gcloud run services describe` and guard parity statically.
- **Infra's deterministic gate is a config-assertion test, not Playwright** — a pure offender-finder + a
  `node:test` that fails CI on a regressed invariant is the right anti-erosion tool (same shape as the
  raw-color / monolith guards). Monorepo-root needed its first GitHub Actions workflow to host it.
- **Provision live cloud resources via an idempotent script and rehearse it on staging first** — create-if-absent
  by displayName makes re-runs safe; the rehearsal surfaces CLI-shape bugs (JSON escaping, enum values) for free.
- **Monitoring threshold conditions support only `COMPARISON_LT`/`GT`** (not GE/LE) and **log-based alerts need
  an `alertStrategy.notificationRateLimit`** — concrete gcloud-monitoring gotchas.

## Gaps / owed to Daniel
- **Run `provision-monitoring.sh TARGET=prod`** + confirm a real downtime/5xx/error alert **arrives in
  `MiyagiDevopsTele`** (he holds the prod/channel creds). Agent rehearsed staging end-to-end + tore it down.
- **Merge both PRs** (monorepo-root: Story 4.1/4.2 + docs; backend: Story 4.3 Dependabot). HIGH-risk tier — shared
  infra — so Daniel merges.
- **(optional) Liveness-recycle confirmation** (S3 §6 3b) — inject a `/health` hang to observe an auto-restart.
- **ADMIN_CORS tightening decision** (S3 §5) — drop the two vestigial storefront origins or keep.
- A full prod `deploy.sh` re-run is safe again post-reconcile, but stays a Daniel-authorized op (resets the full
  env/secret/CORS set).
