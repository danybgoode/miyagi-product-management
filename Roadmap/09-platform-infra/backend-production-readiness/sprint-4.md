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

## Sprint QA
- **api spec(s):** none (infra/observability). Verification = deliberately tripping each alert.
- **browser smoke owed:** yes, to Daniel — confirm each alert actually arrives in the channel (he holds the GCP/alert-channel creds).
- **deterministic gate:** alert policies + uptime check provision cleanly; no app-code regression.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: prod monitoring + alert channel

1. Trip the uptime check (or simulate downtime) → a downtime alert arrives in the channel within the configured window. **[owed to Daniel]**
2. Force a backend error → it appears in the error tracker and (if over threshold) alerts. **[owed to Daniel]**
3. Push to `main` (or the chosen test path) → the deploy push + finish ✅/❌ ping arrives (via `cicd-telegram-notifications`). **[owed to Daniel]**

If any step fails, note the step number + what you saw.
