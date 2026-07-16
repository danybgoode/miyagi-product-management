# Retrospective — DevOps reliability cleanup

_Closed: 2026-06-24_

**Shipped:** 2026-06-24 · **2 sprints, all LOW** · monorepo-root (`infra/`, `scripts/`) + app repo.
**Class:** chore + bug sweep (engineering-facing observability/tooling; zero buyer/seller/agent surface).

## What shipped
Four post-(Neon→Cloud SQL)-migration frictions, each noise or a blind spot:

- **S1 (app repo, PR #115 `475ccf3` + #117 `8238cf1`)** — greened the daily browser smoke (realigned 4
  drifted specs + `data-testid="pwa-tabbar"`; wired `MS_TEST_PDP_LISTING_ID`), and restored the new-shop
  Telegram ping (`tg.newShop` on net-new create **and** claim via a pure `lib/shop-notify.ts`; re-POST/re-claim
  don't double-ping).
- **S2 (root, PR #37)** — two infra/tooling fixes:
  - **Backup observability:** retired the stale `neon` target from the `db-backup` job (killing a nightly
    double false-alarm) and added a **failure-only Cloud SQL backup-health alert** — a Cloud Run Job + daily
    Scheduler that lists `medusa-pg` backups and pings Telegram only when the latest automated backup is
    missing/not `SUCCESSFUL` within ~26h. Pure unit-tested `backup-freshness.py` + the `db-backup.sh`
    `alert()` idiom + an idempotent provision script.
  - **agy reviewer:** adapted `runAntigravity()` to agy **1.0.10**, bumped the pin, and made the version check
    fail loud.
- **Follow-ups (same PR):** a `scripts-guard.yml` CI gate for the `scripts/` node:tests (previously only
  `infra/` had one), and the durable agy lesson promoted to `LEARNINGS.md`.

All live writes were **run by Claude under explicit authorization** on 2026-06-24 and smoked end-to-end
(see `sprint-2.md` → Live confirmation).

## What went well
- **Reproduce-first paid off twice.** S4's whole fix hinged on *seeing* the failure: `agy --log-file` revealed
  the empty output was a **quota 429** (`RESOURCE_EXHAUSTED`), not "entitlement" as first assumed, and that
  print mode (a) needs an explicit `--model` and (b) exits **0 with empty stdout** on quota — invisible to a
  status check. Guessing would have shipped the wrong fix.
- **The pure-seam + node:test discipline held.** The backup-freshness predicate is a side-effect-free script
  the node:test drives with fixtures; the agy contract is locked by injectable-spawn regressions. Both ran in
  CI with zero npm deps.
- **Degrade, don't die.** Making Gemini the default *and* keeping the tool working fell out naturally as a
  primary→fallback model (Gemini → GPT-OSS on empty) — honoring the request without a quota-fragile default.
- **Idempotent provision scripts** meant the one runtime bug (256Mi < the 512Mi gen2 floor) was a one-line
  fix + a clean re-run, not a teardown.

## What we learned (promoted to LEARNINGS.md)
- **A young foreign CLI silently breaks its own contract on a *minor* bump.** agy `1.0.7→1.0.10`: `-p` became
  an alias of `--print`, print now requires `--model`, and a quota-exhausted model exits 0 with empty stdout.
  Re-validate by running it (with `--log-file`), treat **empty output as failure**, give the model a
  **primary→fallback**, and make the version check **fail loud** (a stderr warn is ignored — that's *how* the
  bump shipped empty for weeks). Fixed the now-wrong "warn (not fail)" line in the same section.

## Gaps / follow-ups
- **One nightly cycle still rolls overnight** to visually confirm zero `neon` alerts from the live `db-backup`
  cron (`0 9 * * *`) — expected silent; nothing to do.
- **Neon retirement ran ~6 days into the ~1-week rollback window** (per explicit authorization). It only stops
  *escrowing* Neon; the Neon DB itself is untouched and still demotable to a dev sandbox.
- **Live Gemini (not the fallback)** stays unverified until its per-subscription quota resets or is upgraded;
  the tool transparently uses GPT-OSS meanwhile.
