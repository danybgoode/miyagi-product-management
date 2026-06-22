# Postgres → Cloud SQL — Sprint 1: Provision Cloud SQL + rehearse on staging

**Status:** ⬜ Not started. Infra (root repo `infra/gcp`) + a `medusa-web-staging` repoint. Risk: **MED** —
additive; nothing prod is cut over. Daniel runs the gcloud writes (Cloud SQL **bills on creation**). The point
of this sprint is to **prove the entire migration pattern on the low-risk staging service** before touching prod.

## Why
Co-locating Postgres on GCP kills the egress problem at the root (see epic README). Before the prod cutover, we
stand up Cloud SQL and run the full dump→restore→repoint→verify loop against **staging** — so the S2 prod
cutover is a rehearsed, known-good runbook, not a first attempt on money data.

## Stories

### Story 1.1 — Provision Cloud SQL (PG17, private IP, single-zone + PITR)
**As** the platform, **I want** a managed Postgres on GCP co-located with the backend, **so that** commerce
DB traffic stays inside the VPC (no cross-cloud egress) and the DB is reachable like Redis already is.
**Acceptance:**
- Cloud SQL for PostgreSQL **17** instance in **us-east4**, **private IP** on the existing VPC via Private
  Service Access (the network the `medusa-conn` connector + Redis `10.x` already use), **single-zone**,
  **7-day PITR + automated backups** enabled, smallest practical tier (document the choice + ~$/mo).
- A **prod** database and a **staging** database on the instance; a DB user/password stored as a secret (or the
  `DATABASE_URL` value composed for each service).
- Provisioning captured as an **idempotent script** under `infra/gcp` (create-if-absent, same shape as
  `provision-monitoring.sh`); `sqladmin.googleapis.com` enablement included.
- The backend VPC can **reach** the instance's private IP (a connectivity probe from a VPC context succeeds).
**Risk:** med (new paid infra; networking). Reversible (delete the instance).

### Story 1.2 — Verify version + extension parity (blocker check)
**As** the migrator, **I want** to confirm Cloud SQL supports everything Neon's schema uses, **so that** the
restore can't fail mid-cutover on an unsupported extension.
**Acceptance:**
- Enumerate Neon `main`'s installed extensions (`\dx`) + server version; confirm each is available + enabled on
  Cloud SQL PG17 (Cloud SQL has an allow-list). Any gap is surfaced as a **blocker** with a remediation note.
**Risk:** low (read-only investigation) — but gates S2.

### Story 1.3 — Rehearse the full migration on staging
**As** the platform, **I want** the dump→restore→repoint→verify loop proven on `medusa-web-staging`, **so that**
the prod cutover runbook is known-good.
**Acceptance:**
- `pg_dump` Neon **staging** → restore into the Cloud SQL **staging** DB (record the exact commands + timing).
- Repoint `medusa-web-staging`'s `DATABASE_URL` to the Cloud SQL private DSN; redeploy; confirm Medusa **boots
  clean**, migrations are a **no-op**, and a **catalog read** smoke passes against staging.
- The proven commands + timings are written into this sprint's smoke walkthrough → become the S2 runbook.
**Risk:** med (staging only; no money path).

## Sprint QA
- **deterministic gate:** `node --test 'infra/gcp/test/*.test.js'` green (any new invariant for the staging
  `DATABASE_URL` home stays consistent); provisioning script `bash -n` clean.
- **live confirmation:** staging Medusa boots + catalog smoke against Cloud SQL (agent-runnable); the gcloud
  provisioning writes are **owed to Daniel** (paid infra).
- **no prod change** this sprint.

## Sprint 1 — Smoke walkthrough
_Written at build time — numbered steps, one action + one expected result each, real commands. Flag the gcloud
provisioning + any paid step as owed-to-Daniel._
