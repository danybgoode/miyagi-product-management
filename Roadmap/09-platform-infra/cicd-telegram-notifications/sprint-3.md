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
- [ ] Done —

---

## Sprint QA
- **Green gate:** no app code → no `tsc`/`build`/Playwright change; if a message-formatter helper is extracted, add a pure-logic spec.
- **Smoke:** the manual merge-to-main test (success); a forced failing prod build (❌); a PR to confirm silence.
- **Owed to Daniel:** the live merge-to-main confirmation.
- **Risk: LOW** (additive GHA job, no app/commerce surface, no Vercel config change). Reviewer may auto-merge on a clean run.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: GitHub + Vercel (prod) + Telegram (CI/CD channel)

1. Merge a trivial change to `main` of `miyagisanchezcommerce`.
   → When the Vercel **production** deploy reaches READY, the CI/CD channel shows `🚀 miyagisanchezcommerce · <short SHA> · <commit header> · ✅ READY` with a working deploy URL.
2. Open a PR (which produces a Vercel **preview** deploy).
   → **No** message appears in the CI/CD channel for the preview (production-only, D3).
3. Force a failing production build (a temporary build-breaking commit on `main`).
   → The CI/CD channel shows `❌ ERROR` with the inspect URL.

**Money/auth path:** none. **Owed to Daniel:** the live merge confirmation.

If any step fails, note the step number + what you saw — that's the bug report.
