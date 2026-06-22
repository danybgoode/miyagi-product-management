# Postgres → Cloud SQL — Sprint 2: Production cutover

**Status:** ✅ **CUTOVER EXECUTED LIVE 2026-06-22** (Daniel authorized + present; agent drove). Prod commerce now
runs on **Cloud SQL** (private IP, intra-VPC, `min=1`). Neon kept **read-only as rollback ~1 week**. Risk was
**HIGH** — production commerce DB, money data, a cutover window. PR #22 (guards + runbook) merged `8d0bacc`.

- **2.2 (guards)** ✅ `b50e796` — drift guard locks prod `--min-instances=1` / staging `0` (co-location ⇒ no
  `minScale:0`); `deploy.sh` documents the `DATABASE_URL` Neon→Cloud SQL home. `node --test 'infra/gcp/test/*.test.js'` → 19/19.
- **2.1 (cutover)** ✅ **executed** — see the **Execution log** below (real revision, row counts, baseline). The
  one item still **owed to Daniel** is the **money-path test checkout** (a real cart→pay→order); everything else
  was driven + verified.

## Execution log — cutover ran 2026-06-22 (~04:34–04:50 UTC)
Driven via a connector-attached **Cloud Run Job** running `postgres:17-alpine` (the dump/restore can't run from
a laptop — instance is private-IP-only and local `pg_dump` was 14; the job had PG17 + VPC + Neon egress). All
temp artifacts (the probe/migrate jobs, the `PROD_DSN_TMP` secret) were **deleted** after; the prod password
lives only in `DATABASE_URL` v3.

| Step | Result |
|---|---|
| Kill-switch OFF | Flagsmith `checkout.stripe_enabled` → new published version `enabled=false` (prod env 92069) |
| Neon read-only | `ALTER ROLE neondb_owner SET default_transaction_read_only = on` — verified: a fresh write got `cannot execute … in a read-only transaction` |
| Prod role | reused S1's `medusa_app` (fresh password); it's a `cloudsqlsuperuser` → CREATE in `medusa` works, **no admin-grant dance needed** |
| Dump + restore | `pg_dump` Neon `neondb` (custom, ~1.7 s, 543 KB) → `pg_restore --clean --if-exists` into Cloud SQL `medusa` — clean, no errors |
| Row-count parity | `order` 17=17 · `product` 60=60 · `customer` 7=7 (Neon = Cloud SQL) |
| Repoint | `DATABASE_URL` v3 = Cloud SQL DSN added → `:latest` resolves (destroyed-v2 block **healed**) |
| Redeploy | `gcloud run services update medusa-web --update-secrets=DATABASE_URL=DATABASE_URL:latest` → revision **`medusa-web-00106-x66`** serving 100% (it only serves if `/health` startup probe passed ⇒ booted on Cloud SQL) |
| Verify boot | `/health` **200** |
| Verify migrate | `npx medusa db:migrate` (backend image, VPC job) → every module *"Skipped. Database is up-to-date"*, "Migrations completed" → **no-op**; Redis connected too |
| Verify catalog | live Store API `GET /store/products` → **49 products** with real titles; live MCP `search_listings` → 10 full listings |
| Kill-switch ON | Flagsmith → new published version `enabled=true` |
| Egress baseline | `node scripts/neon-egress.mjs` at cutover: medusa-bonsai **4330.4 MB (86.6%)** — should now **flatline** (no GCP→Neon queries); re-read over the next days is the win signal |
| **Owed to Daniel** | a real **money-path test checkout** (cart→pay→order on a disposable shop); the agent's checkout proof was read-only (MCP `search_listings`/catalog) |

**Rollback (still armed ~1 week):** Neon is read-only + intact, `DATABASE_URL` v1 (Neon) still enabled. Revert =
re-add Neon DSN as a new highest `DATABASE_URL` version + `services update --update-secrets=DATABASE_URL=DATABASE_URL:latest`
+ `ALTER ROLE neondb_owner SET default_transaction_read_only = off`. (Commands in the Rollback block below.)

## Why
S1 proved the dump→restore→repoint→verify loop on staging. This sprint runs it on **prod main** inside a short
maintenance window, with the Flagsmith checkout kill-switch off so no buyer can transact mid-swap, and Neon kept
read-only as an instant rollback.

## Stories

### Story 2.1 — Production cutover runbook (kill-switch gated)
**As** the platform, **I want** prod commerce moved onto Cloud SQL with no lost/Сorrupted money data, **so that**
the egress bill goes to zero and the backend can stay warm.
**Acceptance (the runbook — each step has a verifiable result):**
1. Flip Flagsmith `checkout.stripe_enabled` **OFF**; confirm checkout is refused (422/disabled) across UI + agents.
2. `pg_dump` Neon **main** → restore into the Cloud SQL **prod** DB (reuse S1's proven commands).
3. Swap the **`DATABASE_URL`** secret to the Cloud SQL private DSN; **redeploy** `medusa-web`; confirm the new
   revision is live AND picked up the new secret version (`gcloud run services describe … latestReadyRevisionName`
   + a config check — `:latest` secrets need a fresh revision to roll).
4. Verify: Medusa **boots clean**, `db:migrate` is a **no-op**, a **catalog read** works, and a **test checkout**
   completes (disposable/test shop; clean up after).
5. Flip `checkout.stripe_enabled` back **ON**; confirm a real checkout path works.
- **Rollback:** keep Neon **read-only ~1 week**; the revert is swapping `DATABASE_URL` back + redeploy
  (document the exact revert command).
**Risk:** high (money data, prod cutover, brief downtime).

### Story 2.2 — Keep the infra guards honest
**As** the platform, **I want** `deploy.sh` + the drift guard to reflect the Cloud SQL `DATABASE_URL` home,
**so that** a future full deploy doesn't repoint the DB back to Neon.
**Acceptance:**
- `infra/gcp/deploy.sh` + `deploy-invariants.test.js` reflect where `DATABASE_URL` now comes from; the test
  stays **green**. `min-instances` stays **1** (co-location means no `minScale:0` tradeoff — the S2 of the old
  egress epic is explicitly NOT applied).
**Risk:** med (config parity).

## Sprint QA
- **deterministic gate:** `node --test 'infra/gcp/test/*.test.js'` green; backend `tsc`/build/test:unit green if
  any backend change.
- **live confirmation (owed to Daniel — HIGH):** the kill-switch flip, the dump/restore, the secret swap +
  redeploy, the **test checkout**, and the keep/rollback call. The agent owns the API-level catalog smoke + the
  egress re-measure.
- **success signal:** `node scripts/neon-egress.mjs` shows egress flat-lining toward **zero** after cutover.

## Sprint 2 — Cutover runbook + smoke walkthrough
_Derived from S1's proven staging commands (`sprint-1.md` steps 7b–13) — numbered, one action + one expected
result each, real prod commands. Every money/cutover/secret step is flagged **[OWED-DANIEL]**; only the catalog
read smoke + the egress re-measure are agent-runnable. **Run this with Daniel live** — it is a HIGH, money-data
cutover._

> **Confirmed mechanics (2026-06-22):** quiesce Neon by making it **read-only at the window start** (consistent
> dump + doubles as the ~1-week rollback posture); redeploy with a **surgical `gcloud run services update
> --update-secrets`** (one new revision re-binding only `DATABASE_URL`, minimal blast radius), not a full
> `deploy.sh` re-run.

### Shell setup (once)
```bash
gcloud config configurations activate bonsai-profile   # leroytramafat@gmail.com
PROJECT=miyagisanchezback-497722
REGION=us-east4
INSTANCE=medusa-pg
P=(--project="$PROJECT")
PRIVATE_IP=172.25.0.3          # confirm: gcloud sql instances describe $INSTANCE "${P[@]}" --format='value(ipAddresses[0].ipAddress)'
```

### Pre-flight — must ALL be true before opening the window
0a. **Staging canary is healthy on Cloud SQL.** `medusa-web-staging` was migrated in S1's rehearsal (steps
    7b–13) and serves `/health` 200 + catalog reads off the private IP. **If that in-VPC rehearsal hasn't
    actually run yet, run it first** — it is the dress rehearsal for this cutover.
    `curl -s -o /dev/null -w '%{http_code}\n' https://<staging-url>/health` → **200**.
0b. **A PG17 client in a VPC context is ready.** The instance is **private-IP-only**, so the dump→restore
    can't run from a laptop/sandbox, and `pg_dump` must be **PG17** (a local 14 refuses a PG17 server). Use
    `gcloud sql connect` with a PG17 client, or a one-off connector-attached **Cloud Run Job**. Note which.
0c. **`DATABASE_URL:latest` landmine acknowledged.** It currently resolves to a **destroyed v2** (empty-DB DSN),
    so prod *deploys are blocked* fail-closed (the running revision still serves Neon, unaffected). **This
    cutover heals it** by adding the real Cloud SQL prod DSN as the new highest version — which is exactly why
    step 6 (add version) + step 7 (redeploy) must come **after** the restore (step 5), never before.

### A · Close the window — kill-switch off + quiesce Neon
1. **Announce the maintenance window. Flip the kill-switch OFF.** `[OWED-DANIEL]`
   Set Flagsmith `checkout.stripe_enabled` → **OFF** (prod environment).
   → *(agent-verifiable)* checkout is refused everywhere it's enforced — UI, agents/MCP, and the backend
   `start-checkout` return **422 / disabled**. Confirm the 422 on the start-checkout path before proceeding.
2. **Quiesce Neon → read-only.** `[OWED-DANIEL]` On the Neon `main` DB (commerce project `shiny-paper-72860331`),
   make the app role read-only so nothing writes after the dump (this IS the rollback posture):
   ```sql
   ALTER ROLE <neon_app_role> SET default_transaction_read_only = on;
   ```
   → a test `INSERT`/`UPDATE` as that role is **refused** (`cannot execute … in a read-only transaction`).
   The running prod revision still serves *reads* off Neon until step 7's redeploy.

### B · Stand up the prod role + move the data
3. **Create the prod role on Cloud SQL** (reuse S1's unused `medusa_app`, set a **fresh** password). `[OWED-DANIEL]`
   ```bash
   PROD_PW="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32)"
   gcloud sql users set-password medusa_app --instance="$INSTANCE" --password="$PROD_PW" "${P[@]}"
   # (or `gcloud sql users create medusa_app …` if it was removed)
   ```
   → role exists with a fresh password (never echoed; captured into `$PROD_PW` in the same shell for step 6).
4. **Apply the prod grants** (mirror of S1 step 7b, retargeted to `medusa` / `medusa_app`). `[OWED-DANIEL]`
   From a VPC-context psql connected as the `postgres` admin (`gcloud sql connect $INSTANCE --user=postgres --database=postgres "${P[@]}"`):
   ```sql
   ALTER DATABASE medusa OWNER TO medusa_app;
   \c medusa
   GRANT ALL ON SCHEMA public TO medusa_app;
   ALTER SCHEMA public OWNER TO medusa_app;
   REVOKE CONNECT ON DATABASE medusa_staging FROM PUBLIC;   -- prod role can't reach staging DB
   REVOKE CONNECT ON DATABASE medusa         FROM PUBLIC;
   GRANT  CONNECT ON DATABASE medusa TO medusa_app;
   ```
   → no errors; `\l medusa` shows owner `medusa_app`. (No credential shared with `medusa_staging_app`.)
5. **Dump Neon main → restore into Cloud SQL `medusa`** (PG17 client, VPC context; **record timing**). `[OWED-DANIEL]`
   ```bash
   NEON_MAIN_DSN='postgres://…@…neon.tech/main?sslmode=require'        # Neon main (read-only now)
   CLOUDSQL_PROD_DSN="postgres://medusa_app:${PROD_PW}@${PRIVATE_IP}:5432/medusa?sslmode=disable"
   time pg_dump  --format=custom --no-owner --no-privileges "$NEON_MAIN_DSN" -f /tmp/main.dump
   time pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$CLOUDSQL_PROD_DSN" /tmp/main.dump
   ```
   → `/tmp/main.dump` written; restore completes without error. **Spot-check money-adjacent row counts match Neon:**
   ```sql
   SELECT (SELECT count(*) FROM "order") AS orders, (SELECT count(*) FROM payment) AS payments;
   ```
   run against both DSNs → identical counts. Note both elapsed times (the 43 MB DB restores in seconds).

### C · Repoint prod + redeploy
6. **Add the Cloud SQL prod DSN as a new `DATABASE_URL` version** (becomes `:latest`). `[OWED-DANIEL]`
   ```bash
   printf '%s' "$CLOUDSQL_PROD_DSN" | gcloud secrets versions add DATABASE_URL --data-file=- "${P[@]}"
   gcloud secrets versions access latest --secret=DATABASE_URL "${P[@]}" >/dev/null && echo "latest OK (Cloud SQL)"
   ```
   → a new enabled version is the highest number; `access latest` succeeds (the v2-destroyed block is healed).
7. **Redeploy `medusa-web` — surgical update.** `[OWED-DANIEL]`
   ```bash
   gcloud run services update medusa-web --region="$REGION" \
     --update-secrets=DATABASE_URL=DATABASE_URL:latest "${P[@]}"
   gcloud run services describe medusa-web --region="$REGION" --format='value(status.latestReadyRevisionName)'
   ```
   → a **new** `latestReadyRevisionName` (advanced from the pre-cutover one) that is **Ready/serving**
   (`:latest` re-resolves per revision, so the new revision binds the Cloud SQL DSN). Secret *values* aren't
   readable from `describe` — the functional proof the new version took is step 8's catalog read returning the
   **restored** data, which only exists on Cloud SQL.

### D · Verify + reopen
8. **Verify the cutover.**
   - `/health` → **200**: `curl -s -o /dev/null -w '%{http_code}\n' https://api.miyagisanchez.com/health`. `[OWED-DANIEL — VPC/prod]`
   - **Migrations are a no-op** (schema already current from the restore), from a VPC/connector context:
     `npx medusa db:migrate` → "No migrations to run" / no schema changes. `[OWED-DANIEL]`
   - **Catalog read** *(agent-runnable)* — proves real data round-trips from Cloud SQL:
     `curl -s "https://api.miyagisanchez.com/store/products?limit=1" -H "x-publishable-api-key: <prod pak>" | head -c 200`
     → a JSON product payload (not an error).
   - **Test checkout** end-to-end on a **disposable/test shop** completes (cart → pay → order); clean up after. `[OWED-DANIEL — money path]`
9. **Flip the kill-switch back ON.** `[OWED-DANIEL]` Flagsmith `checkout.stripe_enabled` → **ON**; confirm a real
   checkout path works. **Window closed.**
10. **Success signal** *(agent-runnable)* — `node scripts/neon-egress.mjs` → Neon egress flat-lines toward
    **zero** over the following hours/days (no GCP compute points at Neon anymore). This is the epic's win signal.

### Rollback (instant revert — keep Neon read-only ~1 week as the net)
The `DATABASE_URL` swap-back is the revert; because `:latest` = highest version **number** (not highest
*enabled*), you re-add the Neon DSN as a fresh newest version rather than re-enabling an old one:
```bash
# 1. Neon DSN (currently the lowest enabled version, e.g. v1) becomes the new latest:
gcloud secrets versions access 1 --secret=DATABASE_URL "${P[@]}" \
  | gcloud secrets versions add DATABASE_URL --data-file=- "${P[@]}"
# 2. Re-bind + new revision:
gcloud run services update medusa-web --region="$REGION" \
  --update-secrets=DATABASE_URL=DATABASE_URL:latest "${P[@]}"
# 3. Re-enable writes on Neon:
#    ALTER ROLE <neon_app_role> SET default_transaction_read_only = off;
# 4. Re-open checkout: Flagsmith checkout.stripe_enabled → ON (if it was rolled back mid-window).
```
→ prod serves on Neon again within one revision roll. Keep Neon **read-only ~1 week** after a *successful*
cutover too — it's the safety net until the Cloud SQL run is trusted; demote/delete it in S3.

### Result
After step 9, prod `medusa-web` runs entirely on **Cloud SQL** (private IP, intra-VPC) at `min=1` (warm), the
egress meter (step 10) trends to zero, and Neon is a read-only rollback for ~1 week. **No money data is lost**
(Neon was read-only from step 2; the dump is its final consistent state). S3 closes #19/#32, reconciles backups
to Cloud SQL-native, demotes Neon, and runs the epic DoD.
