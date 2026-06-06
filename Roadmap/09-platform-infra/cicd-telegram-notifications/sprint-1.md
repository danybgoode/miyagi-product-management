# Sprint 1 — Push-to-main notifications (both repos) · the skateboard

Establishes the dedicated CI/CD channel, the shared HTML message style, and the secret wiring — the
foundation S2/S3 build on. GitHub Actions only; no app/commerce code.

---

## Step 0 — Dedicated CI/CD channel + secrets (Daniel + agent)
- **Daniel (Telegram):** create the dedicated CI/CD channel/topic; add the existing bot; capture its chat ID.
- **Agent:** add `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CICD_CHAT_ID` as **GitHub Secrets in both repos** (`miyagisanchezcommerce`, `medusa-bonsai-backend`).
- **Acceptance:** a manual `curl` to `sendMessage` with the new chat ID lands in the CI/CD channel.
- [ ] Done —

---

## US-1 — Push-to-main ping, both repos
**As** Daniel, **I want** a Telegram ping the moment code lands on `main` of either repo, **so that** I see movement instantly without watching GitHub.
- Add `.github/workflows/notify-telegram.yml` to **both** repos, `on: push: branches: [main]`.
- Single step: `curl` `https://api.telegram.org/bot<token>/sendMessage` (HTML parse_mode) with **repo name · 📦 · short SHA · commit header · author handle · commit-diff link**, all HTML-escaped (`& < >`).
- Best-effort / quiet failure: the step must not fail the workflow if Telegram is unreachable (`|| true` + short timeout) — AC7.
- Secrets only from GitHub Secrets — no token in YAML (AC8).
- **Acceptance (Daniel):** push a trivial commit to each repo's `main` → within seconds the CI/CD channel shows a correctly-formatted, link-bearing message; a commit message containing `< > &` renders intact.
- [ ] Done —

---

## Sprint QA
- **Green gate:** no app code → no `tsc`/`build`/Playwright change. The workflow run is the evidence.
- **Smoke:** the two manual push tests above (one per repo).
- **Owed to Daniel:** creating the channel + reading its chat ID (Step 0); the live push test.
- **Risk: LOW** (additive CI workflow, no app/commerce surface). Reviewer may auto-merge on a clean run.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: GitHub + Telegram (the new CI/CD channel)

1. In Telegram, confirm the dedicated CI/CD channel exists and the bot is a member.
   → You can see the channel; the bot is listed as a member/admin.
2. Make a trivial commit on `main` of `miyagisanchezcommerce` (e.g. tweak a comment) and push.
   → Within ~10 s the CI/CD channel shows: `📦 miyagisanchezcommerce · <short SHA> · <commit header> · <author>` with a working commit-diff link.
3. Repeat on `main` of `medusa-bonsai-backend`.
   → The same message format appears for the backend repo.
4. Push a commit whose message contains `< > &`.
   → The message renders with those characters intact (no broken Telegram layout).

If any step fails, note the step number + what you saw — that's the bug report.
