# GCP provisioning — Medusa backend

Reviewable scripts to stand up the Medusa backend on **Cloud Run (us-east4)**, co-located
with Neon (AWS us-east-1). Nothing here runs automatically — read, set the variables, then run.

Target: see [`tasks/gcp-migration.md`](../../tasks/gcp-migration.md).
Recovery / rollback / health-probe / admin-exposure posture: see
[`tasks/backend-recovery-runbook.md`](../../tasks/backend-recovery-runbook.md) (Backend Production
Readiness S3). Admin-exposure decision: **KEEP `/app` + harden** (`DISABLE_MEDUSA_ADMIN` unset);
`deploy.sh`'s `ADMIN_CORS` default includes `api.miyagisanchez.com` (the admin's own origin).

## Billing — resolved

Project **`miyagisanchezback-497722`** is created under `leroytramafat@gmail.com` and linked
to **OPEN** billing account **`01BCB8-AA3451-6EC373`** (MXN). The scripts default to these.
Run as the `bonsai-profile` config (the `leroytramafat@gmail.com` identity).

## Order

```bash
# 0. Use the right identity
gcloud config configurations activate bonsai-profile

# 1. Enable APIs, provision AR + Memorystore + VPC connector + SA + secret shells
#    (project + billing-link steps are idempotent — already done, will be skipped)
bash infra/gcp/provision.sh

# 2. Populate secret VALUES (see prompts the script prints).
#    Rotate JWT_SECRET / COOKIE_SECRET here (do NOT reuse 'supersecret').
#    Set DATABASE_URL to Neon's POOLED endpoint (host contains '-pooler').

# 3. Build the image with Cloud Build and deploy the web service
bash infra/gcp/deploy.sh
```

## After deploy

- Map `api.miyagisanchez.com` → the Cloud Run service (or route via your existing Cloudflare tunnel).
- Repoint Vercel `MEDUSA_STORE_URL`, `STORE/ADMIN/AUTH_CORS`, Stripe `/hooks/payment/...`, MP webhook.
- Re-enable Medusa admin (drop the `NODE_ENV==='production'` disable in `medusa-config.ts`).
- Move `reconcile-checkouts` to a Medusa scheduled job; verify Session A reconciliation; decommission Render.

Runs a **single shared-mode** service. `min-instances=0` since the Neon egress reduction
(S2.3) — the backend idles/scales to zero so Neon's `main` endpoint can autosuspend (was 1;
the validated ~190 MB/day egress cause); the money-adjacent crons were externalized to Cloud
Scheduler (`provision-cron-scheduler.sh`) so they no longer need a warm instance. Split into
`server` + `worker` (set `MEDUSA_WORKER_MODE`) only when traffic warrants.

## CI/CD (automated deploys)

After the first manual deploy, `apps/backend/cloudbuild.yaml` + a Cloud Build trigger
give you push-to-main auto-deploy (replacing Render's auto-deploy). The deploy step only
swaps the image; Cloud Run preserves env/secrets/connector/SA set by `deploy.sh`.

```bash
# One-time GitHub connection is a console step (OAuth) — see cicd-setup.sh header.
bash infra/gcp/cicd-setup.sh   # grants Cloud Build SA deploy rights; creates the trigger
```
