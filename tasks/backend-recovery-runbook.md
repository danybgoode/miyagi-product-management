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

Cloud Run keeps prior revisions (observed 2026-06-12: `…00094`–`00100`, current live at 100%). Traffic
normally rides `latestRevision`, so a bad deploy auto-takes 100% traffic. Repin moves 100% to a **named prior
good revision** in seconds. *(Revision names below are illustrative — always run step 1 to read the current
list; don't copy a stale name.)*

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

- `/health` is unauthenticated (probe sends no creds) — observed 200 anon 2026-06-12 (S0 audit + S3).
- **Flag shape verified.** The `--startup-probe`/`--liveness-probe` KEY=VALUE form (dotted keys, e.g.
  `httpGet.port=8080,timeoutSeconds=10`) is confirmed by `gcloud run deploy --help` on the installed SDK
  (`Google Cloud SDK 555.0.0`). The **live parse + apply** is verified by the **staging deploy** (the S3
  rollback rehearsal re-runs `deploy-staging.sh` with these exact flags) — see §6. Staging is deliberately
  the first place these flags hit a real `gcloud run deploy`, so a prod deploy never meets them untested.
- **The probe change reaches prod only on the next prod deploy** (`deploy.sh` re-run / next `main` build).
  Until then the live `medusa-web` still has the old TCP startup probe. *(Live prod re-deploy owed to Daniel
  — see "Owed to Daniel".)*
- Verify the applied probes (after any deploy):
  ```bash
  gcloud run services describe medusa-web --region=us-east4 \
    --format='yaml(spec.template.spec.containers[0].startupProbe, spec.template.spec.containers[0].livenessProbe)'
  ```

---

## 5 · Admin exposure + ADMIN_CORS (S3 security riders)

**Admin exposure — decision: KEEP `/app` + harden (2026-06-12, Daniel).** The Medusa admin SPA is served by
`medusa-web` at `/app` and is reachable in prod (`GET /app → 200`, observed 2026-06-12). Login is gated
(`POST /auth/user/emailpass → 401` to anon, observed 2026-06-12), so this is an *intentional posture*, not an
open door. `medusa-config.ts`
serves it unless `DISABLE_MEDUSA_ADMIN==='true'` (unset). **Conscious choice:** keep the hosted admin (it's
used); hardening = strong admin credentials + treat the admin origin as sensitive; a bastion / IP-allowlist
is the future tightening lever if the auth surface ever needs shrinking. To disable instead: set
`DISABLE_MEDUSA_ADMIN=true` in `deploy.sh` env and redeploy.

**ADMIN_CORS — confirmed + corrected.** Live `medusa-web` `ADMIN_CORS` (observed 2026-06-12) =
`https://miyagisanchez.com, https://www.miyagisanchez.com, https://api.miyagisanchez.com`. Read via:
```bash
gcloud run services describe medusa-web --region=us-east4 \
  --format='json(spec.template.spec.containers[0].env)'   # then read the ADMIN_CORS entry
# Probe state (the pre-S3 TCP socket) was read from the same describe under
#   spec.template.spec.containers[0].startupProbe   → tcpSocket.port: 8080 (no livenessProbe).
```

- `https://api.miyagisanchez.com` is the admin's own serving origin (`/app`) and part of the **working** live
  config — the "extra origin" the S0 audit flagged. *Mechanism note:* same-origin requests don't strictly
  need CORS, but Medusa still validates the `Origin` header against `adminCors`, so **the live list is the
  source of truth to preserve** — don't reason about it purely from CORS theory.
- **Drift bug found + fixed:** `deploy.sh`'s `ADMIN_CORS` *default* **omitted** `api.miyagisanchez.com`.
  Because the deploy uses `--set-env-vars` (replace, not merge), a re-run would reset live ADMIN_CORS to the
  default — **dropping that origin** and diverging from the known-good live config (risking rejected admin
  requests). S3 corrected the default to match live. *(applies on the next prod deploy.)*
- The two storefront origins (`miyagisanchez.com`, `www`) aren't used by the admin path (the storefront uses
  `STORE_CORS`); likely vestigial. **Owed decision (Daniel):** tighten ADMIN_CORS to just
  `https://api.miyagisanchez.com`, or leave as-is. Left in place for now (low-risk, no behaviour change).

---

## 6 · Rehearsal — the staging rollback drill (Sprint 3 smoke) — ✅ EXECUTED 2026-06-12

Run on **`medusa-web-staging` only** (Neon `staging` branch, isolated secrets; no real money). Executed live
on 2026-06-12 — prod (`medusa-web`) never touched. To apply just the probes without resetting staging's
env/CORS, the drill used `gcloud run services update --startup-probe/--liveness-probe` (not a full
`deploy-staging.sh` re-run, which would reset CORS to its localhost default).

| # | Step | Result |
|---|---|---|
| 0 | Apply S3 probes to staging (`services update`) | ✅ Flags parse against live `gcloud` (SDK 555.0.0); rev `…00003` deployed + served → a healthy image **passes** the new HTTP `/health` startup probe. Probes confirmed attached via `describe`. |
| 1 | Read this runbook → repin + revert steps clear | ✅ |
| 2 | **Repin rollback** (§1): `update-traffic --to-revisions=<prior>=100`, then `--to-latest` | ✅ Traffic switched to the prior revision in **~9 s**; `/health` 200; restored to latest. (Cold-start `/health` latency 40–56 s is the min=0 scale-to-zero parity gap, **not** rollback time — the repin itself is seconds.) |
| 3a | **Startup-probe gate**: deploy a revision with a bad startup path (`/__startup_should_fail`, fast-fail) | ✅ Rollout **rejected** ("failed the configured startup probe checks"); broken rev `…00004` = `Ready:False`, **0% traffic**; prior `…00003` kept serving; staging `/health` **200 throughout**. Proves "failed-startup revisions don't take traffic." |
| 3b | **Liveness recycle** of a genuinely hung-but-listening instance | ⏳ **residual** — can't be forced without an app change that hangs `/health` while still accepting TCP. The liveness probe is **configured + verified attached**; healthy instances keep passing it. Owed as an optional live confirmation (inject a hang) if we want to observe an actual restart. |
| — | Cleanup | ✅ Restored the service template to `/health` (rev `…00005`); staging healthy. |

> **Gotcha recorded:** a failed `services update` (3a) still mutates the **service template** — the rejected
> revision's bad startup-probe path persisted in the template even though it took 0% traffic, so the *next*
> deploy would inherit it. Always restore the good probe on the template after a broken-revision test (done
> here as `…00005`). The serving revision was unaffected (revisions are immutable snapshots).

**Repro commands** (staging):
```bash
REGION=us-east4; STAGING=https://medusa-web-staging-oehqqtyoia-uk.a.run.app
# repin to prior, then restore:
gcloud run services update-traffic medusa-web-staging --region=$REGION --to-revisions=<prior>=100
gcloud run services update-traffic medusa-web-staging --region=$REGION --to-latest
# broken-revision gate (then restore the /health startup probe afterwards):
gcloud run services update medusa-web-staging --region=$REGION \
  --startup-probe="httpGet.path=/__startup_should_fail,httpGet.port=8080,timeoutSeconds=3,periodSeconds=5,failureThreshold=2"
```

---

## Owed to Daniel (live / prod creds)
- **Apply the probe + ADMIN_CORS fixes to live prod** — they reach `medusa-web` only on the next prod deploy
  (`deploy.sh` re-run or next `main` build). Until then live prod keeps the old TCP startup probe.
  *(The staging drill (§6) already proved these flags parse + apply + behave; prod is the same `deploy.sh`.)*
- **(optional) Liveness-recycle confirmation** (§6 step 3b) — observe an actual restart by injecting a `/health`
  hang on a staging instance. Lower value: the probe is verified attached and the startup gate is proven.
- **ADMIN_CORS tightening decision** (§5) — drop the two storefront origins or keep.
