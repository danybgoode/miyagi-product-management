# Sprint 1 — Push-to-main notifications (both repos) · the skateboard

Establishes the dedicated CI/CD channel, the shared HTML message style, and the secret wiring — the
foundation S2/S3 build on. GitHub Actions only; no app/commerce code.

**Status:** ✅ SHIPPED 2026-06-06 — `.github/workflows/notify-telegram.yml` merged to `main` in **both**
repos (frontend + `medusa-bonsai-backend`). **Owed to Daniel (operational):** create the dedicated CI/CD
channel + capture `TELEGRAM_CICD_CHAT_ID`, and the live push test — the workflows skip cleanly until those
secrets exist.

---

## Step 0 — Dedicated CI/CD channel + secrets (Daniel + agent)
- **Daniel (Telegram):** create the dedicated CI/CD channel/topic; add the existing bot; capture its chat ID.
- **Agent:** add `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CICD_CHAT_ID` as **GitHub Secrets in both repos** (`miyagisanchezcommerce`, `medusa-bonsai-backend`).
- **Acceptance:** a manual `curl` to `sendMessage` with the new chat ID lands in the CI/CD channel.
- [ ] Done — **owed to Daniel:** create the CI/CD channel/topic, add the bot, and capture `TELEGRAM_CICD_CHAT_ID`. The workflows skip cleanly until `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CICD_CHAT_ID` exist as GitHub Secrets in both repos.

---

## US-1 — Push-to-main ping, both repos
**As** Daniel, **I want** a Telegram ping the moment code lands on `main` of either repo, **so that** I see movement instantly without watching GitHub.
- Add `.github/workflows/notify-telegram.yml` to **both** repos, `on: push: branches: [main]`.
- Single step: `curl` `https://api.telegram.org/bot<token>/sendMessage` (HTML parse_mode) with **repo name · 📦 · short SHA · commit header · author handle · commit-diff link**, all HTML-escaped (`& < >`).
- Best-effort / quiet failure: the step must not fail the workflow if Telegram is unreachable (`|| true` + short timeout) — AC7.
- Secrets only from GitHub Secrets — no token in YAML (AC8).
- **Acceptance (Daniel):** push a trivial commit to each repo's `main` → within seconds the CI/CD channel shows a correctly-formatted, link-bearing message; a commit message containing `< > &` renders intact.
- [ ] Done — implementation added in `.github/workflows/notify-telegram.yml` for both repos; live workflow-run evidence is collected after Step 0 secrets are present and a push lands on `main`.

---

## Sprint QA
- **Green gate:** no app code → no `tsc`/`build`/Playwright change. Static verification is the workflow diff; the post-merge `notify-telegram.yml` run is the runtime evidence.
- **Smoke:** the two manual push tests below (one per repo), after the dedicated channel and per-repo secrets exist.
- **Owed to Daniel:** creating the channel + reading its chat ID (Step 0); the live push test.
- **Risk: LOW** (additive CI workflow, no app/commerce surface). Reviewer may auto-merge on a clean run.

## SPRINT SMOKE WALKTHROUGH
Env: GitHub + Telegram (the new CI/CD channel)

1. In Telegram, confirm the dedicated CI/CD channel exists and the bot is a member.
   → You can see the channel; the bot is listed as a member/admin.
2. In GitHub, confirm both repos have repository secrets named `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CICD_CHAT_ID`.
   → No secret value is visible in GitHub; both secret names exist in `miyagisanchezcommerce` and `medusa-bonsai-backend`.
3. Make a trivial commit on `main` of `miyagisanchezcommerce` with a commit header containing `< > &`, then push.
   → The workflow run appears at `https://github.com/danybgoode/miyagisanchezcommerce/actions/workflows/notify-telegram.yml` and completes green.
4. Check the Telegram CI/CD channel.
   → Within ~10 s the channel shows `miyagisanchezcommerce · 📦 · <short SHA>` plus the commit header, `@author`, and a working commit-diff link; the repo/sha use Telegram HTML formatting and `< > &` render intact.
5. Make a trivial commit on `main` of `medusa-bonsai-backend` with a commit header containing `< > &`, then push.
   → The workflow run appears at `https://github.com/danybgoode/medusa-bonsai-backend/actions/workflows/notify-telegram.yml` and completes green.
6. Check the Telegram CI/CD channel again.
   → The same message format appears for `medusa-bonsai-backend`, with escaped `< > &` and a working commit-diff link.
7. Temporarily remove or rename `TELEGRAM_CICD_CHAT_ID` in one repo only if you want to test the failure policy.
   → The workflow logs a skip and still completes green; restore the secret immediately after.

If any step fails, note the step number + what you saw — that's the bug report. Steps 1-2 and the first live push are owed to Daniel because the agent cannot create the Telegram channel or observe the private channel message without the new chat ID.
