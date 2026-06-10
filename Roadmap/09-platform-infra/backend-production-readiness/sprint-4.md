# Backend Production Readiness — Sprint 4: Monitoring & alerting

**Status:** ⬜ not started · **Risk:** LOW–MED (mostly additive; alert wiring touches infra config)

> ⚠️ **Candidate slice — finalized by Sprint 0.** Tooling choices (error tracker, alert channel) come from S0.
> **Reuse, don't rebuild:** deploy-event notifications are owned by the `cicd-telegram-notifications` epic —
> this sprint ships/extends it for deploys and adds the *runtime* signals it doesn't cover.

## Stories

### Story 4.1 — Know when prod is down, erroring, or saturated
**As the** owner, **I want** alerts when prod is unreachable, throwing errors, or running hot, **so that** I
find out before users do.
**Acceptance:**
- An **uptime check** on the prod backend fires to a channel on downtime.
- **Error tracking** captures backend exceptions (e.g. Sentry, or the chosen tool from S0) with a sensible
  alert threshold.
- **Cloud Run alert policies** exist for 5xx rate, p95 latency, memory, and instance saturation, routing to
  the same channel.
- **Deploy events** (push + finish ✅/❌, both repos) are covered by shipping/extending
  `cicd-telegram-notifications`.
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
