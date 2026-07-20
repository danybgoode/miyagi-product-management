# GCP account migration — Sprint 4: decommission the old project

**Status:** ⬜ not started — **deliberately deferred** (cutover ran 2026-07-19; soak clock started)

**Added at S3 close (2026-07-19) — items the cutover deferred here:**
- ✅ **Closed during the soak, not deferred to teardown:** redeployed
  `cicd-telegram-build-notifier(-frontend)` in `miyagisanchez-prod`. The post-cutover audit proved
  that copying the Telegram secrets did not migrate the old project's Pub/Sub subscriptions or
  Gen2 functions, so successful new-project builds had no deploy-finish alerts. Keeping this
  observability gap open until destructive teardown would have hidden failures during the exact
  period meant to establish confidence.
- Delete old `miyagi-pmo-reports` bucket **before** project deletion (frees the GLOBAL name
  immediately) → recreate via `provision-report-registry.sh` in the new project → restore the
  ~600 KB of objects from the final export.
- Mint a new `pmo-report-writer@miyagisanchez-prod` SA key and replace it in the claude.ai
  routine's env var (the old-project key dies with the project).
- Redeploy the remaining post-cutover-deferred surfaces in the new project: `pmo-smalldocs`,
  `print-pdf`, and the staging stack (`provision-staging.sh`/`deploy-staging.sh` +
  `backend-staging-deploy` trigger).
- Delete the old project's `api.miyagisanchez.com` Cloud Run domain mapping (orphaned by the flip;
  `api.` now rides the ALB host rule).
- Old-project monitoring/uptime still watches the shared domain — tear down with the project.

> ⏸️ **Do not run this sprint immediately after Sprint 3.** Between the cutover and this sprint, the
> intact old project **is the rollback plan**. Deleting it early trades a minutes-long recovery for
> a restore-from-backup. There is no upside to hurrying — an idle project costs very little, and
> Cloud SQL is the only meaningful line item.
>
> **Gate:** Daniel explicitly says go, after an agreed quiet period (suggest ≥2 weeks) during which
> the new project has been healthy, the daily prod smoke has stayed green, a full billing cycle's
> crons have run, and at least one real order has settled end to end.

## Stories

### Story 4.1 — Tear down the old project
**As** Daniel, **I want** to stop paying for the old stack, **so that** the migration is actually
finished.
**Acceptance, in this order — each step reversible until the last:**
1. **Take a final Cloud SQL export to durable storage** and verify it restores. Do this *first*, and
   keep it well beyond the project's deletion. This is the last exit.
2. Confirm nothing still references the old project: grep `infra/`, `apps/`, `scripts/`, and the
   Roadmap docs for the old project id, the old Cloud Run URLs, and the old Artifact Registry paths.
   **Zero live references** (historical mentions in shipped retros and this epic's own docs are fine
   and should stay — they're the record).
3. Check the providers once more — Stripe, Mercado Pago, Mercado Libre, Cloudflare — for any
   endpoint still pointing at the old origin.
4. Stop the old Cloud Run services and pause the old Cloud SQL instance. **Leave them in this state
   for a further observation period** — a stopped service is still recoverable in seconds.
5. Only then: delete the old project and unlink its billing account.
**Risk:** LOW at this point — but only because everything above was done first. Skipping step 1
makes this the highest-risk story in the epic.

## Sprint QA
- **Deterministic:** the reference grep from step 2 is the real gate — automate it as a one-off
  check and paste the output in the PR.
- **Owed to Daniel:** the go/no-go, and the final deletion itself. **An agent should not delete a
  production project.** The agent prepares, verifies, and reports; Daniel presses the button.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (on the new project throughout)

1. Verify the final export restores: restore it into a scratch instance and check row counts.
   → Matches. **Do not proceed if this fails.**
2. Run the reference grep for the old project id across the repos.
   → No live references (only historical doc mentions).
3. Stop the old Cloud Run services. Wait the observation period. Open `https://miyagisanchez.com`.
   → Site fully normal. Place a test browse → cart → checkout flow.
   → Works. *(This proves nothing was quietly still depending on the old services.)*
4. Pause the old Cloud SQL instance. Wait. Re-check the site and the daily smoke.
   → Both green.
5. Delete the old project; unlink billing.
   → `gcloud projects list` under `bonsai-profile` no longer shows it.
6. Next billing cycle: check the old billing account shows no new charges.
   → Zero.

If any step fails, **stop and restore the old project's services** — every step before 5 is
reversible, and there is no deadline pressure on this sprint.
