---
title: "GCP account migration — leroytramafat → lolis8755 (new project, rebuild + cutover)"
slug: gcp-account-migration
status: ready
area: "09"
type: chore                          # infra move, no user-facing change — but the highest-stakes chore on the board
priority: null
risk: high                           # production commerce DB + all of prod hosting moves; a real cutover window
epic: null
build_order: null
updated: 2026-07-19
---

# Scope — move production GCP from `leroytramafat@gmail.com` to `lolis8755@gmail.com`

## Mirror-back of the ask

> *"We are migrating to a different GCP cloud account. Right now we're on `leroytramafat@gmail.com`
> and we're moving to `lolis8755@gmail.com`. All settings can be the same to make it as seamless as
> possible. The authed account in the CLI is leroytramafat; lolis' account is fully new with only one
> project (the default) which we could use for this plus anything else needed."*

You want prod running under the new identity, configured identically, with as little disruption as
possible. Right?

**One thing to correct up front, because it changes the shape of the plan:** this is not a hosting
move. Since the `postgres-neon-to-cloudsql` epic closed (2026-06-22, ✅ shipped), **the production
commerce database lives in Cloud SQL inside the project we're leaving.** Moving GCP accounts now
means **moving the money data**, with a cutover window and a rollback plan. That's a HIGH-risk epic,
not a weekend chore — and it's the single most consequential item in this grooming batch.

## Stage-2.5 bucket

**Genuinely new work — but overwhelmingly *reuse*, not build.** The good news is large: every
provisioning script under `infra/gcp/` is **already parameterized by `PROJECT_ID`**, defaulting to
`miyagisanchezback-497722` via `${PROJECT_ID:-…}`. The migration is mostly *"run the scripts we
already have against a new project id"* plus data + secret movement plus a DNS/origin cutover.
**Almost no new code should be written.** If a sprint proposes writing new provisioning scripts,
that's a signal it has misread the reuse surface.

## Scope boundary (decided by Daniel, 2026-07-19)

**GCP-only.** In scope: a fresh project under `lolis8755`, re-provision, migrate secrets + Cloud SQL
data, repoint the Cloudflare origin. **Out of scope:** Cloudflare, Vercel, Clerk, Stripe, Mercado
Pago, Supabase, Cloudflare R2, Upstash, Resend, GitHub — those accounts stay exactly where they are.
They are *touched* only where a value must be repointed at the new origin (webhooks, callback URLs).

## Inventory — what actually lives in the old project

Read from `infra/gcp/` on 2026-07-19. **Re-verify against the live project before building** — a
script's default is not proof a resource exists.

| Resource | Identifier | Notes |
|---|---|---|
| Project | `miyagisanchezback-497722` | billing `01BCB8-AA3451-6EC373` (OPEN, MXN) |
| Region | `us-east4` | chosen to co-locate with the DB; keep it |
| Cloud SQL Postgres | `medusa-pg` | **production commerce data — the whole ballgame** |
| Cloud Run (backend) | `medusa-web` | `apps/backend`, ~12 min deploy |
| Cloud Run (frontend) | `miyagi-web` | `apps/miyagisanchez`, behind Cloudflare |
| Artifact Registry | `medusa`, `frontend` | Docker repos |
| Memorystore Redis | `medusa-redis` | |
| VPC connector | `medusa-conn`, range `10.8.0.0/28` | range must not overlap in the new project |
| Secret Manager | ~17 backend + ~25 frontend secrets | see `deploy.sh:95`, `deploy-frontend.sh:91` |
| Cloud Build triggers | backend + frontend push-to-main | **GitHub OAuth connection is a console step** |
| Cloud Scheduler | `frontend-order-autoconfirm` (0 9 \* \* \*) · `frontend-print-pending` (0 8) · `frontend-domain-lapse-sweep` (0 7) · `frontend-launchpad-campaigns` (0 6) | all hit `/api/cron/*` |
| Monitoring | `provision-monitoring.sh`, `provision-monitoring-frontend` | alerting policies |
| Load balancer | `provision-alb-frontend.sh` | |
| Report registry | `provision-report-registry.sh` | reporthub |
| Staging | `provision-staging.sh`, `deploy-staging.sh`, `STAGING.md` | **use this as the rehearsal** |

## What already exists (reuse, don't rebuild)

- **Every script in `infra/gcp/` takes `PROJECT_ID` as an env override.** The entire migration
  should be expressible as `PROJECT_ID=<new> BILLING_ACCOUNT=<new> bash infra/gcp/<script>.sh`.
- `infra/gcp/README.md` already documents the **exact run order** (provision → populate secrets →
  deploy → map domain → repoint webhooks → CI/CD). That order is the migration runbook; update it
  rather than authoring a parallel one.
- `infra/gcp/test/` — `deploy-invariants.test.js`, `alb-invariants.test.mjs`,
  `scheduler-invariants.test.mjs`, `cloudsql-backup-check.test.js`, `frontend-build-args.test.js`,
  `cloudflare-cutover-flip.test.mjs`. **These are the acceptance harness.** They should pass against
  the new project before cutover — that's most of the QA already written.
- `infra/gcp/cloudflare-cutover-flip.mjs` + its test — the **already-built, already-tested** origin
  flip from the 2026-07-10 Vercel→Cloud Run cutover. Reuse it; do not hand-edit DNS.
- `tasks/backend-recovery-runbook.md` — rollback/health-probe posture. The migration's rollback plan
  should reference it, not reinvent it.
- `infra/gcp/STAGING.md` — a whole staging path already exists. **Rehearse the migration there
  first.**
- Cloud SQL's own **export/import** and cross-project restore paths — no custom dump tooling.

## Proposed slicing (skateboard → car)

**Sprint 0 — Rehearse and inventory (LOW).** New project created under `lolis8755`, billing linked,
APIs enabled, `provision.sh` + `provision-frontend.sh` run green. Nothing points at it yet; prod is
untouched. **Deliverable: a live, empty twin** plus a verified diff between the scripts' defaults
and what's actually in the old project. This story de-risks everything after it and can be done in
an afternoon with zero production exposure.

**Sprint 1 — Secrets + data rehearsal (HIGH).** Copy all ~40 secret *values* into the new project's
Secret Manager. Restore a Cloud SQL **backup** (not the live DB) into the new instance and boot
`medusa-web` against it. Confirm the backend serves a catalog. **Still nothing in production points
here.** Rotate `JWT_SECRET`/`COOKIE_SECRET`? — **no**, keep them identical, or every existing
session and token is invalidated at cutover. Flag any secret that is *account-scoped* rather than
value-scoped and cannot simply be copied.

**Sprint 2 — CI/CD + scheduler + monitoring (LOW–MED).** Cloud Build triggers on both repos
(the **GitHub OAuth connection is a manual console step Daniel must do** — it cannot be scripted),
the four scheduler jobs, monitoring policies, ALB. Leave the new triggers **paused/disabled** so two
projects don't both deploy on a push to `main`.

**Sprint 3 — The cutover (HIGH, Daniel merges and Daniel picks the window).** Final DB sync, flip
the Cloudflare origin to the new Cloud Run services via `cloudflare-cutover-flip.mjs`, repoint
Stripe + Mercado Pago webhooks and the ML redirect URI, enable the new Cloud Build triggers and
disable the old ones, resume schedulers on the new side and pause them on the old. **Old project
stays fully intact and running for a rollback window** — this is what makes the cutover reversible.

**Sprint 4 — Decommission (LOW, deliberately deferred).** Only after an agreed quiet period with the
new project healthy: tear down the old project's services and unlink billing. **Do not fold this
into Sprint 3.** Keeping the old project alive is the rollback plan.

## How and when to authenticate — your part

You asked when to auth. **Not yet.** Sprint 0 is the first thing that needs it. When we get there:

```bash
# 1. Add the new identity as a SEPARATE gcloud configuration — do NOT overwrite bonsai-profile.
#    Keeping both lets us run against old and new in the same session, and makes rollback trivial.
gcloud config configurations create lolis-profile
gcloud auth login                      # browser opens → sign in as lolis8755@gmail.com
gcloud auth application-default login  # same account — needed for the Node/mjs scripts

# 2. Confirm both identities are live and switchable
gcloud config configurations list      # expect: bonsai-profile (leroytramafat), lolis-profile (lolis8755)

# 3. Find the new billing account id — needed for provision.sh
gcloud billing accounts list
```

Three things to check and report back before Sprint 0 starts:

1. **Is there a billing account on `lolis8755` with a payment method attached?** A brand-new Google
   account often has **no** billing account, only the free tier. Cloud SQL + Memorystore + a VPC
   connector will **not** provision without one. This is the most likely thing to block day one.
2. **Do you want to keep the existing project name/id or take a fresh one?** Project **ids are
   globally unique and permanently immutable** — `miyagisanchezback-497722` cannot be reused while
   the old project exists. Expect a new id; nothing depends on it except our own script defaults.
3. **The default project already in lolis' account** — is it genuinely unused? If so we can use it,
   but a purpose-named new project is cleaner and costs nothing.

## Acceptance criteria

- `https://miyagisanchez.com` and `https://api.miyagisanchez.com` serve from the **new** project's
  Cloud Run services; `gcloud run services list` under `lolis-profile` shows them healthy.
- A **real** end-to-end purchase completes on the new stack: add to cart → checkout → payment →
  order confirmation email → the order appears in the seller's order screen.
- Stripe and Mercado Pago webhooks deliver to the new origin (check provider dashboards for 200s,
  not just our logs).
- All four Cloud Scheduler jobs run on the new project and are **paused** on the old.
- A push to `main` in each repo deploys via the **new** project's Cloud Build only.
- Every `infra/gcp/test/*` invariant test passes against the new project.
- Zero data loss: row counts on the key commerce tables match pre- and post-cutover.
- The old project is still intact and could be flipped back to within minutes.

## QA / smoke stage

- `infra/gcp/test/*` is the deterministic layer and should be run against the new project each
  sprint.
- Backend has **no per-branch preview** — confirmation is post-deploy prod smoke (WAYS-OF-WORKING
  §5). The staging path (`STAGING.md`) is the rehearsal surface; use it in Sprint 1.
- **Owed to Daniel, by name:** the real-money checkout on the new stack (Sprint 3), the GitHub OAuth
  console connection (Sprint 2), the billing-account setup (Sprint 0), and the cutover go/no-go.
  An agent cannot and should not do any of these.

## Kill-switch

**N/A as a feature flag — the rollback *is* the old project.** Sprint 3's cutover is reversible by
re-running `cloudflare-cutover-flip.mjs` against the old origin, which is why Sprint 4 (decommission)
is a separate, deferred sprint. Record this carve-out at epic scaffold time (Stage 6b).

## Open risks / research

- **Billing account on the new identity is the #1 blocker.** Verify before anything else.
- **Cloud SQL cross-project move**: confirm the current path (export to GCS → import, vs. a
  cross-project backup restore) and, critically, **how long the final sync takes** — that duration
  *is* the cutover window. Measure it in Sprint 1's rehearsal; don't estimate it.
- **Secrets that are account- rather than value-scoped**: any GCP-issued service-account key, and
  the Cloud Build ↔ GitHub connection, must be re-created, not copied. Enumerate these in Sprint 0.
- **Static egress IP**: if Stripe, Mercado Pago, Envía, or Mercado Libre have any IP allow-listing
  against the current egress, the new project's NAT IP will differ. Check before cutover.
- **The VPC connector range** `10.8.0.0/28` must not overlap anything in the new project's network
  — trivially true in a fresh project, but assert it rather than assuming.
- **Two projects deploying at once** is the most likely self-inflicted outage. The new triggers stay
  disabled until Sprint 3 flips them, and the old ones are disabled in the same change.
- **Do not rotate secrets during this migration.** Rotation is a separate change with its own blast
  radius; combining them makes any failure undiagnosable. Note the temptation and refuse it.
