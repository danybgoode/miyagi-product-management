# Epic: Backend Production Readiness — audit + hardening

> **Area:** 09-platform-infra · **Risk:** HIGH (shared infra / secrets / prod Cloud Run + DB)
> **Scope seed:** [`00-ideas/seeds/backend-production-readiness.md`](../../00-ideas/seeds/backend-production-readiness.md) — APPROVED 2026-06-10
> **Class:** Chore / infra — no buyer/seller/agent-facing change. Audit-first.

## Why
The Medusa backend deploys **straight to prod** with no staging, no rehearsed rollback, and unverified
backups: the single Cloud Run service `medusa-web` (us-east4) is auto-deployed by the `backend-main-deploy`
trigger on every push to `main` (~12 min, no preview). This epic makes the backend safe to change and
survive failure — it **opens with a written audit (Sprint 0)** across six readiness dimensions, lands a
prioritized gap list + the **staging-platform decision**, and then hardens the gaps (staging env, verified
backups + restore drill, recovery/rollback runbook + health checks, monitoring/alerting). Pure infra; no
commerce code.

## Medusa-first note
N/A for commerce (no products/orders/payments/auth touched). The "build from existing primitives" rule
still applies to **infra**: staging reuses `cloudbuild.yaml` + `infra/gcp/deploy.sh`/`provision.sh`, the DB
is a **Neon branch** (not a new database), and deploy-event observability **reuses** the already-groomed
`cicd-telegram-notifications` epic rather than rebuilding it.

## What already exists (reuse, don't rebuild)
- **`apps/backend/cloudbuild.yaml`** — `build → push → deploy`; substitutions `$SHORT_SHA`/`$_REGION`/`$_SERVICE`. A staging trigger parameterizes `_SERVICE=medusa-web-staging` on a staging branch.
- **`apps/backend/infra/gcp/deploy.sh`** — canonical env/secret/SA/VPC/scaling wiring (Cloud Run preserves these across image-only deploys); staging = a parameterized re-run with **isolated** staging secrets + CORS.
- **`infra/gcp/provision.sh` / `cicd-setup.sh`** — APIs, Artifact Registry, Memorystore, VPC connector, SA, secret shells, trigger creation — mirror for staging resources.
- **Neon** — already the Postgres host (pooled endpoint); staging is an instant copy-on-write **branch**.
- **`cicd-telegram-notifications` epic** (📋, `09-platform-infra/`) — deploy push + finish ✅/❌ notifications; reuse for the deploy half of monitoring.
- **`lib/ratelimit.ts` (Upstash)** + **`lib/flags.ts` (Flagsmith, fail-open)** — existing resilience primitives the audit assesses, not rebuilds.
- **`tasks/gcp-migration.md`** — the migration runbook lineage the recovery runbook extends.

**AGENTS five rules:** #1 Medusa / #2 Supabase / #3 UCP-MCP / #4 Clerk — untouched (infra only). #5 es-MX — N/A (ops text, no user-facing copy).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| [S0](sprint-0.md) | **Audit spike (the gate)** — six-dimension findings + prioritized gap list + staging-platform decision. No code. | LOW |
| [S1](sprint-1.md) | *(candidate)* Backend staging environment — `medusa-web-staging` Cloud Run + Neon DB branch + staging-branch trigger | HIGH |
| [S2](sprint-2.md) | *(candidate)* Backups verified + executed restore drill + runbook (Neon · Supabase · R2 · Secret Manager) | HIGH |
| [S3](sprint-3.md) | *(candidate)* Graceful recovery — rollback runbook + health checks + migration-rollback posture | HIGH |
| [S4](sprint-4.md) | *(candidate)* Monitoring & alerting — uptime + error tracking + Cloud Run alert policies (+ ship/extend deploy-notify epic) | LOW–MED |

> **S1–S4 are candidate slices. They are finalized or reshaped by Sprint 0's findings before any build.**

## Deploy order
**S0 (spike) first — it is the gate.** Then **S1 → S2/S3 (may parallel) → S4**, each independently shippable.
The whole epic is **HIGH-risk** (infra / secrets / prod) — Daniel authorizes each step. Destructive prod ops
(DNS, mass deletes, prod-DB writes) get explicit in-conversation authorization per the auto-mode guardrail in
LEARNINGS. Restore drills + rollback rehearsals run **against staging, never prod**.

## QA / smoke posture (stated honestly)
Infra work is **largely not Playwright-testable** — there is no deterministic browser/api gate for "staging
exists" or "a restore works." Verification is **runbook execution**: the agent runs CLI/API probes where it
holds `gcloud`/Neon/Vercel access; the live confirmations (hit the staging URL, execute a restore drill,
force a rollback, trip an alert) are **owed to Daniel**, who holds prod creds. The spike's "gate" is Daniel's
review of the findings doc.

## Definition of Done (epic)
- [ ] Sprint 0 findings doc + gap list + staging decision written and **approved by Daniel**; S1–S4 finalized from it.
- [ ] All built sprints merged to `main` + smoke-confirmed by Daniel (gaps stated); the runbooks exist and were rehearsed on staging.
- [ ] Each `sprint-N.md` has its smoke walkthrough (real commands/URLs); status ticked with commit/infra refs.
- [ ] This README marked ✅; `RETROSPECTIVE.md` written.
- [ ] **Poster note:** infra epic — no `Roadmap/README.md` feature line; add a ✅ line to `09-platform-infra/README.md` instead.
- [ ] Team memory + `MEMORY.md` index updated (staging topology · backup RPO/RTO · rollback runbook · alert channels).
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append).
- [ ] Branches deleted; seed frontmatter `status: shipped`.
