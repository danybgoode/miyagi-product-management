# Unified CI/CD + Telegram notifications — Retrospective

_Closed: 2026-06-06_

**Area:** 09 · Platform & Infra · **Class:** chore/infra (observability for the technical founder) ·
**Risk:** low (S2 HIGH — touches backend deploy infra) · 3 sprints, both repos. **BUILD-ORDER #2.**
Shipped to prod 2026-06-06. No commerce/buyer/seller/agent surface touched.

## What shipped
A single, mobile-glanceable Telegram feed for code movement + deploy outcomes across GitHub, Vercel, and
GCP Cloud Build/Run — so Daniel sees what shipped, where, and whether it succeeded, in one place.

- **S1 — push-to-main pings, both repos.** `.github/workflows/notify-telegram.yml` in `miyagisanchezcommerce`
  **and** `medusa-bonsai-backend`, `on: push: [main]`: repo · 📦 · short SHA · commit header · author ·
  diff link, HTML-escaped (`& < >`), best-effort (`|| true` + timeout), secrets only from GitHub Secrets.
- **S2 — backend Cloud Run deploy-finished ✅/❌** (`76c8639`). Cloud Build stops on first failure, so a
  trailing YAML step can't catch failures — instead a notifier subscribes to the `cloud-builds` **Pub/Sub**
  topic (`infra/gcp/cicd-telegram-notifier/` + `deploy-cicd-telegram-notifier.sh`, with a `node:test`), the
  clean success-*and*-failure hook for the ~12-min, no-preview backend cycle.
- **S3 — frontend Vercel-prod deploy-finished ✅/❌.** On Vercel Hobby/free, configurable webhooks are
  Pro-only, so a GHA job polls the Vercel API (reusing `ci.yml`'s resolve-by-commit-SHA + poll loop, scoped
  to `target=production`) and pings terminal state.

## What went well
- **Reuse the message *style*, not the call.** `lib/telegram.ts` (HTML mode, `esc()` for `& < >`,
  fire-and-forget) is the house format — but it's an *app-runtime* function. The CI pipelines mirror its
  **style** (emoji prefixes, HTML escaping) without importing it; the function stays in-app, the format is
  shared by convention. Keeping that distinction clean avoided dragging app code into the pipeline.
- **Pub/Sub is the right backend deploy hook.** Because Cloud Build aborts on first failure, only the
  `cloud-builds` topic carries both outcomes — a trailing build step would miss every failure.
- **Fail-quiet by construction.** Every notify step is best-effort (`|| true` + short timeout) and the
  workflows **skip cleanly** when the secrets are absent, so the feature can land dark and light up the
  moment Daniel provisions the channel.

## What we learned
- **Reuse a notification *format*, not the runtime function, across the app/pipeline boundary** — an
  in-app `lib/telegram.ts` can't be called from a GitHub Action; mirror its HTML/escaping style in the
  pipeline instead of importing it. → promoted to `LEARNINGS.md`.
- **Vercel configurable webhooks are Pro-only; on free tier, poll the Vercel API from a GHA job** (reuse the
  existing `ci.yml` resolve-by-SHA + poll loop, scoped to `target=production`). → promoted to `LEARNINGS.md`.
- **Cloud Build aborts on first failure, so subscribe to the `cloud-builds` Pub/Sub topic for a
  success-AND-failure deploy hook** — a trailing cloudbuild.yaml step can only report success.

## Gaps / follow-ups
- **Owed to Daniel (operational, not code):** create the dedicated CI/CD Telegram channel/topic, add the
  bot, capture `TELEGRAM_CICD_CHAT_ID`, and set it + `TELEGRAM_BOT_TOKEN` as GitHub Secrets in both repos —
  then the live push + both deploy-finish confirmations. The workflows skip cleanly until then.
- **Team memory** (deploy-topology note + bot-token rotation runbook) lives outside the monorepo-root repo;
  left for Daniel / the next session to fold into `MEMORY.md`.
