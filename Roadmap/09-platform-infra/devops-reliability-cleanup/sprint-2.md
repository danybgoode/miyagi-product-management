# Sprint 2 — infra/tooling fixes (backup alert + agy)

**Epic:** [DevOps reliability cleanup](README.md) · **Risk:** all LOW · **Repo:** monorepo-root (`danybgoode/miyagi-product-management` — `infra/gcp/`, `scripts/`)
**Goal:** the stale Neon backup alert is gone, a real Cloud SQL backup-failure alert exists, and agy prints its
cross-agent review again.

> Two independent stories in one root-repo branch (`feat/devops-reliability-cleanup`). Both reproduce-first.
> Story 2's gcloud writes are **owed to Daniel** (GCP creds); the code is the idempotent provision script + docs.

## Stories

### S2 (Story 2) — Retire the Neon target + Cloud SQL backup-failure alert · LOW
**As** Daniel, **I want** the stale Neon alert gone and a real Telegram alert if the Cloud SQL backup fails,
**so that** backup health stays observable on the new stack without nightly false alarms.
- **Root cause:** `infra/gcp/backups/db-backup.sh` still has `neon` in `BACKUP_TARGETS`; Neon was demoted in
  the Cloud SQL migration, so the nightly `pg_dump` of it fails → `🛑 db-backup FAILED: neon pg_dump failed`.
  The "twice nightly" doubling is the Cloud Run Job's `max-retries 1` retry.
- **In (2a — owed to Daniel, operational):** drop the target —
  `gcloud run jobs update db-backup --region=us-east4 --update-env-vars=BACKUP_TARGETS=supabase`
  (per `BACKUPS.md` → *Neon target retirement*; the gate, a confirmed Cloud SQL `SUCCESSFUL` backup, already
  exists). Document/stage it; Daniel runs it.
- **In (2b — build):** an idempotent `infra/gcp/` provision script for a small **Cloud Run Job + Cloud
  Scheduler** that runs `gcloud sql backups list --instance=medusa-pg --project=miyagisanchezback-497722` and
  pings Telegram **only if** the latest automated backup is missing or not `SUCCESSFUL` within ~26h
  (failure-only — no success heartbeat). Reuse the `db-backup.sh` `alert()` idiom +
  `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CICD_CHAT_ID`. Update `BACKUPS.md`.
- **Out:** changing Cloud SQL backup policy/PITR; the Supabase R2 escrow path (unchanged); a success heartbeat
  (declined by Daniel).
- **Acceptance (Daniel can run):** after the env change, **no** more `🛑 db-backup FAILED: neon …` (observe one
  nightly cycle). Run the new check against a bogus `--instance` name → a Telegram failure alert arrives;
  against the real instance → silence.
- **QA:** any extracted pure logic (the "is the latest backup fresh + SUCCESSFUL?" predicate over
  `gcloud … --format=json`) gets a `node:test`/shell-test; keep `infra/gcp/deploy.sh` +
  `deploy-invariants.test.js` green. The live gcloud writes + the forced-failure smoke are owed to Daniel.

### S4 (Story 4) — Upgrade-and-adapt agy + fail-loud version check · LOW *(reproduce first)*
**As** Daniel, **I want** `cross-review.mjs --agent antigravity` to print agy's findings again, **so that** the
second-opinion reviewer is usable.
- **Reproduce (do first):** `agy --version` (it's past the pinned `1.0.7` — sprint notes elsewhere show
  **1.0.10**) + `agy --help`; run `node scripts/cross-review.mjs <PR#> --agent antigravity --repo <app-repo>`
  and observe the empty/garbled output.
- **Root-cause then adapt (Daniel's call = upgrade-and-adapt):** update `runAntigravity()` in
  `scripts/lib/cross-agent-cli.mjs` to the current agy invocation/output contract (the `-p` flag + where
  output now lands), **bump `AGY_PINNED`** to the new known-good version, and make `checkAgyVersion()` **fail
  loudly** (clear non-zero error) on an *unknown* version instead of only a stderr warning. Keep the argv
  size-cap (`AGY_ARG_LIMIT`) + the codex→agy fallback intact.
- **In:** the driver fix + a `node:test` regression in `cross-agent-cli.test.mjs` (non-empty capture on a
  stubbed agy; loud-fail on a version mismatch).
- **Out:** re-litigating CI auto-run (stays local-only per `cross-agent-review-always`); the review rubric;
  codex-side behavior.
- **Acceptance (Daniel can run):** `node scripts/cross-review.mjs <real PR#> --agent antigravity --repo <app-repo>`
  prints non-empty agy review text; a deliberately-wrong pin surfaces a loud error (not a silent warning).
- **QA:** `node --test scripts/lib/cross-agent-cli.test.mjs` green; the live agy run is the smoke (owed to
  Daniel if a fresh agy version needs his machine to confirm).

## Sprint QA
- Infra/tooling — no app code, no money/auth/DB/preview surface. The deterministic gate is the pure
  `node:test` on the extracted seams (the backup-freshness predicate; the agy capture + version-check), per
  LEARNINGS ("infra's deterministic gate is a pure `node:test`").
- `infra/gcp/deploy.sh` + `deploy-invariants.test.js` stay green.
- Live confirmations (gcloud env change, forced-failure Telegram, a real agy run) are **owed to Daniel**.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: GCP project `miyagisanchezback-497722` (`gcloud config configurations activate bonsai-profile`) + a local
checkout of the monorepo-root repo with `agy` installed. Steps **1–6 are owed to Daniel** (live GCP/Telegram +
a real agy run — they can't be driven from the build sandbox); steps 7–8 are the deterministic gate (run here).

**Story 2 — Neon retirement (owed to Daniel):**
1. **(owed)** Drop the stale target:
   `gcloud run jobs update db-backup --region=us-east4 --update-env-vars=BACKUP_TARGETS=supabase`.
   → Command succeeds; `gcloud run jobs describe db-backup --region=us-east4 --format='value(...env...)'` shows
   `BACKUP_TARGETS=supabase` (no `neon`).
2. **(owed)** Wait one nightly cycle (`db-backup` runs `0 9 * * *` UTC).
   → **No** `🛑 db-backup FAILED: neon pg_dump failed` in the ops Telegram chat (and no duplicate from the retry).

**Story 2 — Cloud SQL backup-failure check (owed to Daniel):**
3. **(owed)** Provision: `bash infra/gcp/backups/provision-cloudsql-backup-check.sh`.
   → Prints `✅ cloudsql-backup-check provisioned`; the Cloud Run Job `cloudsql-backup-check` + Scheduler
   `cloudsql-backup-check-daily` exist (`gcloud run jobs describe cloudsql-backup-check --region=us-east4`).
4. **(owed)** Real-instance run: `gcloud run jobs execute cloudsql-backup-check --region=us-east4 --wait`.
   → Execution **Succeeded**, **no** Telegram alert (a recent `SUCCESSFUL` automated backup is within ~26h).
5. **(owed)** Force a failure (bogus instance), then run:
   `gcloud run jobs update cloudsql-backup-check --region=us-east4 --update-env-vars=INSTANCE=does-not-exist`
   then `gcloud run jobs execute cloudsql-backup-check --region=us-east4 --wait`.
   → A `🛑 cloudsql-backup-check (does-not-exist): could not list backups …` Telegram alert arrives. **Restore:**
   `gcloud run jobs update cloudsql-backup-check --region=us-east4 --update-env-vars=INSTANCE=medusa-pg`.

**Story 4 — agy reviewer (owed to Daniel for the live run):**
6. **(owed)** `agy --version` (expect `1.0.10`), then
   `node scripts/cross-review.mjs <a real open PR#> --agent antigravity --repo danybgoode/miyagisanchezcommerce`.
   → agy's review text prints **non-empty**, carrying the advisory-only banner. (If empty: the account may not
   be entitled to the default model — set `AGY_MODEL` to a model `agy models` lists, e.g. a Gemini/Claude one.)

**Deterministic gate (run here — no creds needed):**
7. `node --test 'scripts/lib/*.test.mjs'`
   → 33 pass, incl. `runAntigravity` non-empty capture (asserts `-p`/`--model`/stdin-EOF), empty-output
   rejection, and `checkAgyVersion` loud-fail on a version mismatch / unparseable version.
8. `node --test infra/gcp/test/*.test.js`
   → 29 pass (10 new freshness-predicate + wrapper-idiom asserts; 19 existing deploy-invariants unchanged).

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] **S2 (Story 2)** — built (PR #37, `1133dbb`). 2b: `cloudsql-check/` job (pure `backup-freshness.py`
      predicate + `check-cloudsql-backup.sh` alert + Dockerfile) + idempotent
      `provision-cloudsql-backup-check.sh` + node:test; `BACKUPS.md` updated. 2a: retirement one-liner staged
      in `BACKUPS.md` (**owed to Daniel**). gcloud writes + forced-failure smoke owed to Daniel (steps 1–5).
- [x] **S4 (Story 4)** — built (PR #37, `a791477`). `runAntigravity()` adapted to the agy 1.0.10 print
      contract (`-p` + `--model` + stdin EOF; empty = failure); `AGY_PINNED → 1.0.10`; `checkAgyVersion()`
      fails loud; argv cap + codex→agy fallback intact; node:test regressions. Live agy run owed to Daniel (step 6).

> Refs: PR #37 · S4 `a791477` · S2 `1133dbb`. **Owed to Daniel:** the `BACKUP_TARGETS=supabase` env change +
> one clean nightly, the `cloudsql-backup-check` provision + forced-failure Telegram smoke + post-env nightly,
> and a live `agy` cross-review run.
