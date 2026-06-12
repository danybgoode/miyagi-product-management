# Backend Recovery & Rollback Runbook — miyagisanchez backend

> **Scope:** recovering the Medusa backend Cloud Run service (`medusa-web`, us-east4, project
> `miyagisanchezback-497722`) from a bad deploy or a sick instance. Pairs with the data-loss runbook
> ([backup-and-restore-runbook.md](backup-and-restore-runbook.md)) — *this* file is for **code/deploy**
> failure; that one is for **data** failure. Written for
> [Backend Production Readiness, Sprint 3](../Roadmap/09-platform-infra/backend-production-readiness/sprint-3.md).
> **Rollback rehearsals run on staging (`medusa-web-staging`), never prod.**

The backend has **no per-branch preview** — every push to `main` builds + auto-deploys to prod via the
`backend-main-deploy` Cloud Build trigger (~12 min). So a bad change reaches prod before any human sees it
running. The two levers below make that reversible in **seconds** (revision repin) to **~12 min** (revert).

---

## Decision table — symptom → lever → time-to-recover

| Symptom | Lever | Time-to-recover | Notes |
|---|---|---|---|
| Bad deploy serving errors / regressions; **schema unchanged** | **Cloud Run revision repin** (§1) | **seconds** | Fastest mitigation. The image of the prior good revision is already built + warm. |
| Confirmed-bad commit you want **off `main`** durably | **`git revert` on `main`** (§2) | **~12 min** | Triggers a fresh build+deploy. Use *after* a repin has already stopped the bleeding. |
| Bad **migration** (schema already changed) | **Forward-fix or DB restore** (§3) | minutes–<1h | A repin alone **cannot** fix this — the DB has moved. See migration posture. |
| Instance hung/wedged but listening | **Liveness probe auto-recycles it** (§4) | ~90s, automatic | No human action — the probe restarts it. Confirm via logs. |
| New revision never becomes ready | **Startup probe denies it traffic** (§4) | automatic | Bad revision never takes traffic; prior revision keeps serving. |

**Golden rule:** *repin first (stop the bleeding), then revert (durable fix).* A repin is a traffic change,
not a deploy — it's instant and reversible.

---

## 1 · Fast path — Cloud Run revision repin

Cloud Run keeps prior revisions (live today: `…00094`–`00100`). Traffic normally rides `latestRevision`, so a
bad deploy auto-takes 100% traffic. Repin moves 100% to a **named prior good revision** in seconds.

```bash
gcloud config configurations activate bonsai-profile        # leroytramafat@gmail.com
REGION=us-east4

# 1. List recent revisions; the current live one is at 100% (latestRevision).
gcloud run revisions list --service=medusa-web --region=$REGION \
  --format='table(metadata.name, status.conditions[0].status, metadata.creationTimestamp)' | head

# 2. Identify the last-known-good revision (the one serving before the bad deploy).
#    e.g. live=medusa-web-00100-859 went bad → prior good = medusa-web-00099-vv7.

# 3. Repin 100% traffic to it (INSTANT — no rebuild).
gcloud run services update-traffic medusa-web --region=$REGION \
  --to-revisions=medusa-web-00099-vv7=100

# 4. Verify prod is healthy again.
curl -s -o /dev/null -w '%{http_code}\n' https://api.miyagisanchez.com/health   # expect 200
```

- After repin, traffic is **pinned** to that named revision — the next `main` deploy will NOT auto-take
  traffic until you restore latest-revision routing:
  `gcloud run services update-traffic medusa-web --region=$REGION --to-latest`.
- **Do the durable fix (§2) before `--to-latest`**, or the next deploy re-serves the bad code.

---

## 2 · Durable path — `git revert` on `main`

`main` is the production line (WAYS-OF-WORKING). Reverting the bad commit rebuilds + redeploys clean.

```bash
# In the BACKEND repo (danybgoode/medusa-bonsai-backend):
git checkout main && git pull
git revert <bad-sha>            # or git revert HEAD for the last deploy
git push origin main            # → backend-main-deploy builds + deploys (~12 min)
```

- A revert is a **full ~12-min rebuild** — that's why §1 (repin) is the mitigation and this is the fix.
- Confirm the live revision actually rolled (a `SUCCESS` build ≠ a live revision):
  `gcloud run services describe medusa-web --region=us-east4 --format='value(status.latestReadyRevisionName)'`
- Once the reverted revision is live + healthy, restore latest routing: `--to-latest` (see §1).

---

## 3 · Migration-rollback posture — forward-only

**Medusa migrations are forward-only — there is no down-migration.** A repin (§1) reverts the *code* but
**not the schema**: if the bad deploy ran a migration, the DB has already changed and the prior revision may
not run against the new schema. Recovery from a bad migration is therefore one of:

1. **Forward-fix** (preferred): ship a *new* compensating migration on `main` that corrects the schema
   forward. No down-migration; you always move forward.
2. **Database restore** (last resort, data-loss risk): restore Neon to a point before the migration via
   [backup-and-restore-runbook.md](backup-and-restore-runbook.md) §1 (PITR within the 6h window, or escrow
   `pg_restore` for older) — **on a preserved branch, never prod in place.** This loses any commerce writes
   since the restore point (RPO ≤ 6h PITR / ≤ 24h escrow).

**Therefore: rehearse risky migrations on `medusa-web-staging` (Neon `staging` branch) first** — staging is
exactly the place to catch a migration that won't roll. A schema change is the one failure a fast repin
can't save you from.

---

## 4 · Health checks — startup + liveness probes (S3)

Before S3 the Cloud Run **startup probe was a bare TCP socket on :8080** (`failureThreshold:1`,
`period/timeout:240s`) and there was **no liveness probe** — a TCP-open port is *not* a ready Medusa, so
traffic could hit a still-booting or wedged instance. S3 upgraded both probes to hit Medusa's built-in
`GET /health` (returns 200). Configured in
[`infra/gcp/deploy.sh`](../infra/gcp/deploy.sh) + [`deploy-staging.sh`](../infra/gcp/deploy-staging.sh):

| Probe | Spec | Effect |
|---|---|---|
| **startup** | `httpGet /health`, period 10s × failureThreshold 24 = **≤240s** to become ready | A revision that never serves a healthy `/health` is marked failed and **denied traffic** — the prior revision keeps serving. Budget matches the old 240s TCP window. |
| **liveness** | `httpGet /health`, period 30s × failureThreshold 3 (≈90s) | A hung-but-listening instance failing `/health` is **auto-restarted**. Generous on purpose so transient blips don't kill healthy instances. |

- `/health` is unauthenticated (probe sends no creds) — verified 200 anon.
- **The probe change reaches prod only on the next prod deploy** (`deploy.sh` re-run / next `main` build).
  Until then the live `medusa-web` still has the old TCP startup probe. *(Live prod re-deploy owed to Daniel
  — see "Owed to Daniel".)*
- Verify after deploy:
  ```bash
  gcloud run services describe medusa-web --region=us-east4 \
    --format='yaml(spec.template.spec.containers[0].startupProbe, spec.template.spec.containers[0].livenessProbe)'
  ```

---

## 5 · Admin exposure + ADMIN_CORS (S3 security riders)

**Admin exposure — decision: KEEP `/app` + harden (2026-06-12, Daniel).** The Medusa admin SPA is served by
`medusa-web` at `/app` and is reachable in prod (`GET /app → 200`). Login is gated (`POST
/auth/user/emailpass → 401` to anon), so this is an *intentional posture*, not an open door. `medusa-config.ts`
serves it unless `DISABLE_MEDUSA_ADMIN==='true'` (unset). **Conscious choice:** keep the hosted admin (it's
used); hardening = strong admin credentials + treat the admin origin as sensitive; a bastion / IP-allowlist
is the future tightening lever if the auth surface ever needs shrinking. To disable instead: set
`DISABLE_MEDUSA_ADMIN=true` in `deploy.sh` env and redeploy.

**ADMIN_CORS — confirmed + corrected (2026-06-12).** Live `medusa-web` `ADMIN_CORS` =
`https://miyagisanchez.com, https://www.miyagisanchez.com, https://api.miyagisanchez.com`.

- `https://api.miyagisanchez.com` is **required and intended** — it's the admin's own serving origin, so the
  admin SPA's same-origin XHR to `/admin/*` needs it. This is the "extra origin" the S0 audit flagged; it is
  **correct**, given KEEP-`/app`.
- **Bug found + fixed:** `deploy.sh`'s `ADMIN_CORS` *default* previously **omitted** `api.miyagisanchez.com`,
  so a re-run would have silently dropped it from live ADMIN_CORS and **broken the admin UI**. S3 corrected
  the default to include it. *(verified by reading live config; fix is in the deploy script, applies on next
  prod deploy.)*
- The two storefront origins (`miyagisanchez.com`, `www`) are **not needed by the admin API** (the storefront
  uses `STORE_CORS`); they're vestigial but harmless. **Owed decision (Daniel):** tighten ADMIN_CORS to just
  `https://api.miyagisanchez.com`, or leave as-is. Left in place for now (low-risk, no behaviour change).

---

## 6 · Rehearsal — the staging rollback drill (Sprint 3 smoke)

Run on **`medusa-web-staging` only** (Neon `staging` branch, isolated secrets). Mirrors the sprint-3.md
smoke walkthrough. Each step that deploys to / mutates the staging service is **owed to Daniel** (he holds
the GCP creds / authorizes the broken-revision deploy).

1. **Read this runbook** → the repin + `git revert` steps + time-to-recover above are clear. *(self-verify)*
2. **Deploy a deliberately-broken revision to staging**, then repin to the prior revision per §1 → staging
   serves healthy (`/health` 200) again within the stated seconds. **[owed to Daniel — GCP creds]**
   ```bash
   # e.g. deploy a revision whose /health 500s or whose boot fails, confirm the startup probe
   # denies it traffic (staging keeps serving prior), then:
   gcloud run services update-traffic medusa-web-staging --region=us-east4 --to-revisions=<prior>=100
   ```
3. **Confirm the liveness probe recycles a hung instance** (or the startup probe blocks a bad revision from
   taking traffic) — observe the restart in `gcloud run services logs read medusa-web-staging`. **[owed to Daniel]**

If any step fails, note the step number + what you saw.

---

## Owed to Daniel (live / prod creds)
- **Apply the probe + ADMIN_CORS fixes to live prod** — they reach `medusa-web` only on the next prod deploy
  (`deploy.sh` re-run or next `main` build). Until then live prod keeps the old TCP startup probe.
- **The staging rollback rehearsal** (§6 steps 2–3) — deploys to the staging service.
- **ADMIN_CORS tightening decision** (§5) — drop the two storefront origins or keep.
