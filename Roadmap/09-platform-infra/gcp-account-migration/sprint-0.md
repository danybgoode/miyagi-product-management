# GCP account migration — Sprint 0: stand up the empty twin

**Status:** ✅ done 2026-07-19 — Story 0.2 (inventory) + Story 0.1 (twin provisioned)

**Story 0.1 record:** project **`miyagisanchez-prod`** under `lolis8755@gmail.com`, billing
**`019B4F-8DBBBA-3EE80C`** (OPEN), region us-east4. `provision.sh` green first run;
`provision-frontend.sh` green after two real fresh-project bugs were found + fixed in the script
(commit refs in this branch): (1) an IAM eventual-consistency race — an immediate grant against a
just-created SA 400s ("does not exist") — now a bounded wait; (2) the `REUSED_SECRETS` grant loop
assumed shells that only accumulated organically in the old project (`SUPABASE_*`,
`TELEGRAM_BOT_TOKEN`, `ML_APP_SECRET`) — now create-if-absent. Smoke walkthrough steps 1–6 all
pass: AR `medusa`+`frontend` · `medusa-redis` READY (`10.195.49.211`) · `medusa-conn` READY
`10.8.0.0/28` (no overlap — fresh default network) · `billingEnabled: true` · 36 secret shells ·
prod `https://miyagisanchez.com` 200 and untouched. ADC quota project set to `miyagisanchez-prod`.

> **Zero production exposure.** Nothing in this sprint points at, reads from, or changes the live
> stack. At the end you have a live, empty twin project and a verified inventory. This is the sprint
> that de-risks all the others — do not skip its verification half to get to the fun part.

> ✅ **Billing is not a blocker** — Daniel confirmed 2026-07-19 that the `lolis8755` account is fully
> paid and unlocked. Cloud SQL, Memorystore, and the VPC connector can provision immediately.

## Before you start — Daniel's auth step

```bash
# Add the new identity as a SEPARATE configuration. Do NOT overwrite bonsai-profile —
# keeping both is what makes running against old and new in one session (and rollback) trivial.
gcloud config configurations create lolis-profile
gcloud auth login                      # browser → sign in as lolis8755@gmail.com
gcloud auth application-default login  # same account — the Node/.mjs scripts need this

gcloud config configurations list      # expect bonsai-profile AND lolis-profile
gcloud billing accounts list           # capture the BILLING_ACCOUNT id for provision.sh
```

**Open question for Daniel:** keep a name like the old project, or take a fresh id? Project ids are
**globally unique and permanently immutable**, so `miyagisanchezback-497722` cannot be reused while
the old project exists. Expect a new id — nothing depends on it except our own script defaults.

## Stories

### Story 0.1 — Provision the empty twin
**As** Daniel, **I want** a fully provisioned, empty project under the new account, **so that** the
risky sprints have somewhere validated to land.
**Acceptance:** new project created + billing linked + APIs enabled;
`PROJECT_ID=<new> BILLING_ACCOUNT=<new> bash infra/gcp/provision.sh` and
`bash infra/gcp/provision-frontend.sh` both run **green**; Artifact Registry (`medusa`, `frontend`),
Memorystore (`medusa-redis`), and the VPC connector (`medusa-conn`) exist in `us-east4`.
**Nothing points at it.** Prod is untouched and unaware.
**Risk:** LOW — no production surface.

### Story 0.2 — Verify the inventory against reality
**As a** builder about to migrate money data, **I want** the script defaults confirmed against the
**live** old project, **so that** nothing gets silently left behind.
**Acceptance:** a written diff, committed to this sprint doc, between what `infra/gcp/`'s defaults
claim and what actually exists in `miyagisanchezback-497722`:
- `gcloud run services list` · `gcloud sql instances list` · `gcloud redis instances list`
- `gcloud secrets list` — **the real count**, vs the ~17 backend + ~25 frontend the deploy scripts
  reference. Any secret in the project that no script mentions is exactly the kind of thing that
  breaks a cutover at 2am.
- `gcloud scheduler jobs list` · `gcloud builds triggers list` · monitoring policies
- **Enumerate the secrets that are account-scoped, not value-scoped** — service-account keys and the
  Cloud Build↔GitHub connection must be **re-created, not copied**. Getting this list wrong is the
  most likely way Sprint 2 stalls.
- **Check for static-egress-IP allow-listing** at Stripe, Mercado Pago, Envía, or Mercado Libre. The
  new project's NAT IP will differ. Better to find this now than during the cutover.
- Assert the VPC connector range `10.8.0.0/28` doesn't overlap anything in the new project's network
  (trivially true in a fresh project — assert it anyway, don't assume).
**Risk:** LOW — read-only against prod.

## Sprint QA
- **Deterministic:** `infra/gcp/test/*` invariant tests run against the **new** project id.
- **No app deploy in this sprint** — nothing to smoke in the product sense.
- **Owed to Daniel:** the `gcloud auth` step above, the billing account id, and the project-id
  decision. An agent cannot do these.

## Sprint 0 — Smoke walkthrough (do these in order)
Env: the **new** project only · production is untouched throughout

1. Run `gcloud config configurations activate lolis-profile && gcloud projects list`.
   → The new project appears, owned by `lolis8755@gmail.com`.
2. Run `gcloud billing projects describe <new-project-id>`.
   → `billingEnabled: true`.
3. Run `gcloud artifacts repositories list --location=us-east4`.
   → Both `medusa` and `frontend` are listed.
4. Run `gcloud redis instances list --region=us-east4` and
   `gcloud compute networks vpc-access connectors list --region=us-east4`.
   → `medusa-redis` and `medusa-conn` both exist and are `READY`.
5. Open `https://miyagisanchez.com` in a browser.
   → **Still served by the OLD project, completely unaffected.** This is the step that confirms
   Sprint 0 was genuinely zero-exposure.
6. Read the Story 0.2 diff committed into this doc.
   → Every resource in the old project is either accounted for in the migration plan or explicitly
   marked "not migrating, because …". **No unexplained rows.**

If any step fails, note the step number + what you saw — that's the bug report.

---

## Story 0.2 — Inventory record (run 2026-07-19, read-only, as `leroytramafat@gmail.com`)

Live `miyagisanchezback-497722` vs what the epic README / `infra/gcp/` defaults claimed. Verdict:
**the README's inventory line was stale in every count.** Every row below is either "migrate via
existing script", "re-create (account-scoped)", or "not migrating, because …".

### Cloud Run services — 7, not 2

| Service | Migrate how |
|---|---|
| `medusa-web` | `provision.sh` + `deploy.sh` (S0/S1) |
| `miyagi-web` | `provision-frontend.sh` + `deploy-frontend.sh` (S0/S1) |
| `medusa-web-staging` | `provision-staging.sh` / `deploy-staging.sh` — **after cutover, low priority** (rehearsal surface, nothing external points at it) |
| `pmo-smalldocs` | `infra/gcp/pmo-smalldocs.md` documents it; redeploy from its own script post-cutover — advisory tooling, not user-facing |
| `print-pdf` | its deploy path lives with the print epic tooling; redeploy post-cutover — used by print flows, verify before S3 whether anything prod-critical calls it (check callers during S2) |
| `cicd-telegram-build-notifier`(+`-frontend`) | `deploy-cicd-telegram-notifier*.sh` in backend repo's `infra/gcp/` — re-deploy fresh (see stale-binding landmine below) |

- Domain mapping: `api.miyagisanchez.com → medusa-web`. ⚠️ **A Cloud Run domain mapping is a
  single-project claim** — the new project cannot map the same hostname while the old mapping
  exists, and domain verification belongs to the Google account. **Flagged for Sprint 2/3
  planning:** either delete-old→create-new inside the cutover window (brief gap), or move `api.` to
  Cloudflare-proxied routing like the frontend. Decide in S2, rehearse the choice.

### Cloud SQL / Redis / VPC
- `medusa-pg` POSTGRES_17, us-east4, ZONAL, RUNNABLE — S1 backup-restore rehearsal, S3 final sync.
- `medusa-redis` BASIC 1 GB READY — provisioned fresh by `provision.sh` (cache/workflow state, no data to migrate).
- `medusa-conn` 10.8.0.0/28 on `default` READY — fresh via `provision.sh`; no overlap possible in a fresh project's default network (assert at S0.1).
- VPC peering range `google-managed-services-default` 172.25.0.0/16 (Cloud SQL private services access) — created by `provision-cloudsql.sh`.

### Cloud Run jobs — 2 (epic README missed both)
- `db-backup` (R2 escrow; binds `SUPABASE_BACKUP_DSN`, `NEON_BACKUP_DSN`, `R2_BACKUP_*`, `TELEGRAM_*`) — `infra/gcp/backups/provision-db-backup.sh`.
- `cloudsql-backup-check` (binds `TELEGRAM_*`) — its provision script + SA `medusa-backup-check`.

### Cloud Functions (2nd gen) — 2
- `cicd-telegram-build-notifier` + `-frontend`, trigger `topic: cloud-builds`. ⚠️ **Live landmine
  (old project):** both bind `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CICD_CHAT_ID` via uuid-named secrets
  (`secret-852cee64…`, `secret-813d0b5f…`) that were **deleted after last deploy** — running
  revisions fine, any redeploy fail-closes. On the new project: re-deploy via the scripts, which
  bind the real named `TELEGRAM_*` secrets. Nothing to copy.

### Schedulers — 6, not 4
`frontend-launchpad-campaigns` 0 6 · `frontend-domain-lapse-sweep` 0 7 · `frontend-print-pending`
0 8 · `frontend-order-autoconfirm` 0 9 · `db-backup-daily` 0 9 · `cloudsql-backup-check-daily`
0 12 — all ENABLED. S2 provisions **all six** on the new project PAUSED (the sprint doc's "four"
undercounts — the two backup crons ride the backups provision scripts).

### Build triggers — 3, not 2
`frontend-main-deploy` · `backend-main-deploy` · `backend-staging-deploy` — all enabled. S2
re-creates all three DISABLED (staging trigger included).

### Secrets — 60, not ~40
- 46 bound across Cloud Run services + 7 more on jobs (51 unique live-bound).
- 11 unbound-but-real, all traced: 7 `NEXT_PUBLIC_*` = **frontend Cloud Build build-args**
  (`apps/miyagisanchez/cloudbuild.yaml` `availableSecrets`) — must copy; `CLOUDFLARE_ACCOUNT_ID`
  (cloudflare `.mjs` scripts) — copy; `R2_BACKUP_BUCKET` (backup scripts) — copy;
  `SERPAPI_KEY` — in `deploy-frontend.sh`'s list but **not bound on live `miyagi-web`**
  (script-vs-live drift; copy the value, let `deploy-invariants.test.js` adjudicate);
  `github-github-oauthtoken-ea48e7` — **account-scoped, do NOT copy** (re-created by the new
  project's Cloud Build GitHub OAuth connection, Daniel's console step in S2).
- **Copy = 59 named secrets** (everything except the GitHub OAuth token). No rotation.

### Account-scoped — re-create, never copy
1. Cloud Build ↔ GitHub OAuth connection (+ its `github-github-oauthtoken-*` secret) — Daniel console step, S2.
2. **All 11 service accounts** — emails embed the project id, so every SA is re-created by the
   provision scripts. ⚠️ **External consumer:** `pmo-report-writer` SA **key** is held as an env var
   in a claude.ai routine (see team memory `multi-epic-batch-2026-07-17`, still pending with
   Daniel) — after cutover a NEW key from the new project's SA must replace it, or the routine
   writes to a dead project. Added to S3.2's repoint list.
3. Cloud Run URLs (`*-oehqqtyoia-uk.a.run.app`) — per-project; new URLs everywhere the scripts
   template them. External callers use custom domains except where the raw URL leaked — grep at S2.
4. Domain mapping `api.miyagisanchez.com` (see Cloud Run section above).

### ALB / networking
- `miyagi-web-fwd-rule` → `miyagi-web-https-proxy` → `miyagi-web-backend` → `miyagi-web-neg`,
  static IP `miyagi-web-lb-ip` **136.68.90.56** — re-provisioned fresh (`provision-alb-frontend.sh`);
  the NEW static IP is what `cloudflare-cutover-flip.mjs` flips the origin to at S3.
- **No Cloud NAT, no static egress IP** → outbound calls to Stripe/MP/Envía/ML ride dynamic Google
  IPs already → **the Story 0.2 egress-IP allow-listing concern is structurally cleared.**

### Monitoring
6 alert policies + 1 uptime check (`[medusa-web] health`) — all medusa-web-scoped, via
`provision-monitoring.sh` at S2. (No frontend-scoped policies exist — ALB/Cloudflare cover it.)

### Storage buckets — 6
`miyagi-pmo-reports`(+`-staging`) — **data to migrate** (report registry,
`provision-report-registry.sh` + copy objects). The other 4 (`gcf-v2-*` ×2, `*_cloudbuild`,
`run-sources-*`) are auto-created build artifacts — not migrating, recreated implicitly.

### Artifact Registry — 6 repos, not 2
`medusa` + `frontend` (script-provisioned) · `medusa-ops`, `print`, `cloud-run-source-deploy`,
`gcf-artifacts` (created by their own deploy paths) — no images worth copying; every image is
rebuilt from source on the new project.

### Billing
Old project on **OPEN** MXN account `01BCB8-AA3451-6EC373` (leroytramafat). New billing account id
under `lolis8755` captured at S0.1 auth (`gcloud billing accounts list`).
