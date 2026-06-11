# Backend Production Readiness — Audit Findings (Sprint 0 spike)

> **Epic:** `Roadmap/09-platform-infra/backend-production-readiness` · **Sprint 0** (audit spike, no code).
> **Status:** ✅ findings landed — awaiting Daniel's review (the gate before S1–S4 build).
> **Author:** Claude · **Date:** 2026-06-11 · **Project probed:** `miyagisanchezback-497722` (us-east4),
> identity `leroytramafat@gmail.com` (`bonsai-profile`).

This is the deliverable for the spike: per-dimension **current state vs gap**, a **prioritized gap list**
(severity × effort), the **staging-platform decision** with real numbers, and the **confirmed/reshaped
S1–S4 slices**. Every current-state fact below is tagged **[verified]** (live probe this session),
**[code]** (read from the repo), or **[unverified — owed]** (needs an access I don't hold — Neon/Cloudflare
console — and is called out honestly rather than assumed).

---

## How verification was done
Live read-only probes via `gcloud` (Cloud Run, Cloud Build, Secret Manager, Monitoring, IAM, Redis, VPC),
`curl` against `https://api.miyagisanchez.com`, the Supabase MCP, and repo reads of
`apps/backend/{cloudbuild.yaml,medusa-config.ts,src/**}` + `infra/gcp/*`. Secret **values** were deliberately
**not** dumped (the auto-mode classifier correctly blocked reading `DATABASE_URL`; the audit needs posture,
not credentials).

---

## Dimension 1 — Staging environment

**Current state**
- **No staging exists.** [verified] Cloud Run in us-east4 hosts exactly three services: `medusa-web`
  (the backend), `cicd-telegram-build-notifier`, `print-pdf`. There is no `medusa-web-staging`.
- **One deploy path, straight to prod.** [verified] A single Cloud Build trigger `backend-main-deploy`
  (2nd-gen GitHub, repo `danybgoode-medusa-bonsai-backend`, branch `^main$`, SA `medusa-cicd`,
  `cloudbuild.yaml`) builds + deploys `medusa-web` on every push to `main`. No staging trigger, no preview.
- **The reuse primitives are all present.** [code] `cloudbuild.yaml` is parameterized
  (`_SERVICE`/`_REGION`/`_AR_REPO`); `infra/gcp/deploy.sh` is the canonical env/secret/VPC/SA/scaling wiring;
  `provision.sh`/`cicd-setup.sh` create the resource shells + trigger. A staging env is a parameterized
  re-run, not new architecture.

**Gap**
- Every backend change is rehearsed only in prod (~12 min, no preview). No environment to exercise a
  migration, a payment-provider change, or a dependency bump against prod-like data before `main`.

**Recommendation** → build `medusa-web-staging` (see **Staging-platform decision** below). Confirms candidate **S1**.

---

## Dimension 2 — Backups & data durability

**Current state**
- **Neon (Medusa Postgres — commerce system of record).** [code] `DATABASE_URL` is a Neon pooled endpoint
  (host carries `-pooler`). [unverified — owed] Plan tier + PITR/restore-window length are **not confirmable
  from my access** (no Neon API/CLI token; the connection string is correctly access-blocked). Neon provides
  PITR within a plan-dependent history-retention window, but the **actual window and whether a restore has
  ever been executed are unknown** → Daniel verifies in the Neon console.
- **Supabase (non-commerce: conversations/offers/favorites/supply staging/UCP identities).** [verified]
  Project `bonsaiClerk` (`xljxqymsuyhlnorfrnno`, us-west-2, Postgres 17), org plan = **`free`**. The Supabase
  **Free plan has no daily backups and no PITR.** This data (buyer↔seller conversations, offer/negotiation
  state, favorites, supply batches) is **currently unrecoverable** if the project is lost or corrupted.
- **R2 (images bucket + private digital-goods bucket).** [code] Two buckets via `lib/r2.ts` / `R2_DIGITAL_*`.
  [unverified — owed] Bucket versioning / lifecycle / durability config is **not confirmable from my access**
  (no Cloudflare/wrangler token) → Daniel verifies in the Cloudflare dashboard.
- **Secret Manager.** [verified] 16 secrets present. No documented export/escrow or rotation procedure.

**Gap**
- **Supabase free-plan = zero backups** is the sharpest durability gap — real marketplace data with no
  recovery path. Severity-high.
- Neon PITR window + R2 versioning are **unknown, not confirmed-good** — they must be *verified*, then a
  **restore must actually be drilled** (a restore that's never been run is a theory).
- No Secret Manager export/escrow: losing the project = losing the keys to Stripe/MP/Clerk/DB at once.

**Recommendation** → confirms candidate **S2**, but **reshape it** to make the Supabase backup gap a
first-class item (not a footnote) and to gate the drill on first verifying the Neon/R2 facts. See gap list.

---

## Dimension 3 — Graceful recovery / rollback

**Current state**
- **Revision rollback is possible today.** [verified] `medusa-web` retains prior revisions
  (`…00090`–`00099` live); traffic can be repinned to a known-good revision in seconds. No documented runbook.
- **`git revert` on `main`** is the documented code rollback (AGENTS / WAYS-OF-WORKING) — but a revert still
  takes a full ~12-min rebuild, whereas a **revision repin is the fast path** and isn't written down.
- **Health checks are weak.** [verified] Medusa exposes `GET /health` → `200 OK` (live), but the Cloud Run
  **startup probe is a bare TCP socket on :8080** (`failureThreshold:1`, `period/timeout:240s`) and **there is
  no liveness probe.** A TCP-open port ≠ Medusa ready, so traffic can be sent to a still-booting or wedged
  instance. This is a free, high-value fix: point the startup probe at HTTP `/health` + add a liveness probe.
- **Migration rollback.** [code] Medusa migrations are **forward-only** — there is no down-migration. Recovery
  from a bad migration = restore the DB (→ depends on Dimension 2 being real) or ship a compensating forward
  migration. Posture/runbook only; flag the risk.
- **Webhook idempotency / redelivery.** [code] `src/subscribers/coupon-usage.ts` exists; the real safety net
  is the **`reconcile-checkouts` scheduled job (every 15 min)** that re-syncs orders a missed Stripe webhook
  would have dropped — solid existing resilience.

**Gap**
- No written rollback runbook (revision repin + `git revert` + when to use which).
- Startup probe doesn't prove readiness; no liveness probe.
- No migration-rollback posture documented.

**Recommendation** → confirms candidate **S3**; add the **probe upgrade** as a concrete deliverable.

---

## Dimension 4 — Monitoring / alerting / observability

**Current state**
- **No uptime check. No alert policies.** [verified] `gcloud monitoring uptime list-configs` → empty;
  `gcloud alpha monitoring policies list` → empty. Nothing watches whether prod is up, erroring, or saturated.
- **A notification channel already exists but is unused.** [verified] One channel `MiyagiDevopsTele`
  (`webhook_tokenauth`, enabled) — no policy references it. The wiring for "alert → Telegram" is half-built.
- **Deploy-event notifications are LIVE — not "not shipped".** [verified] `cicd-telegram-build-notifier` is a
  **deployed Cloud Run service**, and secrets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CICD_CHAT_ID` exist. The seed
  described the `cicd-telegram-notifications` epic as 📋 not-shipped — **that's stale; the deploy-notify half
  is already running.** S4 should *verify/extend* it, not rebuild it.
- **No error tracking.** [code] No Sentry/Bugsnag/Rollbar/Datadog in `apps/backend/package.json`. Errors live
  only in Cloud Run logs (no aggregation, no alerting, no release/issue grouping).
- **Log retention.** [verified] `_Default` 30 days, `_Required` 400 days (locked) — standard, adequate.

**Gap**
- Zero proactive alerting: a 5xx spike, an OOM, instance saturation, or a full outage is invisible until a
  user reports it. Highest-severity operational gap after the Supabase backup gap.
- No error tracking → no signal on exceptions that don't crash the process.

**Recommendation** → confirms candidate **S4**, **reshaped**: the deploy-notify piece is done, so S4 = uptime
check + Cloud Run alert policies (5xx, p95 latency, memory, instance count) wired to the **existing**
`MiyagiDevopsTele` channel + add error tracking (Sentry).

---

## Dimension 5 — Security / secrets posture

**Current state**
- **`JWT_SECRET` / `COOKIE_SECRET` never rotated.** [verified] Each has a **single version, created
  2026-05-28** (GCP-migration day). The deploy README explicitly flags "ROTATE — do not reuse supersecret";
  rotation has not happened since and there's no cadence. (Values not read — recommend rotation on principle,
  not because they're proven weak.)
- **Least-privilege runtime SA — good.** [verified] `medusa-run@` holds **no project-level roles**; it has
  only per-secret `secretAccessor` bindings (granted in `provision.sh`). Clean.
- **CI/CD SA scoped appropriately.** [verified] `medusa-cicd@` = `run.admin` + `artifactregistry.writer` +
  `logging.logWriter`.
- **Medusa admin is EXPOSED in prod.** [verified] `GET /app` → `200`. [code] `medusa-config.ts` enables the
  admin unless `DISABLE_MEDUSA_ADMIN==='true'` (unset), with a comment that this was intentional once Cloud
  Run gave headroom. The seed asked to "confirm admin disabled" — **it is NOT disabled.** Login is gated
  (`POST /auth/user/emailpass` → `401`), so this is an *intentional posture*, not an open door — but it
  widens the auth surface and should be a **conscious decision** (keep + harden, or disable + use a bastion).
- **CORS** [verified] STORE/AUTH scoped to `miyagisanchez.com`/`www`; **ADMIN_CORS carries an extra trailing
  origin** (truncated in probe output) — worth a glance to confirm it's only intended origins.
- **Cloud Run invoker = `allUsers`** [verified] — correct (public storefront/agent API).
- **Backend rate-limiting.** [code] Upstash rate-limiting lives in the **frontend** (`lib/ratelimit.ts`);
  the backend relies on Cloud Run + the frontend gate + `MEDUSA_INTERNAL_SECRET` on `/internal/*`. No
  app-level limiter on the backend itself.
- **CVE/dependency posture.** No automated dependency/image scanning (no Dependabot/Trivy in the pipeline).

**Gap**
- Unrotated long-lived secrets + no rotation cadence.
- Admin-exposure is undecided-by-default rather than chosen.
- No dependency/CVE scanning.

**Recommendation** → these don't have a clean home in the candidate S1–S4. **Fold them in:** secret rotation
→ **S1** (standing up staging forces generating fresh isolated secrets anyway — do prod rotation in the same
motion and document the procedure); admin-exposure decision + CORS glance → **S3** (hardening); CVE scanning
→ **S4** (observability). See reshaped slices.

---

## Dimension 6 — Scaling / capacity

**Current state** [verified unless noted]
- **Cloud Run `medusa-web`:** `minScale=1`, `maxScale=4`, `cpu=1`, `memory=1Gi`, `containerConcurrency=80`,
  `timeoutSeconds=300`, `startup-cpu-boost=on`, **worker mode `shared`** (one service runs web + scheduled
  jobs).
- **VPC connector `medusa-conn`:** READY, `e2-micro`, min 2 / max 10 instances.
- **Memorystore `medusa-redis`:** **BASIC tier (single node, no HA)**, 1 GB, **persistence DISABLED**,
  `maxmemory-policy=noeviction`. Medusa uses it as cache + event bus + workflow engine + locking. A Redis
  failure loses in-flight jobs — but the `reconcile-checkouts` job recovers missed checkouts, softening it.
- **Scheduled jobs** [code]: `reconcile-checkouts` (every 15 min) + `sweepstakes-draw` (every **minute**),
  both running in-process in shared mode; the `locking-redis` module guards against duplicate execution if
  instances scale.
- **Neon pooled connection ceiling** [unverified — owed]: the pooled endpoint's max connections vs. Cloud Run
  fan-out (up to 4 instances) isn't confirmed → verify in Neon console; staging on a **branch** keeps staging
  off the prod connection budget.

**Gap**
- Memorystore is a single-node SPOF with no persistence (acceptable for a job queue at current scale; flag for
  the HA-when-traffic-warrants trigger).
- Neon connection ceiling unverified.
- `shared` worker mode is fine now; the server/worker split is a documented "only when traffic warrants" lever
  — assessed, not actioned.

**Recommendation** → no immediate scaling work; **assessed, not executed** (matches the seed's out-of-scope).
Capture the SPOF + connection-ceiling facts in the runbook.

---

## Prioritized gap list (severity × effort)

Severity: **S1 critical** (data loss / silent outage) · **S2 high** · **S3 medium** · **S4 low**.
Effort: **E1** ≲ half-day · **E2** ~1 day · **E3** multi-day.

| # | Gap | Sev | Effort | Lands in |
|---|-----|-----|--------|----------|
| 1 | **Supabase free-plan = no backups** for conversations/offers/favorites/supply | S1 | E1 (upgrade plan) / E2 (drill) | **S2** |
| 2 | **No uptime check + no alert policies** — outages/5xx/OOM invisible | S1 | E2 | **S4** |
| 3 | **Neon PITR window unverified + restore never drilled** | S1 | E2 (verify+drill) | **S2** |
| 4 | **No staging** — every change rehearsed in prod | S2 | E2 | **S1** |
| 5 | **Startup probe is TCP-only, no liveness probe** (`/health` exists, unused) | S2 | E1 | **S3** |
| 6 | **No rollback runbook** (revision repin vs `git revert`) | S2 | E1 | **S3** |
| 7 | **No error tracking** (no Sentry) on the backend | S2 | E1 | **S4** |
| 8 | **JWT/COOKIE never rotated**, no rotation cadence | S2 | E1 | **S1** |
| 9 | **R2 bucket versioning unverified** | S3 | E1 | **S2** |
| 10 | **Migration-rollback posture undocumented** (forward-only risk) | S3 | E1 | **S3** |
| 11 | **Medusa admin exposed in prod by default** — decide keep+harden vs disable | S3 | E1 | **S3** |
| 12 | **No Secret Manager export/escrow** | S3 | E1 | **S2** |
| 13 | **No dependency/CVE scanning** in the pipeline | S3 | E1 | **S4** |
| 14 | **ADMIN_CORS extra origin** — confirm intended | S4 | E1 | **S3** |
| 15 | **Memorystore SPOF / no persistence; Neon conn ceiling unverified** | S4 | — | runbook note (assess-only) |

**Build order by impact:** the two **S1-critical** clusters are *backups* (#1, #3) and *alerting* (#2) — both
land in S2/S4 and are cheap. *Staging* (#4) is the structural enabler for safely doing everything else. The
probe + runbook + rotation items are all E1 riders on the sprints they sit in.

---

## Staging-platform decision — **Cloud Run `medusa-web-staging` + Neon branch** (recommended)

**The call: build a second Cloud Run service off a `staging` branch trigger, backed by a Neon DB branch, with
its own isolated secrets. Reject Render.** Real trade-offs:

| | **Cloud Run staging + Neon branch** (recommend) | **Render free** (brain-dump suggestion) |
|---|---|---|
| **Parity with prod** | Same runtime, same image, same Neon Postgres engine, same Secret Manager pattern — **true parity** | Different runtime; ephemeral FS; no VPC/Memorystore; **diverges from prod** |
| **Idle cost** | **~$0** — `min-instances=0` scales to zero; Neon branch is copy-on-write, ~$0 idle | $0 — but spins down after 15 min → ~1 min cold start |
| **Data** | Neon **branch** = instant copy-of-prod-schema, isolated, off the prod connection budget | Free Postgres **self-deletes 30 days after creation** → staging rots |
| **Redis** | Optional: start with **no Redis** (Medusa falls back to in-memory cache/event-bus/workflow — fine for staging); add a Memorystore DB-index only if job-queue parity is needed | None |
| **Effort** | **~1 day** — reuse `cloudbuild.yaml` (`_SERVICE=medusa-web-staging`) + `deploy.sh` (staging secrets/CORS) + a `staging`-branch trigger + a Neon branch | Lower wiring effort, but you've **already left Render** (LEARNINGS + infra README: "decommission Render") |
| **Secrets** | ~10 **isolated** staging secret shells (Stripe **test** keys, fresh JWT/COOKIE, staging CORS) — never prod's | Same isolation work needed, less tooling |

**Cost estimate (realistic): < $5/month.** Cloud Run staging at `min=0` is ~$0 idle (pay-per-request on the
occasional smoke); the Neon branch is ~$0 idle within plan. The **only** way it climbs is adding a *dedicated*
staging Memorystore (~$35/mo for a BASIC 1 GB node) — which the recommendation **defers** by starting
Redis-less. So "free tier should be fine" is answered: **the parity-correct path is also near-free**, without
Render's divergence and rot.

**Why not Render (the two facts from the seed, now confirmed against the live setup):** (1) prod is Cloud Run
+ VPC→Memorystore + Neon pooled + Secret Manager — Render free can't mirror any of that; (2) the codebase
already migrated off Render and the infra README literally says "decommission Render." Render staging would be
a second, lower-fidelity world to maintain.

**One caveat to decide in S1:** the Stripe/MP **webhook** endpoints — staging needs its own webhook secrets
and either test-mode keys or a clear "no real money" boundary. Scope that into the S1 acceptance.

---

## Confirmed / reshaped hardening slices (S1–S4) — for Daniel's approval

All four candidates **survive** the audit. Reshapes fold the homeless Dimension-5 security items into the
nearest sprint and correct two stale assumptions (deploy-notify already shipped; Supabase has *no* backups).

### S1 — Backend staging environment · HIGH (Daniel authorizes + merges)
`medusa-web-staging` Cloud Run (min=0) on a **Neon DB branch**, deployed by a `staging`-branch trigger,
reusing `cloudbuild.yaml` + `deploy.sh` with **isolated** staging secrets + CORS + webhook endpoints; Redis
starts **off** (in-memory fallback), documented as a parity trade-off. **+ Rotate prod `JWT_SECRET` /
`COOKIE_SECRET`** in the same motion and document the rotation procedure (gap #8).
*Acceptance:* a staging URL serves a healthy Medusa (`/health` 200); staging uses its own DB branch + secrets;
a push to `staging` deploys only staging; prod secrets rotated.

### S2 — Backups verified + restore drill · HIGH
**First verify** the unverified facts (Neon PITR window, R2 versioning) with Daniel; **then** execute a real
Neon **restore drill against the staging branch** (never prod) and write RPO/RTO into a runbook. **Close the
Supabase backup gap** (gap #1 — the sharpest): upgrade the plan or stand up a scheduled `pg_dump` export.
Document **Secret Manager export/escrow** (gap #12).
*Acceptance:* a restore was actually executed on staging with steps + RPO/RTO recorded; Supabase has a backup
mechanism; R2 + Neon facts confirmed; secret-escrow procedure written.

### S3 — Graceful recovery & health + hardening · HIGH
Rollback **runbook** (revision repin as the fast path + `git revert` + when to use which); **upgrade the
health probe** (startup probe → HTTP `/health`, add a liveness probe — gap #5); document the **forward-only
migration-rollback** posture (gap #10). **+ Security riders:** make the **admin-exposure** an explicit
decision (keep+harden vs disable — gap #11) and confirm **ADMIN_CORS** origins (gap #14).
*Acceptance:* runbook exists + a rollback rehearsed on staging; probes use `/health` and a liveness check;
migration posture written; admin-exposure decision recorded.

### S4 — Monitoring & alerting · LOW–MED
**Note: deploy-event notifications already ship** (`cicd-telegram-build-notifier` is live) — verify/extend,
don't rebuild. **New work:** an **uptime check** on `/health`; **Cloud Run alert policies** (5xx rate, p95
latency, memory, instance saturation) wired to the **existing** `MiyagiDevopsTele` channel; **error tracking**
(Sentry on the backend — gap #7); add **dependency/CVE scanning** to the pipeline (gap #13).
*Acceptance:* taking the service down trips the uptime/alert → Telegram; backend exceptions surface in Sentry;
deploy events confirmed flowing; CVE scan runs on build.

**Deploy order unchanged:** S1 → (S2 ∥ S3) → S4. Whole epic HIGH-risk; Daniel authorizes + merges each;
destructive prod ops get explicit in-conversation authorization (auto-mode guardrail). Drills/rehearsals run
on **staging, never prod**.

---

## Items explicitly owed to Daniel (I lack the access)
1. **Neon** console — confirm plan tier + PITR/restore-window length + pooled-connection ceiling (Dim 2, 6).
2. **Cloudflare R2** — confirm bucket versioning/lifecycle on the images + digital buckets (Dim 2).
3. The **JWT/COOKIE values** were not read (correctly blocked); rotation recommended on principle.

## The gate
Per the epic, **Sprint 0 is the gate**: this doc + the gap list + the staging decision are reviewed by Daniel.
His approval is what unlocks S1. Nothing infra changes until then.
