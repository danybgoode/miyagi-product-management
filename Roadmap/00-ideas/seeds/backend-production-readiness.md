---
title: "Backend Production Readiness — audit + hardening"
slug: backend-production-readiness
status: in-progress                 # raw | ready | queued | scaffolded | in-progress | shipped | archived — all 5 sprints BUILT 2026-06-12; → shipped on S4 PR merge + prod monitoring provision (owed Daniel)
area: "09"                          # 09-platform-infra (engineering-facing, no product-poster line)
type: epic                          # audit spike (Sprint 0) → hardening sprints
priority: null
risk: high                          # touches shared infra / secrets / prod Cloud Run + DB
epic: "09-platform-infra/backend-production-readiness"   # scaffolded 2026-06-10
build_order: null                   # new ask; the original #1–#7 batch is fully groomed
updated: 2026-06-12
---

# Backend Production Readiness — scope (Definition of Ready)

> Groomed via the `groom` skill (Cowork). **Planning only — this doc is the gate; nothing scaffolds
> until Daniel approves it.** es-MX is N/A (no user-facing copy — internal ops/infra only).

## Mirror (the ask in one line)
Audit the **Medusa backend's** production readiness end-to-end, and as part of it stand up a real
**staging** environment for the backend (none exists today), with verified **backups** and a documented
**graceful-recovery / rollback** posture — so we can test changes before prod and survive a bad deploy or
data loss.

## Classification
**Chore / infra epic** under `09-platform-infra` — no buyer/seller/agent-facing change. Opens with an
**audit spike (Sprint 0)** whose deliverable is a *written* findings doc + prioritized gap list + the
one load-bearing **staging-platform decision**. Per the spike path, the hardening sprints below are
**provisional** — the spike confirms/refines them before any build. **HIGH-risk by default** (shared
infra, secrets, prod Cloud Run + DB / money-adjacent) → Daniel authorizes and merges.

## Decisions locked with Daniel (2026-06-10)
1. **Staging platform — decide inside the spike.** Daniel's brain-dump suggested **Render** ("free tier
   should be fine"), but two facts (below) make that the wrong default. Rather than pre-commit, **Sprint 0's
   first deliverable is the written platform decision with trade-offs**, then we build it.
2. **Audit depth — full prod-readiness**, not just the three named items. Six dimensions (below).
3. **Shape — audit-first.** Sprint 0 (spike, no code) lands the findings; Daniel approves them; *then* the
   hardening sprints are finalized and built.
4. **Staging is backend-only.** The frontend already has Vercel per-branch previews; point a preview at the
   staging backend when needed. No persistent frontend staging env in v1.

## Stage 2.5 — orientation (can we already do this?)
- **Backend staging does NOT exist** (the real gap). Frontend gets a Vercel preview per branch; the backend
  has a *single* Cloud Run service `medusa-web` (us-east4, project `miyagisanchezback-497722`) auto-deployed
  by the `backend-main-deploy` Cloud Build trigger on push to `main` — **no preview, ~12 min, straight to prod.**
- **Graceful recovery is partially present:** `git revert` on `main` is the documented rollback and Cloud Run
  retains prior revisions — so revision-rollback is *possible today*. What's missing is a **written runbook**,
  health-check/restart posture, a **migration-rollback** strategy, and a **tested restore drill**.
- **Deploy-event observability is already groomed** (do not rebuild it): the `cicd-telegram-notifications`
  epic (📋 Planned, not shipped) funnels push + deploy-finish ✅/❌ for both repos into a Telegram channel.
  The audit's monitoring dimension **references/extends** that epic for deploy events and focuses its *new*
  scope on uptime, error tracking, and resource alerting (which that epic does not cover).

### The two facts that make Render the wrong default (research-cited)
- **You already left Render.** `LEARNINGS.md` ("Render is not the active backend deploy rail… ignore it")
  and `infra/gcp/README.md` ("decommission Render") both record the move to Cloud Build → Cloud Run.
- **Render free can't mirror prod, which defeats the purpose of staging.** Prod runs on Cloud Run with a
  **VPC connector to Memorystore Redis** + a **Neon pooled Postgres** + Secret Manager. Render free tier
  spins down after 15 min (~1 min cold start), has an **ephemeral filesystem**, and its **free Postgres
  self-deletes 30 days after creation** ([Render free docs](https://render.com/docs/free)) — so staging
  would diverge from prod and rot. The parity-correct, lighter path is a **second Cloud Run service
  (`medusa-web-staging`)** off a staging-branch trigger (reusing `cloudbuild.yaml` + `deploy.sh`), backed
  by a near-free **Neon DB branch** (instant copy-on-write, ~$0 idle — [Neon plans/branching](https://neon.com/docs/introduction/plans)).
  **Recommendation to carry into the spike: Cloud Run staging + Neon branch, not Render.** The spike validates
  cost + effort and records the decision.

## Medusa-first / reuse list — what already exists (reuse, don't rebuild)
- **`apps/backend/cloudbuild.yaml`** — `build → push → deploy` (substitutions `$SHORT_SHA` / `$_REGION` /
  `$_SERVICE`); a staging trigger parameterizes `_SERVICE=medusa-web-staging` on a staging branch.
- **`apps/backend/infra/gcp/deploy.sh`** — the canonical env/secret/SA/VPC/scaling wiring (Cloud Run
  preserves these across image-only deploys); the staging service is a parameterized re-run with staging
  secrets + CORS.
- **`infra/gcp/provision.sh` / `cicd-setup.sh`** — APIs, Artifact Registry, Memorystore, VPC connector, SA,
  secret shells, trigger creation — the staging stand-up mirrors this, scoped to staging resources.
- **Neon** is already the Postgres host (pooled endpoint) — staging is a **branch**, not a new database.
- **`cicd-telegram-notifications` epic** — deploy-event notifications (reuse for the deploy half of monitoring).
- **`lib/ratelimit.ts` (Upstash)** + **Flagsmith kill-switch layer** (`lib/flags.ts`, fail-open) — existing
  resilience primitives the audit assesses rather than rebuilds.
- **`tasks/gcp-migration.md`** — the original migration runbook; the recovery runbook extends this lineage.

**AGENTS five rules:** #1 Medusa / #2 Supabase / #3 UCP-MCP / #4 Clerk — **untouched** (infra only, no
commerce/data-model/auth change). #5 es-MX — N/A (no user-facing copy; ops text only).

## The six audit dimensions (Sprint 0 works through each → findings + gaps)
1. **Staging environment** — platform decision (Cloud Run + Neon branch vs Render); branch + trigger wiring;
   staging secrets/CORS/webhook endpoints; data-seeding strategy; cost estimate.
2. **Backups & data durability** — Neon PITR / restore window **+ a tested restore drill**; Supabase backups
   (conversations / offers / supply); R2 buckets (images + private digital goods) durability/versioning;
   **Secret Manager** export/rotation (secrets are the keys to everything).
3. **Graceful recovery / rollback** — Cloud Run revision-rollback runbook; `git revert` documented;
   **startup/liveness health checks** + restart behavior; **Medusa migration-rollback** strategy (migrations
   are forward-only — call out the risk); webhook idempotency on redelivery.
4. **Monitoring / alerting / observability** — **uptime** monitoring (is prod down?); **error tracking**
   (e.g. Sentry — present or not); Cloud Run alert policies (5xx rate, p95 latency, memory, instance
   saturation); log retention. Deploy events = reuse/ship `cicd-telegram-notifications`.
5. **Security / secrets posture** — secret rotation (`JWT_SECRET`/`COOKIE_SECRET` — the deploy README flags
   "do not reuse supersecret"); least-privilege runtime SA; CORS correctness; backend rate-limiting; the
   **Medusa admin exposure** (`deploy.sh` notes admin is disabled in prod — confirm) ; dependency/CVE posture.
6. **Scaling / capacity** — Cloud Run `min=1/max=4, cpu=1, mem=1Gi, shared` worker mode; Neon pooled
   connection ceiling; Memorystore sizing; known load ceilings; the server/worker-split trigger
   ("split only when traffic warrants").

## In scope (v1)
- **Sprint 0 (the gate):** a written audit (`tasks/` or epic-local) covering all six dimensions, a
  **prioritized gap list** (severity × effort), and the **staging-platform decision**.
- **Hardening sprints (provisional — finalized by the spike):** stand up backend staging; verify + drill
  backups and write the restore runbook; write the recovery/rollback runbook + add health checks + a
  migration-rollback posture; add uptime + error-tracking + Cloud Run alert policies (and ship/extend the
  deploy-notification epic).

## Out of scope (v1)
- Persistent **frontend** staging environment (Vercel previews suffice; backend-only per decision 4).
- **Render** as the staging platform unless the spike overturns the recommendation.
- Re-architecting prod (server/worker split, region change, multi-region HA) — assessed, not executed,
  unless the spike flags a severity-1 gap.
- Any commerce / Medusa-module / Supabase-schema / Clerk-auth change.
- Building net-new deploy-event notifications (owned by `cicd-telegram-notifications`).

## Slices (skateboard → car)

### Sprint 0 — Production-readiness audit (SPIKE · no code · risk LOW) ← the gate
- **Deliverable:** a written findings doc (the six dimensions), a **prioritized gap list**, and the
  **staging-platform decision** (Cloud Run + Neon branch vs Render, with cost + effort + parity trade-offs).
- **No branch, no build.** Output is a decision + the finalized hardening-sprint slices, which Daniel approves
  before any infra change.
- *QA / "smoke":* the findings doc is reviewed by Daniel; each claimed current-state fact is verified against
  the live setup (gcloud / Neon / repo) by the agent where it has read access.

> **Sprints S1–S4 below are the candidate hardening slices the spike will confirm or reshape.** Listed so
> Daniel sees the likely shape; **not signed-off scope until Sprint 0 lands.**

### Sprint 1 (candidate) — Backend staging environment · risk HIGH (Daniel authorizes)
- **US (candidate)** As a builder, I want a `medusa-web-staging` Cloud Run service on a Neon DB branch,
  deployed by a staging-branch trigger, so I can exercise backend changes against a prod-parity environment
  before merging to `main`. *Acceptance:* a staging URL serves a healthy Medusa; staging uses isolated
  secrets + DB branch; a push to the staging branch deploys only staging.

### Sprint 2 (candidate) — Backups verified + restore drill · risk HIGH
- **US (candidate)** As the owner, I want a **tested** restore path for Neon (+ Supabase, R2, Secret Manager
  posture documented), so a data-loss event is recoverable, not theoretical. *Acceptance:* a restore drill is
  executed (against the staging branch, not prod) and the steps + RPO/RTO are written into a runbook.

### Sprint 3 (candidate) — Graceful recovery & health · risk HIGH
- **US (candidate)** As the owner, I want a documented rollback runbook (Cloud Run revision + `git revert`),
  startup/liveness health checks, and a migration-rollback posture, so a bad deploy is reversible in minutes.
  *Acceptance:* the runbook exists and a rollback is rehearsed on staging; health checks are live on the
  service.

### Sprint 4 (candidate) — Monitoring & alerting · risk LOW–MED
- **US (candidate)** As the owner, I want to be alerted when prod is down, erroring, or saturated, so I find
  out before users do. *Acceptance:* uptime check + error tracking + Cloud Run alert policies fire to a
  channel; deploy events covered by shipping/extending `cicd-telegram-notifications`.

## Deploy order
Sprint 0 (spike) first — it's the gate. Then **S1 → S2/S3 (can parallel) → S4**, each independently
shippable. The whole epic is **HIGH-risk** (infra / secrets / prod) → Daniel authorizes each step;
destructive prod ops (DNS, mass deletes, prod-DB writes) get explicit in-conversation authorization per
the auto-mode guardrail in LEARNINGS.

## QA / smoke posture (stated honestly)
Infra work is **largely not Playwright-testable** — there is no deterministic browser/api gate for "staging
exists" or "a restore works." Verification is **runbook execution**: the agent does CLI/API-level probes
where it holds `gcloud`/Neon/Vercel access; the live confirmations (hitting the staging URL, executing a
restore drill, forcing a rollback, tripping an alert) are **owed to Daniel**, who holds the prod creds. Each
sprint names its concrete real-world check; the spike's "gate" is Daniel's review of the findings doc.

## Open risks / notes
- **Migrations are forward-only** in Medusa — the migration-rollback story is a *posture/runbook*, not a
  one-click revert; surface this in Sprint 0.
- **Secrets are the crown jewels.** A staging service needs its *own* secrets (never prod's); rotation of
  `JWT_SECRET`/`COOKIE_SECRET` is itself a flagged gap.
- **Cost.** Cloud Run staging at `min-instances=0` + a Neon branch is near-free idle; confirm the numbers in
  the spike so "free tier should be fine" is answered with real figures.
- **Don't let staging consume the prod Neon connection budget** — the branch isolates this, but verify the
  pooled-endpoint limits in dimension 6.

## Definition of Ready — checklist
- [x] "As a / I want / so that" per (candidate) story; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (staging = genuinely-new infra; recovery = partial-today + light enhancement).
- [x] v1 in/out boundary written (Render & frontend-staging out unless spike overturns).
- [x] Reuse list produced (cloudbuild/deploy.sh/provision/Neon-branch/cicd-telegram epic).
- [x] Each (candidate) story risk-tiered; QA posture named; smoke owner = Daniel.
- [x] Research cited (Render free-tier limits; Neon branching) — staging recommendation grounded.
- [ ] **Daniel approves this scope doc** ← the gate.
