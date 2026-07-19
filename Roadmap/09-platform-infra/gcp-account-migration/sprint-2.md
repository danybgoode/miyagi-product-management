# GCP account migration — Sprint 2: CI/CD, schedulers, monitoring — all switched off

**Status:** ✅ done 2026-07-19 — everything provisioned and verified OFF/dark

**ALB record (completed after Daniel's cert go-ahead):** new Origin CA cert issued
(`miyagi-web-origin-cert-20260719`, apex+wildcard SANs, expires 2041 — key generated locally,
never left the machine, never committed); full stack on static IP **136.69.97.223** with the
approved `api.miyagisanchez.com → medusa-web` host rule (§6b) provisioned dark. Verified: probing
the IP with apex/api SNI returns **403 from Cloud Armor** (22-CIDR Cloudflare allowlist doing its
job against a non-Cloudflare source) — serving, locked, dark. Two script hardenings landed: an
add-backend "resource not ready" bounded retry (bit twice live — the portName-PATCH op can still
be in flight when its value check passes), and **the S3-critical fix: all 7 `cloudflare-*.mjs`
scripts hardcoded the OLD project id** — `cloudflare-cutover-flip.mjs` would have resolved the OLD
ALB's IP and silently "cut over" DNS to where it already points. All 7 are now `PROJECT_ID`-env
overridable, the flip selection covers the 4 real records (apex/wildcard/www/api, closed name-set,
primary domain only), and a **real dry-run against the live zone** plots exactly the four correct
flips to 136.69.97.223. Suite 147/147.

**Story 2.1 record:** Daniel connected both repos via the console OAuth step (one connection,
`cloud-build-github-connection`, us-east4). `cicd-setup.sh` + `cicd-setup-frontend.sh` ran green
(SAs, deploy rights, build-arg secret grants). Both triggers verified **disabled: True** via
`gcloud beta builds triggers export` → `disabled: true` → import (the non-beta surface has no
export). Old project's `backend-staging-deploy` deliberately deferred with the rest of staging.
`frontend-build-args.test.js` green. **The CI pipeline itself was rehearsed for real**: the
frontend cloudbuild.yaml ran manually against the new project (`SHORT_SHA=s2rehearsal`, 7m59s,
SUCCESS, buildx cache primed) and its image-only deploy step rolled `miyagi-web-00002-dfd` — the
revision now serving. Two S1-adjacent fixes that surfaced here: `deploy-frontend.sh`'s bare
`--tag` build path documented as non-bootable post-buildargs-hardening (Clerk fail-fast, hit
live); SERPAPI_KEY retired from provision+deploy scripts (empty shell everywhere, unbound live —
an unresolvable `:latest` would have fail-closed every fresh revision).

**Story 2.2 record:** all **6** schedulers (the doc's 4 frontend crons + `db-backup-daily` +
`cloudsql-backup-check-daily` the inventory added) exist on the new project, verified **PAUSED**,
frontend crons targeting the new `miyagi-web-zsl7ltapsq-uk.a.run.app` URL; old project's 6 still
ENABLED (prod untouched). Backup pipelines fully provisioned (jobs, SAs, `medusa-ops` AR repo,
images). Monitoring: `MiyagiDevopsTele` webhook channel re-created; 6 policies + `[medusa-web]
health` uptime check — exact old-project parity. IAM eventual-consistency bounded-wait fix
applied to both backup provision scripts (third+fourth occurrence of the S0.1 race).
**ALB: NOT provisioned yet** — needs a new Cloudflare Origin CA cert (additive; old ALB untouched).
Recommendation recorded: at S3, move `api.miyagisanchez.com` behind the ALB/Cloudflare-proxied
path (cert SANs already cover it) instead of racing the single-project Cloud Run domain-mapping
claim inside the cutover window.
**Deferred to S4 (recorded):** `miyagi-pmo-reports` bucket — GLOBAL name owned by the old project;
delete old bucket → recreate → restore objects (~600 KB) at decommission. `pmo-smalldocs`,
`print-pdf`, staging surface, Telegram notifier functions — post-cutover redeploys, per inventory.

> ⚠️ **The single most likely self-inflicted outage in this whole epic:** two projects both
> deploying on a push to `main`, or both running the same cron against the same database.
> **Everything provisioned in this sprint ships DISABLED / PAUSED.** Nothing here is enabled until
> Sprint 3 flips it in the same change that disables the old side.

## Stories

### Story 2.1 — Cloud Build triggers on both repos (left disabled)
**As** the team, **I want** push-to-main auto-deploy wired on the new project, **so that** after
cutover the normal cadence just works.
**Acceptance:** triggers exist for both repos on the new project, mirroring the old ones' config
(`apps/backend/cloudbuild.yaml`, the frontend equivalent). **Both created in a disabled state.**
`infra/gcp/test/frontend-build-args.test.js` green — the frontend build args are the thing most
likely to differ silently between projects.
**Daniel's manual step:** the **GitHub OAuth connection is a console step and cannot be scripted**
(`cicd-setup.sh`'s own header says so). Daniel does this one; the agent runs `cicd-setup.sh` after.
**Risk:** LOW while disabled.

### Story 2.2 — Schedulers, monitoring, ALB (schedulers paused)
**As** Daniel, **I want** the periodic jobs and alerting standing by on the new project, **so that**
cutover doesn't silently drop a cron or leave us blind.
**Acceptance:** all four scheduler jobs exist on the new project — `frontend-order-autoconfirm`
(`0 9 * * *`) · `frontend-print-pending` (`0 8`) · `frontend-domain-lapse-sweep` (`0 7`) ·
`frontend-launchpad-campaigns` (`0 6`) — pointing at the **new** frontend Cloud Run URL and **all
paused**. Monitoring policies and the ALB provisioned via the existing scripts.
`infra/gcp/test/scheduler-invariants.test.mjs` and `alb-invariants.test.mjs` green.
**Note:** `frontend-order-autoconfirm` touches orders. Running it from two projects at once against
one database is exactly the failure this sprint's "everything paused" rule exists to prevent.
**Risk:** LOW while paused.

## Sprint QA
- **Deterministic:** `infra/gcp/test/scheduler-invariants.test.mjs`, `alb-invariants.test.mjs`,
  `frontend-build-args.test.js`, `deploy-invariants.test.js` — all against the new project.
- **Owed to Daniel:** the GitHub OAuth console connection (Story 2.1). Blocking; nothing else in
  this sprint depends on it, so do it early.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: the **new** project · production still on the old project

1. Run `gcloud builds triggers list --project=<new-project-id>`.
   → Both triggers listed, and each shows **disabled**.
2. Run `gcloud scheduler jobs list --location=us-east4 --project=<new-project-id> --format='table(name,schedule,state)'`.
   → All four jobs listed, every `state` is **PAUSED**, and each URI points at the **new** frontend
   Cloud Run URL (not the old one, not the custom domain).
3. Run the same command against the **old** project.
   → All four still **ENABLED** there. *(Prod crons must keep running — we haven't cut over yet.)*
4. Push a trivial commit to a branch (not `main`) in either repo.
   → **No build fires** on the new project.
5. Check the monitoring policies exist on the new project.
   → Present, targeting the new services.
6. Open `https://miyagisanchez.com`.
   → **Still the old project.** Unchanged.

If any step fails, note the step number + what you saw — that's the bug report.
