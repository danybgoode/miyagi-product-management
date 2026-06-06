# Sprint 2 — Backend Cloud Run deploy-finished (✅/❌)

The backend's ~12-min Cloud Build → Cloud Run cycle has no preview; this gives Daniel its terminal
outcome in Telegram. Cloud Build stops on first failure, so a trailing YAML step can't catch failures —
we subscribe to the `cloud-builds` Pub/Sub topic, the clean success-*and*-failure hook.

---

## Step 0 — GCP secret + Pub/Sub plumbing (agent, Daniel authorizes)
- Store `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CICD_CHAT_ID` in **GCP Secret Manager** (no hardcoding — AC8).
- Confirm Cloud Build publishes build status to the **`cloud-builds`** Pub/Sub topic (default) for the `backend-main-deploy` trigger.
- **Acceptance:** the secret exists; the topic receives a message on a backend build.
- [ ] Done —

---

## US-1 — Cloud Run deploy-finished ping
**As** Daniel, **I want** a Telegram ping when the backend finishes deploying (or fails), **so that** I know the outcome of the ~12-min Cloud Run cycle without watching GCP.
- Stand up a tiny notifier (Cloud Function / small Cloud Run service) subscribed to `cloud-builds`.
- Filter to the backend trigger's builds; on a **terminal** status, send Telegram with **repo · 🚀 · short SHA · commit header · status (✅ SUCCESS / ❌ FAILURE) · build-log URL** (HTML-escaped).
- Resolve the commit header/SHA from the build's source/substitutions (`$SHORT_SHA`; commit message via the build's `sourceProvenance`/substitutions or a lightweight git lookup).
- Quiet failure: a Telegram outage must never affect the build/deploy result (AC7). Wire alongside `infra/gcp/` scripts so the setup is reproducible.
- **Acceptance (Daniel):** merge to backend `main` → on build success a ✅ message with a working build-log link; force a failing build → a ❌ message; confirm a Telegram outage doesn't change the Cloud Run result.
- [ ] Done —

---

## Sprint QA
- **Green gate:** the notifier service is its own small unit; add a pure-logic test on the formatter (Pub/Sub `cloud-builds` payload → expected message) if a helper is extracted.
- **Smoke:** agent triggers a backend build and observes Pub/Sub → message (success + a forced failure).
- **Owed to Daniel:** authorizing the GCP secret + new service deploy; the live merge-to-main confirmation.
- **Risk: HIGH** (shared infra / GCP / deploy pipeline) → **Daniel merges.** Announce the cloudbuild/infra change.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: GCP (Cloud Build/Run) + Telegram (CI/CD channel)

1. Merge a trivial change to `main` of `medusa-bonsai-backend` (triggers `backend-main-deploy`).
   → When the build/deploy reaches SUCCESS, the CI/CD channel shows `🚀 medusa-bonsai-backend · <short SHA> · <commit header> · ✅ SUCCESS` with a working build-log link.
2. Trigger a deliberately failing build (e.g. a temporary build-breaking commit on `main`).
   → The CI/CD channel shows the same line with `❌ FAILURE` and a build-log link to the failure.
3. (resilience) With the notifier briefly unreachable, run a build.
   → The Cloud Run deploy still completes normally; only the Telegram message is missing.

**Money/auth path:** none. **Owed to Daniel:** GCP authorization + the live build tests (he holds GCP access).

If any step fails, note the step number + what you saw — that's the bug report.
