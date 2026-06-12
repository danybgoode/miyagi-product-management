# Backend Production Readiness — Sprint 4: Monitoring & alerting

**Status:** ✅ **BUILT + STAGING-REHEARSED 2026-06-12** (`feat/backend-prod-readiness` — monorepo-root
`miyagi-product-management` commits `27d202d` 4.2 · `c6d6582` 4.1; backend `medusa-bonsai-backend` `d3273d9`
4.3). Monitoring provisioner rehearsed end-to-end on `medusa-web-staging` (7 resources created + channel-bound +
idempotent re-run, **then torn down**); drift guard green in CI (green→red→green smoke). **Owed to Daniel:**
merge both PRs (HIGH tier) + `provision-monitoring.sh TARGET=prod` + live alert-delivery confirm. · **Risk:**
LOW–MED (mostly additive; alert wiring touches infra config)

> ✅ **Finalized by Sprint 0 (2026-06-11).** Audit corrections: **deploy-event notifications are ALREADY LIVE**
> — `cicd-telegram-build-notifier` is a deployed Cloud Run service (the seed's "not shipped" is stale), so
> this sprint **verifies/extends** it, doesn't rebuild it. A notification channel **`MiyagiDevopsTele`
> (Telegram webhook) already exists but no policy uses it** — wire the new alerts to it. Error tracker =
> **GCP Error Reporting** (chosen at build over Sentry — native to the Cloud Run project, captures stderr
> stack traces, **zero new dependency / no backend-app code change** on the live service; frontend keeps its
> own Sentry). Added delta: **dependency/CVE scanning** = **Dependabot** (gap #13). See the audit doc.

## Stories

### Story 4.1 — Know when prod is down, erroring, or saturated
**As the** owner, **I want** alerts when prod is unreachable, throwing errors, or running hot, **so that** I
find out before users do.
**Acceptance:**
- An **uptime check** on the prod backend fires to a channel on downtime.
- **Error tracking** captures backend exceptions (e.g. Sentry, or the chosen tool from S0) with a sensible
  alert threshold.
- **Cloud Run alert policies** exist for 5xx rate, p95 latency, memory, and instance saturation, routing to
  the **existing `MiyagiDevopsTele`** channel.
- **Deploy events** confirmed flowing (the `cicd-telegram-build-notifier` service is already live — verify,
  don't rebuild; extend if a gap is found).
- **Dependency/CVE scanning** runs in the build pipeline (gap #13).
**Risk:** LOW–MED

### Story 4.2 — Static drift guard for the hardening invariants *(fast-follow, added 2026-06-12 per Daniel's S3 follow-up)*
**As the** owner, **I want** a cheap automated check that fails when a future change erodes the infra
hardening, **so that** the S3 probe/CORS gains can't silently regress (infra isn't Playwright-gated, so a
static guard is the deterministic safety net).
**Context — the infra-coverage posture (why this is a rider, not a project):** infra coverage here is three
legs, all already placed — (a) **runtime** synthetic monitoring = Story 4.1 (uptime + alert policies +
Sentry); (b) **manual rehearsal** = the S3 staging rollback drill (executed 2026-06-12,
`tasks/backend-recovery-runbook.md` §6); (c) **static drift** = this story. Playwright (browser/api *app*
specs) is deliberately **not** the infra gate — synthetic monitoring + a config-assertion guard are the
right tools. This is the same anti-erosion pattern as the raw-color / monolith guards (see `LEARNINGS.md →
Build & QA`): a pure offender-finder + an assertion test, fails CI on regression.
**Acceptance:**
- A pure-logic assertion (node test in the monorepo — co-locate with the existing
  `infra/gcp/cicd-telegram-notifier/test/` pattern) that **reads `infra/gcp/deploy.sh` + `deploy-staging.sh`
  and fails** if any invariant is missing: startup probe is HTTP `/health` (not `tcpSocket`); a liveness
  probe on `/health` exists; `ADMIN_CORS` default includes `https://api.miyagisanchez.com` (the admin's own
  origin — the S3 default-bug fix); both deploy scripts stay in sync on the probe flags.
- **`deploy.sh` ↔ live config drift (found during S3 prod apply, 2026-06-12):** the prod script has drifted
  from live `medusa-web` and a full `deploy.sh` run would **error**. Two parts: (a) `--set-secrets` omits 3
  live secrets (`FLAGSMITH_ENVIRONMENT_KEY`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET`) → would be dropped; (b)
  `ENVIA_SANDBOX` is bound as a non-existent **secret** but is a **plain env var** live → would fail "secret
  not found". **First reconcile** the script to live (move `ENVIA_SANDBOX` to `--set-env-vars` with its live
  value; add the 3 secrets), rehearsed on staging; **then** the guard asserts full env+secret parity (script
  `--set-env-vars`/`--set-secrets` ≡ live) so it can't drift again. See `tasks/backend-recovery-runbook.md` §5 ⚠️.
- The guard runs in CI where these files live (confirm the monorepo repo has an Actions workflow; if not,
  add a minimal one or wire it into the existing notifier test job) and is green on the current tree.
- A one-line pointer from `tasks/backend-recovery-runbook.md` (§4) to the guard so the link is discoverable.
**Risk:** LOW (test/tooling only; no runtime change).

## Sprint QA
- **api spec(s):** none (infra/observability). Verification = deliberately tripping each alert.
- **browser smoke owed:** yes, to Daniel — confirm each alert actually arrives in the channel (he holds the GCP/alert-channel creds).
- **deterministic gate:** alert policies + uptime check provision cleanly; no app-code regression.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: prod monitoring + alert channel

1. After `provision-monitoring.sh TARGET=prod`: trip the uptime check (or simulate downtime) → a downtime alert arrives in `MiyagiDevopsTele` within the configured window. **[owed to Daniel — prod creds]**
2. Force a backend error (prod) → it appears in Error Reporting and (over threshold) the "backend errors (logs)" alert fires to the channel. **[owed to Daniel — prod creds]**
3. Push to `main` → the deploy push + finish ✅/❌ ping arrives (via `cicd-telegram-build-notifier`, verified ACTIVE 2026-06-12). **[owed to Daniel — prod creds]**
4. ✅ **(Story 4.2 drift guard) — EXECUTED 2026-06-12.** `node --test infra/gcp/test/*.test.js` → 12/12 green; reverted the startup probe to `tcpSocket` → guard **failed** (2 conditions: HTTP-probe + prod↔staging sync); restored → green. *(agent self-verifiable — no creds.)*
5. ✅ **(Story 4.1 provisioner) — REHEARSED ON STAGING + PROVISIONED ON PROD 2026-06-12.** `TARGET=staging` →
   uptime + 6 policies created/channel-bound, idempotent re-run, then **torn down**. After cross-review (codex +
   antigravity) hardening, `TARGET=prod` provisioned the live uptime check (`api.miyagisanchez.com/health`,
   validate-ssl) + all 6 alert policies, **all enabled + bound to `MiyagiDevopsTele`**; prod `/health` 200. A
   **synthetic always-firing policy was fired once then deleted** to exercise delivery. **Residual (Daniel):**
   confirm the synthetic/real alert actually lands in the Telegram channel (agent can't see it). *(steps 1–3
   above are now wired and live — they become Daniel's receipt eyeball, not net-new work.)*

If any step fails, note the step number + what you saw.
