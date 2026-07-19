---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: gcp-account-migration
---

# Epic: GCP account migration — `leroytramafat` → `lolis8755` (new project, rebuild + cutover)

> **Area:** 09 · Platform & Infra · **Risk:** high · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/gcp-account-migration.md`](../../00-ideas/seeds/gcp-account-migration.md) · **Archetype:** Migrator/Cutover

## Why

Production moves to a new Google identity. The ask was "all settings the same, as seamless as
possible" — and most of it genuinely is, because every script under `infra/gcp/` is already
parameterized by `PROJECT_ID`.

**The one thing that makes this a HIGH-risk epic rather than a chore:** since
[`postgres-neon-to-cloudsql`](../postgres-neon-to-cloudsql/README.md) closed (2026-06-22), the
**production commerce database lives in Cloud SQL inside the project we're leaving.** This migration
moves the money data. It needs a measured cutover window, a rollback that actually works, and
Daniel's hands on the go/no-go.

## Scope boundary

**GCP-only** (Daniel, 2026-07-19). In: a fresh project under `lolis8755`, re-provision, migrate
secrets + Cloud SQL data, repoint the Cloudflare origin. **Out:** Cloudflare, Vercel, Clerk, Stripe,
Mercado Pago, Supabase, R2, Upstash, Resend, GitHub accounts — they stay put, and are touched only
where a value must point at the new origin (webhooks, callback URLs).

## Medusa-first note

N/A — pure infrastructure. **No application code should change in this epic.** If a sprint proposes
editing `apps/backend` or `apps/miyagisanchez` source, that is a signal something has been misread:
the app is portable already, and the migration is configuration + data + DNS.

## What already exists (reuse, don't rebuild)

**This is the reuse-heaviest epic on the board. Almost no new code should be written.**

- **Every `infra/gcp/` script takes `PROJECT_ID` as an env override**, defaulting to
  `miyagisanchezback-497722` via `${PROJECT_ID:-…}`. The migration is largely
  `PROJECT_ID=<new> BILLING_ACCOUNT=<new> bash infra/gcp/<script>.sh`.
- `infra/gcp/README.md` — already documents the exact run order (provision → secrets → deploy → map
  domain → repoint webhooks → CI/CD). **That order is the runbook.** Update it; don't write a parallel one.
- `infra/gcp/test/` — `deploy-invariants.test.js`, `alb-invariants.test.mjs`,
  `scheduler-invariants.test.mjs`, `cloudsql-backup-check.test.js`, `frontend-build-args.test.js`,
  `cloudflare-cutover-flip.test.mjs`. **This is the acceptance harness, already written.**
- `infra/gcp/cloudflare-cutover-flip.mjs` + its test — the built-and-proven origin flip from the
  2026-07-10 Vercel→Cloud Run cutover. **Reuse it; never hand-edit DNS.**
- `infra/gcp/STAGING.md` + `provision-staging.sh` / `deploy-staging.sh` — a whole rehearsal surface.
- `tasks/backend-recovery-runbook.md` — rollback / health-probe / admin-exposure posture.
- Cloud SQL's own export/import and cross-project restore paths — **no custom dump tooling.**

## Inventory (read from `infra/gcp/`, 2026-07-19 — re-verify against the live project)

Project `miyagisanchezback-497722` · billing `01BCB8-AA3451-6EC373` · region `us-east4` ·
Cloud SQL `medusa-pg` · Cloud Run `medusa-web` + `miyagi-web` · Artifact Registry `medusa` +
`frontend` · Memorystore `medusa-redis` · VPC connector `medusa-conn` (`10.8.0.0/28`) ·
~17 backend + ~25 frontend Secret Manager secrets · Cloud Build triggers (both repos) ·
4 Cloud Scheduler jobs · monitoring policies · ALB · report registry · staging.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 0 | 0.1 New project + billing + APIs; `provision.sh` + `provision-frontend.sh` green; verify inventory vs script defaults | low |
| 1 | 1.1 Copy all ~40 secret values (do **not** rotate) | high |
| 1 | 1.2 Restore a Cloud SQL **backup** into the new instance; boot `medusa-web` against it; **measure the sync duration** | high |
| 2 | 2.1 Cloud Build triggers on both repos (GitHub OAuth = Daniel's console step), left **disabled** | low |
| 2 | 2.2 Scheduler jobs, monitoring, ALB — provisioned, schedulers **paused** | low |
| 3 | 3.1 Final DB sync + Cloudflare origin flip | high |
| 3 | 3.2 Repoint Stripe / MP webhooks + ML redirect URI; enable new triggers, disable old; resume new schedulers, pause old | high |
| 4 | 4.1 Decommission the old project — **deferred, separate sprint** | low |

## Deploy order

Sprints 0→1→2 touch **nothing in production** — the new project is built and validated in parallel
while prod keeps serving from the old one. Sprint 3 is the only user-visible moment, and Daniel
picks the window and merges. **Sprint 4 does not run until an agreed quiet period has passed with
the new project healthy** — keeping the old project alive *is* the rollback plan.

## Kill-switch

**N/A as a feature flag — the rollback is the old project.** Sprint 3's cutover is reversible by
re-running `cloudflare-cutover-flip.mjs` against the old origin, which is exactly why Sprint 4 is
separate and deferred. Stage 6b carve-out recorded here.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] `infra/gcp/README.md` + `tasks/backend-recovery-runbook.md` updated to the new project — **the docs must not still name the old project after cutover**
- [ ] **Kill-switch:** N/A — carve-out recorded at grooming (Stage 6b): rollback is the intact old project, not a flag
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
