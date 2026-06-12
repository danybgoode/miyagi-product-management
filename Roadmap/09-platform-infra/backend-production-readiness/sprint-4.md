# Backend Production Readiness — Sprint 4: Monitoring & alerting

**Status:** ⬜ not started · **Risk:** LOW–MED (mostly additive; alert wiring touches infra config)

> ✅ **Finalized by Sprint 0 (2026-06-11).** Audit corrections: **deploy-event notifications are ALREADY LIVE**
> — `cicd-telegram-build-notifier` is a deployed Cloud Run service (the seed's "not shipped" is stale), so
> this sprint **verifies/extends** it, doesn't rebuild it. A notification channel **`MiyagiDevopsTele`
> (Telegram webhook) already exists but no policy uses it** — wire the new alerts to it. Error tracker =
> **Sentry**. Added delta: **dependency/CVE scanning** in the pipeline (gap #13). See the audit doc.

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

1. Trip the uptime check (or simulate downtime) → a downtime alert arrives in the channel within the configured window. **[owed to Daniel]**
2. Force a backend error → it appears in the error tracker and (if over threshold) alerts. **[owed to Daniel]**
3. Push to `main` (or the chosen test path) → the deploy push + finish ✅/❌ ping arrives (via `cicd-telegram-notifications`). **[owed to Daniel]**
4. **(Story 4.2 drift guard)** Run the guard on the current tree → green. Then locally revert one invariant in `infra/gcp/deploy.sh` (e.g. swap the startup probe back to `tcpSocket`) → the guard **fails**; restore → green. *(agent self-verifiable — no creds needed.)*

If any step fails, note the step number + what you saw.
