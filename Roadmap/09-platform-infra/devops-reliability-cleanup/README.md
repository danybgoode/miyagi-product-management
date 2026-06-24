---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: devops-reliability-cleanup
---

# Epic — DevOps reliability cleanup (smoke · backup alert · tenant ping · agy reviewer)

**Macro-section:** 09 · Platform & Infra
**Class:** Chore + Bug sweep (engineering-facing observability/tooling; no buyer/seller/agent surface).
**Scope doc:** [`Roadmap/00-ideas/2. readyforscope/devops-reliability-cleanup.md`](../../00-ideas/2.%20readyforscope/devops-reliability-cleanup.md) — APPROVED 2026-06-23.
**Sibling:** the 5th ask of the same brain-dump is a separate spike —
[`spike-claude-routines`](../../00-ideas/2.%20readyforscope/spike-claude-routines.md).

## Why
Four small things drifted after the Neon→Cloud SQL migration and recent tooling changes, and each is now
noise or a blind spot: the **daily browser smoke** is red every day (a dead signal), the **db-backup
Telegram alert** still fires nightly (×2) for a retired **Neon** target, the **new-shop signup** Telegram
ping vanished, and **agy** (the Antigravity cross-agent reviewer) stopped printing output after a version
bump. This epic cleans all four — pure observability/tooling, no commerce code.

## Context
| | |
|---|---|
| **Repos** | `danybgoode/miyagisanchezcommerce` (frontend app) · monorepo-root `danybgoode/miyagi-product-management` (`infra/`, `scripts/`, `Roadmap/`) |
| **Ask 1** | `apps/miyagisanchez/.github/workflows/browser-smoke.yml` (nightly `0 9 * * *`) runs the Chromium `*.browser.spec.ts` project vs prod |
| **Ask 2** | `infra/gcp/backups/db-backup.sh` Cloud Run Job, `BACKUP_TARGETS` still includes retired `neon`; Cloud SQL native backups have no Telegram alert |
| **Ask 3** | `tg.newShop()` defined in `apps/miyagisanchez/lib/telegram.ts` but never called; shop-create is `POST /api/sell/shop` |
| **Ask 4** | `scripts/lib/cross-agent-cli.mjs` pins `AGY_PINNED='1.0.7'`; installed agy is **1.0.10+** — `checkAgyVersion()` only warns, `runAntigravity()` returns empty |

## Medusa-first note
**N/A — zero commerce surface.** No products/orders/payments/fulfillment (rule 1); no new Supabase model
(rule 2 — Ask 3 only reads the Medusa-created seller); UCP/MCP untouched (rule 3); Clerk untouched (rule 4).
Rule 5 (bilingual): the only user-adjacent string is the `tg.newShop` ops message (already Spanish, internal
to Daniel) — no allow-list change. Touch surface: `.github/` + `e2e/` + `infra/gcp/` + `scripts/` + one app
route/lib line.

## What already exists (reuse, don't rebuild)
- **Smoke workflow + specs** — `browser-smoke.yml` is sound; the fix lives in the failing `*.browser.spec.ts`
  (or the prod surface it asserts).
- **Backup job + alert idiom** — `infra/gcp/backups/db-backup.sh` (`set -euo pipefail`, `alert()` → Telegram
  on non-zero) + `provision-db-backup.sh`; `BACKUPS.md` already documents the Neon-retirement `gcloud`
  one-liner and the `gcloud sql backups list --instance=medusa-pg` command the new check is built on.
- **Telegram ping** — `tg.newShop(name, location, slug)` (already targets `TELEGRAM_CHAT_ID`, the ops chat);
  `tg.newListing` in `app/api/sell/create/route.ts:333` is the live create-time precedent.
- **Foreign-CLI driver** — `scripts/lib/cross-agent-cli.mjs` (`AGY_PINNED`, `checkAgyVersion()`,
  `runAntigravity()`) + its `node:test` (`cross-agent-cli.test.mjs`); the foreign-CLI LEARNING (~L175) is the
  playbook.

## Scope — stories & risk
| Sprint | Story | Repo | Risk |
|---|---|---|---|
| [S1](sprint-1.md) | S1 · Fix the daily browser smoke | `apps/miyagisanchez` | low |
| [S1](sprint-1.md) | S3 · Restore new-tenant-signup Telegram ping | `apps/miyagisanchez` | low |
| [S2](sprint-2.md) | S2 · Retire Neon target + Cloud SQL backup-failure alert | monorepo-root (`infra/gcp`) | low |
| [S2](sprint-2.md) | S4 · Upgrade-and-adapt agy + fail-loud version check | monorepo-root (`scripts/`) | low |

> Story numbers keep the scope-doc labels (Story 1/2/3/4); sprints group them by repo so each sprint is one
> feature branch + PR.

## Deploy order / topology
Independent — ship S1 and S2 in either order. **S1** lands in the app repo (`feat/devops-reliability-cleanup`
off the app repo's main → Vercel preview → merge). **S2** lands in the monorepo-root repo (`infra/gcp` +
`scripts/`); the agy fix is script-only, the backup check is an idempotent `infra/gcp/` provision script whose
**gcloud writes are owed to Daniel** (he holds GCP creds). Keep `infra/gcp/deploy.sh` +
`deploy-invariants.test.js` green. All four are **low risk** (no money/auth/checkout/migration/shared-surface),
so Claude may merge; owed-to-Daniel pieces are operational only (the `gcloud` env change + live Telegram/agy
eyeball confirmations).

## Definition of Done (epic)
- [x] **S1** — ✅ the `browser` project is green (PR #115 `475ccf3` realigned 4 drifted specs + added
      `data-testid="pwa-tabbar"`; PR #117 `8238cf1` wired `MS_TEST_PDP_LISTING_ID` so the nightly is fully
      green — personalization skips, dormant, as no personalized public listing exists). Why-notes in each spec.
- [x] **S3** — ✅ `tg.newShop` re-wired on net-new create **and** claim (pure `lib/shop-notify.ts`); re-POST /
      re-claim do **not** double-ping; api-project spec covers the format + net-new contract (PR #115 `475ccf3`).
      Live Telegram receipt owed to Daniel.
- [x] **S2** — ✅ built (PR #37, `1133dbb`). Failure-only Cloud SQL backup check (`infra/gcp/backups/cloudsql-check/`:
      pure `backup-freshness.py` predicate + `check-cloudsql-backup.sh` reusing the `db-backup.sh` `alert()` idiom +
      Dockerfile) + idempotent `provision-cloudsql-backup-check.sh` (Cloud Run Job + daily Scheduler) + node:test;
      `BACKUPS.md` updated incl. the staged `BACKUP_TARGETS=supabase` retirement one-liner. **Owed to Daniel:** the
      env change + one clean nightly, the provision + forced-failure (bogus-instance) Telegram smoke.
- [x] **S4** — ✅ built (PR #37, `a791477`). `runAntigravity()` adapted to agy **1.0.10** (`-p` + required `--model`
      + stdin EOF; empty output now = failure — the bug was the missing `--model`); `AGY_PINNED → 1.0.10`;
      `checkAgyVersion()` **fails loud** on an unknown/mismatched version; argv cap + codex→agy fallback intact;
      `node --test 'scripts/lib/*.test.mjs'` green (33). **Owed to Daniel:** a live `--agent antigravity` run.
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough; operational/owed-to-Daniel steps flagged by name.
- [ ] Each story added an api-project spec or a `node:test` where a testable seam exists (LEARNINGS: infra's
      deterministic gate is a pure `node:test`).
- [ ] `RETROSPECTIVE.md`; poster line in `09-platform-infra/README.md`; durable learnings promoted to
      `Roadmap/LEARNINGS.md`; `node scripts/build-order.mjs` re-run.
- [ ] Feature branch(es) deleted at merge; this README's frontmatter `status: shipped`.

## Session kickoffs
Run each in a **fresh** Claude Code session (one per sprint). The Routines spike has its own investigation
prompt in `spike-claude-routines.md` (no branch, no build).

**Sprint 1 — app-repo fixes (smoke + tenant ping):**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/09-platform-infra/devops-reliability-cleanup/README.md and .../sprint-1.md. You're
> building Sprint 1 (two LOW stories in the app repo: fix the red daily browser smoke, and restore the
> new-shop Telegram ping). Enter plan mode, confirm the stories with me, then branch
> feat/devops-reliability-cleanup off latest main in the app repo. Story 1: FIRST reproduce — pull the latest
> failing browser-smoke run (`gh run list --workflow=browser-smoke.yml`, `gh run view <id> --log-failed`, or
> the playwright-browser-report artifact) and confirm locally with
> `PLAYWRIGHT_BASE_URL=https://miyagisanchez.com npm run test:e2e:browser` — name the exact failing spec +
> assertion before changing anything, then realign the spec to current prod or fix the real regression it
> caught (one-line why-note in the spec). Story 3: call tg.newShop(seller.name, location, seller.slug) after a
> net-new creation in app/api/sell/shop/route.ts (after the successful create, before the 201) — NOT on the
> idempotent already-exists branch — and add an api-project spec asserting the ping seam fires on net-new but
> not on re-POST. Confirm with me whether the claim path (app/api/claim/complete) should also ping. When the
> deterministic gate (tsc + build + Playwright api) is green, open a draft PR declaring risk LOW, and write
> the SPRINT SMOKE WALKTHROUGH into sprint-1.md before you call the sprint done. Live Telegram + the green
> nightly are owed to me.

**Sprint 2 — infra/tooling fixes (backup alert + agy):**
> Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
> Then read Roadmap/09-platform-infra/devops-reliability-cleanup/README.md and .../sprint-2.md. You're
> building Sprint 2 (two LOW stories in the monorepo-root repo). Enter plan mode, confirm with me, then branch
> feat/devops-reliability-cleanup off latest main. Story 2: (a) document + stage the owed-to-Daniel gcloud
> one-liner that drops `neon` from the db-backup Job's BACKUP_TARGETS (per BACKUPS.md → Neon target
> retirement); (b) build an idempotent infra/gcp/ provision script for a small Cloud Run Job + Cloud Scheduler
> that runs `gcloud sql backups list --instance=medusa-pg` and pings Telegram ONLY when the latest automated
> backup is missing/not SUCCESSFUL within ~26h (failure-only, no success heartbeat) — reuse the db-backup.sh
> alert() idiom + TELEGRAM_BOT_TOKEN/TELEGRAM_CICD_CHAT_ID; update BACKUPS.md; keep deploy.sh +
> deploy-invariants.test.js green. The gcloud writes are mine to run. Story 4: FIRST reproduce — `agy
> --version` (it's past the pinned 1.0.7 — likely 1.0.10) and `agy --help`; run `node scripts/cross-review.mjs
> <PR#> --agent antigravity --repo <app-repo>` and observe the empty output. Then update runAntigravity() in
> scripts/lib/cross-agent-cli.mjs to the current agy invocation/output contract, bump AGY_PINNED to the new
> known-good version, and make checkAgyVersion() FAIL LOUDLY on an unknown version (not just a stderr warn);
> keep the argv size-cap + codex→agy fallback. Add node:test regressions in cross-agent-cli.test.mjs (non-empty
> capture on a stubbed agy; loud-fail on a version mismatch). When the gate (node --test + deploy-invariants)
> is green, open a draft PR declaring risk LOW, and write the SPRINT SMOKE WALKTHROUGH into sprint-2.md before
> done. A live agy run + the post-env-change nightly are owed to me.
