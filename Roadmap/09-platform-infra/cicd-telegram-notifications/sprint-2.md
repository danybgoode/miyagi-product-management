# Sprint 2 — Backend Cloud Run deploy-finished (✅/❌)

The backend's ~12-min Cloud Build → Cloud Run cycle has no preview; this gives Daniel its terminal
outcome in Telegram. Cloud Build stops on first failure, so a trailing YAML step can't catch failures —
we subscribe to the `cloud-builds` Pub/Sub topic, the clean success-*and*-failure hook.

---

## Step 0 — GCP secret + Pub/Sub plumbing (agent, Daniel authorizes)
- Store `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CICD_CHAT_ID` in **GCP Secret Manager** (no hardcoding — AC8).
- Confirm Cloud Build publishes build status to the **`cloud-builds`** Pub/Sub topic (default) for the `backend-main-deploy` trigger.
- **Acceptance:** the secret exists; the topic receives a message on a backend build.
- [ ] Done — implementation is reproducible via `apps/backend/infra/gcp/deploy-cicd-telegram-notifier.sh`; **owed to Daniel:** authorize/apply GCP changes, create/update the two Secret Manager secrets, and confirm the live `cloud-builds` event.

---

## US-1 — Cloud Run deploy-finished ping
**As** Daniel, **I want** a Telegram ping when the backend finishes deploying (or fails), **so that** I know the outcome of the ~12-min Cloud Run cycle without watching GCP.
- Stand up a tiny notifier (Cloud Function / small Cloud Run service) subscribed to `cloud-builds`.
- Filter to the backend trigger's builds; on a **terminal** status, send Telegram with **repo · 🚀 · short SHA · commit header · status (✅ SUCCESS / ❌ FAILURE) · build-log URL** (HTML-escaped).
- Resolve the commit header/SHA from the build's source/substitutions (`$SHORT_SHA`; commit message via the build's `sourceProvenance`/substitutions or a lightweight git lookup).
- Quiet failure: a Telegram outage must never affect the build/deploy result (AC7). Wire alongside `infra/gcp/` scripts so the setup is reproducible.
- **Acceptance (Daniel):** merge to backend `main` → on build success a ✅ message with a working build-log link; force a failing build → a ❌ message; confirm a Telegram outage doesn't change the Cloud Run result.
- [ ] Done — notifier package added at `apps/backend/infra/gcp/cicd-telegram-notifier/`; live success/failure evidence is collected after Daniel applies the GCP deploy.

---

## Sprint QA
- **Green gate:** notifier unit tests cover Pub/Sub payload parsing, trigger/repo/status filtering, HTML escaping, success/failure message formatting, GitHub commit-header lookup, and Telegram failure swallowing.
- **Smoke:** after GCP authorization, trigger a backend build and observe Pub/Sub → Telegram message (success + a forced failure).
- **Owed to Daniel:** authorizing the GCP secret + new service deploy; the live merge-to-main confirmation.
- **Risk: HIGH** (shared infra / GCP / deploy pipeline) → **Daniel merges.** Announce the cloudbuild/infra change: new Gen2 Cloud Function subscribed to `cloud-builds`, Secret Manager access for `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CICD_CHAT_ID`, and a narrow runtime service account.

## SPRINT SMOKE WALKTHROUGH
Env: GCP (Cloud Build/Run) + Telegram (CI/CD channel)

1. In GCP Secret Manager, confirm `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CICD_CHAT_ID` exist in project `miyagisanchezback-497722`.
   → Both secret names exist; no secret values are printed or copied into source control.
2. From the backend repo, deploy the notifier with `bash infra/gcp/deploy-cicd-telegram-notifier.sh`.
   → The script discovers regional trigger `backend-main-deploy`, creates/uses service account `cicd-telegram-notifier`, grants it access to only the Telegram secrets, and deploys Gen2 function `cicd-telegram-build-notifier` in `us-east4`.
3. In GCP, inspect function `cicd-telegram-build-notifier`.
   → It has a Pub/Sub trigger on topic `cloud-builds`, env filter values for `medusa-bonsai-backend`, `main`, and the discovered backend trigger ID, and Secret Manager-backed env vars for the Telegram token/chat ID.
4. Merge a trivial backend change to `main` of `medusa-bonsai-backend` to trigger `backend-main-deploy`.
   → When the Cloud Build/Cloud Run deploy reaches `SUCCESS`, the CI/CD Telegram channel shows `medusa-bonsai-backend · 🚀 · <short SHA>` plus the commit header, `✅ SUCCESS`, and a working build-log link.
5. Trigger a deliberately failing backend build under the same backend trigger.
   → The CI/CD Telegram channel shows the same message shape with `❌ FAILURE` (or the terminal failure status such as `❌ TIMEOUT`) and a working build-log link to the failed build.
6. Confirm deploy isolation.
   → A Telegram outage or missing chat target is logged by the notifier, but the backend Cloud Build/Cloud Run result is unchanged because the notifier is a separate Pub/Sub subscriber and does not run inside `cloudbuild.yaml`.
7. Optional rollback check.
   → Deleting the function with `gcloud functions delete cicd-telegram-build-notifier --gen2 --region=us-east4 --project=miyagisanchezback-497722` removes notifications only; the backend Cloud Build trigger and Cloud Run service remain intact.

**Money/auth path:** none. **Owed to Daniel:** GCP authorization + the live build tests (he holds GCP access).

If any step fails, note the step number + what you saw — that's the bug report.
