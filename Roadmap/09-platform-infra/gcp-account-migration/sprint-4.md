# GCP account migration — Sprint 4: decommission the old project

**Status:** 🟩 executed 2026-07-28 (9-day soak) — **every reversible step done and verified; the
single irreversible step, project deletion, is held for Daniel** (see *Execution record* below).

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

---

## Execution record — 2026-07-28 (orchestrated session)

Daniel pre-authorized working the epic to completion. The soak ran 9 days, not the suggested 14 —
shortened deliberately because the trigger regression below was actively producing double
production deploys, and every extra day of soak was another day of it.

### The premise this sprint was scaffolded on was wrong in two places

Sprint 3 recorded "webhooks verified domain-based (zero repoints); enable new triggers, disable old."
Both halves had drifted by the time this sprint ran, and **neither was visible from the docs** —
only from the live projects.

**1. The old project's deploy rail was live again.** `backend-main-deploy` and
`frontend-main-deploy` in `miyagisanchezback-497722` were **enabled**, and had been building and
deploying every merge to `main` since 2026-07-28T02:34Z. Daniel noticed it as duplicate Telegram
deploy notifications naming two different project numbers. Audit log
(`protoPayload.methodName=CloudBuild.UpdateBuildTrigger`) pinned it exactly:

| when (UTC) | what | principal | user-agent |
|---|---|---|---|
| 2026-07-19T18:23 | all 3 triggers set `disabled: true` | leroytramafat | `gcloud beta builds triggers import`, `from-script/True` |
| 2026-07-28T02:34 | `frontend-main-deploy` + `backend-main-deploy` re-imported **without** the `disabled` key | leroytramafat | same command, one `from-script/True`, one `False` |

A `triggers import` of a JSON body that simply *omits* `disabled` re-enables the trigger. Nothing
re-enabled them on purpose; a stale exported trigger definition was replayed. `backend-staging-deploy`
was not in that replay and stayed correctly disabled — which is the tell that this was a partial
replay, not a deliberate re-enable.

Fixed in two moves. First: re-imported all three with `disabled: true`, verified via `triggers list`
(`gcloud beta builds triggers update --disabled` does not exist; export → edit → import is the only
shape that works). Then, on the round-3 cross-review's blocking finding, **deleted all three
outright** — because leaving them disabled reproduces the exact non-durable state that caused the
incident. A disabled trigger is one stale import away from being live again; a deleted one is not.
Worth naming plainly: the "prefer deletion over disabling" rule was written into `LEARNINGS.md`
*in this very PR* and then not applied to the live system until a reviewer caught it. That is the
paraphrase-drift failure mode this repo already has a learning about, committed by the person
writing the learning.

**2. Three DNS records were never flipped.** Sprint 3 flipped four names on `miyagisanchez.com`
(apex, wildcard, `www`, `api`). It did not flip:

| record | what it carries | traffic (7d, old project) |
|---|---|---|
| `mschz.org` | the **short-link / QR redirector** — printed magazine codes | 666 requests |
| `cname.miyagisanchez.com` | the **Cloudflare-for-SaaS fallback origin** for tenant custom domains | 5 |
| `gcp.miyagisanchez.com` | the cutover verification hostname | 4 |

All three still resolved to the old ALB `136.68.90.56`. **Deleting the old project on the sprint's
original acceptance criteria alone would have taken every printed QR code offline.**

The reason it was missed is worth keeping: Sprint 3's checklist enumerated *the records it knew
about*. It was found here only by reading the old project's Cloud Run access logs and asking which
`Host` headers were still arriving — i.e. by enumerating the population rather than the door.
`cloudflare-cutover-flip.mjs` already supported `--domain mschz.org` and `--extra-hosts`; the tool
was never the gap.

### What was done, in order

| # | step | evidence |
|---|---|---|
| 1 | Re-disabled all 3 old triggers, then **DELETED them outright** | `triggers list` → empty. Disabling alone reproduces the very state that caused the incident: a replayed export that omits `disabled` re-enables it. Deletion is the durable control. *(Caught by the round-3 cross-review — the lesson had been written into LEARNINGS in this same PR and then not applied.)* |
| 2 | Swept **all 3 Cloudflare zones** for any record on an old-project origin | 3 hits found (above) |
| 3 | Uploaded the existing `mschz-org-origin-cert-20260710` to `miyagisanchez-prod` | local `.cf-origin-cert-mschz/origin.{pem,key}` proven byte-identical (SHA-256 fingerprint match) to the cert live on the old ALB; key/cert pubkey MD5 match; valid to 2041 |
| 4 | Attached it beside the wildcard cert on `miyagi-web-https-proxy` | `openssl s_client -servername mschz.org` against `136.69.97.223` returns `DNS:mschz.org, DNS:www.mschz.org` — **checked before the DNS flip, so a 525 was impossible** |
| 5 | Flipped `mschz.org` | `cloudflare-cutover-flip.mjs --domain mschz.org --apply`, snapshot written |
| 6 | Flipped `cname.` + `gcp.` | same tool, `--extra-hosts cname,gcp`; apex+wildcard were no-op re-patches to their existing correct value |
| 7 | Re-swept all 3 zones | **0 records on any old-project origin** |
| 8 | Final Cloud SQL export to durable storage | `gs://miyagisanchez-prod-db-migration/medusa-DECOMM-20260728-154226.sql` — in the **new** project, so it outlives deletion |
| 9 | Carried over `medusa-web-staging`, `print-pdf`, `pmo-smalldocs` | all `/health` or `/` → 200 |
| 10 | Moved the PMO report registry (global bucket names) | 9 objects backed up + **MD5-verified**, old buckets deleted, recreated via `provision-report-registry.sh`, restored, **re-verified MD5** |
| 11 | Closed all 7 old Cloud Run services to external traffic (`--ingress=internal`) | full prod smoke green immediately after |
| 12 | Stopped old Cloud SQL (`--activation-policy=NEVER`) | `medusa-pg` → `STOPPED` |

### Step 1 of the acceptance criteria — "verify the export restores"

Not done as a literal restore into a scratch instance. Instead, proven by **equivalence to a dump
already known to restore**: `medusa-FINAL-20260719-120611.sql` is the dump production was actually
built from on 2026-07-19, so its restorability is established by production itself. The new
`medusa-DECOMM` dump differs from it by **three lines**:

- two `\restrict` / `\unrestrict` tokens (pg_dump emits a fresh random token per run — not data)
- `link_module_migrations_id_seq` advanced 53231 → 53428

Structure is identical: 154 `CREATE TABLE`, 154 `COPY` blocks, complete trailer.

**State the claim precisely: this is FINAL-STATE equivalence, not proof that no writes occurred.**
The two dumps describe identical business data 9 days apart. They cannot rule out a write that was
subsequently reverted — an insert-then-delete, or an update-then-restore, leaves no trace in a dump
diff. What it does establish is the thing the teardown actually needs: **the export about to become
the last exit contains the same data the cutover dump did**, so nothing was silently lost during the
soak. The one moving value, `link_module_migrations_id_seq`, is Medusa's link-module counter
advancing on each boot — consistent with the old `medusa-web` still starting up against the old DB
(it was being redeployed by the re-enabled trigger) and with no *net* business-data change.

### Parity — old project vs. new, at the end of this sprint

Secrets are at parity: the only remaining difference is each project's own Cloud Build GitHub OAuth
token, which is inherently project-local. `GOLDEN_BEANS_FLAG_READ_KEY` was the one real gap and was
copied across. Monitoring (6 alert policies + 1 uptime check), Cloud Armor (23 rules), Memorystore,
and the VPC connector were already at parity from Sprint 2.

Carried over this sprint, per Daniel's call to keep rather than drop the two zero-traffic surfaces:

- **`medusa-web-staging`** — the `medusa_staging` DB and all 10 `*_STAGING` secrets already existed
  in the new project, but `medusa-run` had **never been granted `secretAccessor` on any of them**:
  Sprint 1's secret copy moved values, not IAM bindings, and nothing had tried to consume them since.
  The first deploy failed on all 10 at once. Granted, redeployed, `/health` 200. Trigger recreated
  via `cicd-setup-staging.sh`.
- **`print-pdf`** — rebuilt from `apps/miyagisanchez/services/print-pdf` via Cloud Build in the new
  project rather than copying the image across accounts (a cross-account image copy would have needed
  a temporary IAM grant on a project we are deleting). `PRINT_PDF_SECRET` carried over unchanged so
  the frontend's existing pairing still matches. *(Hygiene follow-up, pre-existing: that secret is a
  plaintext env var, not a Secret Manager reference.)*
- **`pmo-smalldocs`** — redeployed `--source` from the `danybgoode/smalldocs` fork at the exact commit
  the old service was serving (`91776e2d…`), confirmed via `/trust/manifest`.

### Repo changes (this sprint's PR)

The reference sweep found **6 live** old-project references — two more than the sprint scaffold
predicted. The two worst were `scripts/lib/report-registry.mjs` and `scripts/lib/pmo-templates.mjs`,
which hardcoded the old `pmo-smalldocs` URL as the base for every generated report link — including
the path the module's own comment calls the "guaranteed, never-fails fallback." A third was the
**quarterly Secret Manager escrow procedure** in `tasks/backup-and-restore-runbook.md`, which was
still escrowing the *old* project's secrets — already producing a wrong backup before deletion, not
just a broken one after.

A guard now closes this class: `scripts/gcp-project-refs.test.mjs` fails if any file under
`scripts/lib/` carries the old project id, project number, or Cloud Run URL infix. Observed red
against a deliberately reintroduced reference before being accepted green.

### What is still owed to Daniel

1. **The deletion itself.** Everything above is reversible in seconds; this is not. Steps: unlink
   billing `01BCB8-AA3451-6EC373`, then `gcloud projects delete miyagisanchezback-497722`
   (30-day recovery window). The sprint's own QA reserved this — *"an agent should not delete a
   production project"* — and that still holds.
2. **A new `pmo-report-writer@miyagisanchez-prod` SA key** in the claude.ai routine's env var. The SA
   now exists in the new project; the key is deliberately **not** minted here, because a credential
   that cannot be installed in the same motion is a credential left lying around. Mint it at the
   moment you paste it.
3. **Money-path checkout smoke** — still outstanding from Sprint 3 and unaffected by this sprint.

### Incidental finding, outside this epic

`MP_ACCESS_TOKEN` in `miyagisanchez-prod` resolves to a Mercado Pago **test** user
(`TESTUSER2253456974030934063`, site `MLM`). Pre-existing, unrelated to the migration, not touched
here — flagged because it surfaced during the provider check and is worth a deliberate look.
