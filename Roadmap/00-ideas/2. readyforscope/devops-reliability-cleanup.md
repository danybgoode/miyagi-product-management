# DevOps reliability cleanup — smoke, backup alert, tenant ping, agy reviewer

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **09 · Platform & Infra**. Slug: `devops-reliability-cleanup`.
Class: **Chore + Bug sweep** (engineering-facing observability/tooling; no buyer/seller/agent surface).

Four small, independent infra fixes groomed together as one epic (Daniel's call, 2026-06-23). The fifth
ask of the same brain-dump — *evaluate Claude Routines* — is a **separate spike**
(`spike-claude-routines.md`); it needs investigation + a written decision, not a build.

## Mirror-back
> Four things drifted after recent infra changes and you want them back on the rails: (1) the **daily
> browser smoke** has been red every day — review and fix it; (2) the **db-backup Telegram alert** still
> fires nightly for **Neon** (`🛑 db-backup FAILED: neon pg_dump failed`) even though commerce moved to
> Cloud SQL — kill the stale alert but **keep a backup-failure alert on the new stack**; (3) the **new
> tenant (shop) signup** Telegram ping disappeared — restore it to the same ops chat you get everything
> else on; (4) **agy** (the Antigravity cross-agent reviewer) **stopped printing its output**, likely a
> pinned-version-vs-update drift — get it working again. Right?

## Daniel's grooming calls (2026-06-23)
- **Package as one cleanup epic** (these four) + a **separate Routines spike** (ask 5).
- **Ask 2:** **failure-only** alert on the Cloud SQL stack (no positive "backup OK" heartbeat).
- **Ask 4:** **upgrade-and-adapt** to the latest agy (don't just downgrade) — and make the version check
  **fail loudly** instead of only warning.
- Planning only here; the Routines decision lands in its own spike doc.

## Stage-2.5 buckets — already-possible / light / new (verified against the repo 2026-06-23)
| Ask | Bucket | Why |
|---|---|---|
| 1 · Smoke fix | **Bug** | A real red signal; root-cause from the failing run, then realign the spec or fix the prod drift it caught. |
| 2a · Kill stale Neon alert | **Already possible today** | One `gcloud run jobs update` drops `neon` from `BACKUP_TARGETS` — already documented as owed-to-Daniel in `BACKUPS.md` → *Neon target retirement*. |
| 2b · Cloud SQL backup-failure alert | **Genuinely new (small)** | Cloud SQL native backups have **no** Telegram alert today (console-verifiable only). One small scheduled check fills the gap. |
| 3 · Tenant-signup ping | **Bug** | `tg.newShop()` exists and already targets the ops chat, but **has no caller** — wire it into the shop-create path. |
| 4 · agy output | **Bug / chore** | agy drifted past the pinned `1.0.7`; the invocation/version-check needs adapting so output is captured again. |

## What already exists (reuse, don't rebuild) — verified 2026-06-23
| Capability | Where | Reuse for |
|---|---|---|
| Browser smoke workflow (Chromium `browser` project, nightly `0 9 * * *` + dispatch, against prod) | `apps/miyagisanchez/.github/workflows/browser-smoke.yml` | Ask 1 — the workflow is fine; the fix is in the spec(s) or the prod surface they assert |
| The `*.browser.spec.ts` specs (assert live copy/headings/testids vs prod) | `apps/miyagisanchez/e2e/*.browser.spec.ts` (`smoke`, `seller-acquisition-servicios`, `discovery-filter`, `cross-channel-trust`, `trust-signals`) | Ask 1 — the likely drift point |
| R2-escrow backup job + alert plumbing (`set -euo pipefail`, `alert()` → Telegram on non-zero) | `infra/gcp/backups/db-backup.sh` + `provision-db-backup.sh` | Ask 2 — same Telegram channel/format; the Cloud SQL check follows this idiom |
| Backup runbook incl. the documented Neon-retirement `gcloud` one-liner + Cloud SQL backup list command | `infra/gcp/backups/BACKUPS.md` | Ask 2 — the retirement step is already written; build the check on `gcloud sql backups list --instance=medusa-pg` |
| Telegram helper + the **already-defined-but-uncalled** `tg.newShop(name, location, slug)` (routes to `TELEGRAM_CHAT_ID`, the ops chat) | `apps/miyagisanchez/lib/telegram.ts` | Ask 3 — call it; no new helper, no new channel |
| Shop-create route (creates the Medusa seller, mirrors to Supabase, returns slug) | `apps/miyagisanchez/app/api/sell/shop/route.ts` (POST, ~L95–100); also the claim path `app/api/claim/complete/route.ts` | Ask 3 — the insertion point(s) |
| `tg.newListing` already wired (the live precedent for a create-time ping) | `apps/miyagisanchez/app/api/sell/create/route.ts:333` | Ask 3 — copy the pattern |
| Foreign-CLI driver: version pin, `checkAgyVersion()` (warns), `runAntigravity()` = `agy -p <argv>` → stdout | `scripts/lib/cross-agent-cli.mjs` (`AGY_PINNED='1.0.7'`, L168–176, L301–315) | Ask 4 — the exact code to adapt |
| The foreign-CLI LEARNING ("`<cli> --help` first, pin, degrade; agy flags shift between releases") | `Roadmap/LEARNINGS.md` (foreign-CLI note ~L175) | Ask 4 — the playbook the fix follows |
| Unit harness for the CLI driver (`node:test`) | `scripts/lib/cross-agent-cli.test.mjs` | Ask 4 — the regression-test seam |

## Medusa-first reframe (AGENTS five-rule check)
**N/A — zero commerce surface across all four.** No products/orders/payments/fulfillment touched (rule 1),
no new Supabase model (rule 2 — Ask 3 only *reads* the seller already created via Medusa), UCP/MCP untouched
(rule 3), Clerk untouched (rule 4). Rule 5 (bilingual): the one user-adjacent string is the `tg.newShop`
message, which is **internal ops text to Daniel** (already Spanish: *"Nueva tienda reclamada"*), not a
user-facing surface — no allow-list change. This epic is `.github/` + `e2e/` + `infra/gcp/` + `scripts/` +
one app route/lib line.

## Stories — in/out scope, acceptance, risk

### Story 1 — Fix the daily browser smoke (Bug · **low**) · repo: `apps/miyagisanchez`
**As** Daniel, **I want** the nightly Browser smoke green again, **so that** a real failure is a signal, not noise.
- **Reproduce first:** pull the latest failing run — `gh run list --workflow=browser-smoke.yml` then
  `gh run view <id> --log-failed` (or download the `playwright-browser-report` artifact) — to name the exact
  failing spec + assertion. Confirm locally with `PLAYWRIGHT_BASE_URL=https://miyagisanchez.com npm run test:e2e:browser`.
- **Root-cause then fix:** if a public spec drifted from current prod copy/markup → realign the spec to the
  shipped surface; if it caught a real prod regression → fix the regression (and keep the assertion).
- **In:** make the `browser` project pass against prod; a one-line note in the spec on *why* the assertion changed.
- **Out:** rewriting the harness; adding new smoke coverage; provisioning the authed `MS_TEST_*` secrets (the
  authed buyer smoke stays skipped without them — that's by design, not the failure).
- **Acceptance (Daniel can run):** trigger the workflow via *Run workflow* (workflow_dispatch) → it goes
  **green**; the next nightly run is green.
- **QA:** this story *is* a smoke; the green workflow run is the gate. Add/realign the relevant
  `*.browser.spec.ts`.

### Story 2 — Retire the Neon backup target + add a Cloud SQL backup-failure alert (Chore · **low**) · repo: monorepo-root (`infra/gcp`)
**As** Daniel, **I want** the stale Neon alert gone and a real Telegram alert if the Cloud SQL backup fails,
**so that** backup health stays observable on the new stack without nightly false alarms.
- **In (2a, owed to Daniel — operational):** drop `neon` from the `db-backup` Cloud Run Job —
  `gcloud run jobs update db-backup --region=us-east4 --update-env-vars=BACKUP_TARGETS=supabase`
  (per `BACKUPS.md` → *Neon target retirement*; gated on a confirmed Cloud SQL `SUCCESSFUL` backup, which
  already exists). The "twice nightly" doubling is the Job's `max-retries 1` retry — gone once the target is dropped.
- **In (2b, build):** a small scheduled check (Cloud Run Job + Cloud Scheduler, mirroring the `db-backup`
  pattern) that runs `gcloud sql backups list --instance=medusa-pg` and pings Telegram **only if** the latest
  automated backup is missing or not `SUCCESSFUL` within the expected window. Failure-only — no success heartbeat.
  Reuse the `alert()` idiom + `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CICD_CHAT_ID`. Update `BACKUPS.md`.
- **Out:** changing Cloud SQL backup policy/PITR; alerting on the Supabase R2 escrow path (unchanged); a
  success heartbeat (explicitly declined).
- **Acceptance (Daniel can run):** after the env change, **no** more `🛑 db-backup FAILED: neon …` messages
  appear (observe one nightly cycle). Force the check against a bogus instance name in staging → a Telegram
  failure alert arrives; against the real instance → silence.
- **Risk note:** low; the gcloud writes are owed to Daniel (I don't hold GCP creds). The provisioning is an
  idempotent script under `infra/gcp/`; keep `deploy.sh` + `deploy-invariants.test.js` green.

### Story 3 — Restore the new-tenant-signup Telegram ping (Bug · **low**) · repo: `apps/miyagisanchez`
**As** Daniel, **I want** a Telegram ping when a new shop is created, **so that** I see signups in the same
ops chat as everything else.
- **Root cause:** `tg.newShop()` is defined and targets `TELEGRAM_CHAT_ID` but is **never called**; shop
  creation moved to `POST /api/sell/shop` and the ping wasn't carried over (only `tg.newListing` survived).
- **In:** call `tg.newShop(seller.name, location, seller.slug)` (fire-and-forget) after a **successful, net-new**
  creation in `app/api/sell/shop/route.ts` (after L98, before the 201) — **not** on the idempotent
  already-exists branch (L50–54), so a re-POST doesn't double-ping. Confirm whether the claim path
  (`app/api/claim/complete/route.ts`) should also ping (Daniel: include claims, or new-create only?).
- **Out:** a new helper or channel; seller-facing notifications; changing the message copy.
- **Acceptance (Daniel can run):** create a brand-new shop via the onboarding wizard → a `🏪 Nueva tienda
  reclamada` message arrives in the ops chat with the shop name + `/s/<slug>` link. Re-submitting the same
  shop does **not** ping again.
- **QA:** an api-project spec asserting the create path invokes the ping seam (mock `tgSend`) on net-new but
  not on the idempotent branch. Live send owed to Daniel (real Telegram).

### Story 4 — Get agy's cross-agent review printing again (Bug/chore · **low**) · repo: monorepo-root (`scripts/`)
**As** Daniel, **I want** `cross-review.mjs --agent antigravity` to print agy's findings again, **so that** the
second-opinion reviewer is usable.
- **Reproduce first:** `agy --version` (confirm it's past the pinned `1.0.7`) + `agy --help`; run
  `node scripts/cross-review.mjs <PR#> --agent antigravity --repo <app-repo>` and observe empty/garbled output.
- **Root-cause then adapt (Daniel's call = upgrade-and-adapt):** update `runAntigravity()` to the current
  agy's invocation/output contract (flag + where output lands), **bump `AGY_PINNED`** to the new known-good
  version, and **make `checkAgyVersion()` fail loudly** (non-zero / clear error) on an *unknown* version
  instead of only writing a stderr warning. Keep the argv size-cap + the codex→agy fallback intact.
- **In:** the driver fix in `scripts/lib/cross-agent-cli.mjs` + a `node:test` regression in
  `cross-agent-cli.test.mjs` (assert non-empty capture on a stubbed agy; assert the loud-fail on a version mismatch).
- **Out:** re-litigating CI auto-run (descoped in `cross-agent-review-always` — stays local-only); changing
  the review rubric; codex-side behavior.
- **Acceptance (Daniel can run):** `node scripts/cross-review.mjs <real PR#> --agent antigravity --repo <app-repo>`
  prints agy's review text (non-empty); a deliberately-wrong pin surfaces a loud error, not a silent warning.
- **QA:** `node --test scripts/lib/cross-agent-cli.test.mjs` green; the live smoke is a real PR run (owed to Daniel
  if a fresh agy version needs his machine to confirm).

## Slicing → sprints
Split by **repo boundary** (one feature branch + PR per repo, per gitflow):

| Sprint | Stories | Repo | Risk |
|---|---|---|---|
| **S1 — app-repo fixes** | Story 1 (smoke) · Story 3 (tenant ping) | `apps/miyagisanchez` | low |
| **S2 — infra/tooling fixes** | Story 2 (backup alert) · Story 4 (agy) | monorepo-root | low |

Independent — ship in either order. All four are **low risk** (no money/auth/checkout/migration/shared-surface
touch), so Claude may merge; the only owed-to-Daniel pieces are operational (the `gcloud` env change + live
Telegram/agy eyeball confirmations).

## Open risks / unknowns
- **Story 1:** the actual failing spec is unconfirmed until the run log is pulled — could be a trivial copy
  realign or a real prod regression (changes the size). Reproduce step is the first action.
- **Story 2b:** "expected window" for the Cloud SQL backup freshness needs a threshold (default: alert if no
  `SUCCESSFUL` backup in the last 26h, covering the daily cadence + slack).
- **Story 3:** claim-path inclusion is the one open product question (above).
- **Story 4:** the latest agy's exact output contract is unknown until `agy --help` is read on a machine with
  the new version — the fix is "diagnose, then adapt" with the upgrade direction already chosen.

## Definition of Ready check
- [x] Each story has As/I-want/so-that + acceptance Daniel can run.
- [x] Stage-2.5 bucket named per ask.
- [x] v1 in/out boundary written per story.
- [x] Reuse list produced (Medusa-first reframe done — N/A, no commerce).
- [x] Every story risk-tiered (all low); QA stage named; smoke owner identified.
- [ ] **Daniel approves this scope doc** → then scaffold the epic + two sprint docs and emit kickoffs.
