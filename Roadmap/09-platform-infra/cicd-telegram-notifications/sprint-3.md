# Sprint 3 — Vercel production deploy-finished (✅/❌)

Mirrors S2 for the frontend. On Vercel **Hobby/free**, configurable webhooks are Pro-only (D5), so we
poll the Vercel API from a GitHub Actions job — reusing the exact resolve-by-commit-SHA + poll loop that
`ci.yml` already runs for previews, scoped to `target=production`.

---

## US-1 — Vercel prod deploy-finished ping
**As** Daniel, **I want** a Telegram ping when a production frontend deploy finishes (or errors), **so that** the Vercel half matches the backend half.
- Add a job to the frontend repo's `notify-telegram.yml` (after the S1 push ping) that:
  - Polls `GET /v6/deployments?projectId=…&teamId=…&target=production` for the deployment whose `meta.githubCommitSha == $GITHUB_SHA` (reuse `ci.yml`'s `jq` resolve), looping on `state`/`readyState` until `READY` / `ERROR` / `CANCELED`.
  - On terminal state, `curl` Telegram with **repo · 🚀 · short SHA · commit header · status (✅ READY / ❌ ERROR) · deploy/inspect URL** (HTML-escaped).
- Uses `VERCEL_API_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` (already in the repo) + `TELEGRAM_*` secrets. No app route, no Vercel dashboard config (AC8, D5).
- **Previews stay silent** — the poll is scoped to `target=production` (D3).
- Quiet failure: a Telegram/poll hiccup never blocks anything; cap the poll with a timeout (AC7).
- **Acceptance (Daniel):** merge to frontend `main` → prod deploy finishes → a ✅ message with a working deploy URL; a failed prod build → ❌; opening a PR (preview deploy) produces **no** message.
- [ ] Done — implementation added as the `vercel-production-deploy` job in frontend `.github/workflows/notify-telegram.yml`; live merge/deploy evidence is collected after the workflow reaches `main`.

---

## Sprint QA
- **Green gate:** no app code → no `tsc`/`build`/Playwright change. Static verification is workflow YAML/Bash validation plus the workflow diff. No formatter helper was extracted, so no pure-logic spec is needed.
- **Smoke:** the manual merge-to-main test (success); a forced failing prod build (❌); a PR to confirm preview silence.
- **Owed to Daniel:** the live merge-to-main confirmation.
- **Risk: LOW** (additive GHA job, no app/commerce surface, no Vercel config change). Reviewer may auto-merge on a clean run.

## SPRINT SMOKE WALKTHROUGH
Env: GitHub + Vercel (prod) + Telegram (CI/CD channel)

1. In GitHub repo `miyagisanchezcommerce`, confirm secrets/vars are present for `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CICD_CHAT_ID`.
   → The names exist as GitHub Secrets or repo Variables; no secret values are visible or copied into source control.
2. Merge a trivial change to `main` of `miyagisanchezcommerce`.
   → Workflow `Notify Telegram` starts, sends the existing push ping, then job `Vercel production deploy notification` polls Vercel for `target=production` and `meta.githubCommitSha == <merge SHA>`.
3. Wait for the Vercel **production** deploy to reach `READY`.
   → The CI/CD channel shows `miyagisanchezcommerce · 🚀 · <short SHA>` plus the commit header, `✅ READY`, and a working production deploy URL.
4. Open a PR or push a non-main branch that produces a Vercel **preview** deploy.
   → No deploy-finished message appears in the CI/CD channel for the preview, because the workflow runs only on `main` pushes and the API query is scoped to `target=production`.
5. Force a failing production build with a temporary build-breaking commit on `main` only if Daniel chooses to exercise the failure path.
   → The CI/CD channel shows the same message shape with `❌ ERROR` or `❌ CANCELED` and a deploy URL when Vercel returns a terminal failure state.
6. Confirm failure isolation.
   → A Vercel API polling hiccup or Telegram outage logs/skips inside the GitHub Actions job, but does not affect the actual Vercel deployment outcome.

**Money/auth path:** none. **Owed to Daniel:** the live merge confirmation.

If any step fails, note the step number + what you saw — that's the bug report.
