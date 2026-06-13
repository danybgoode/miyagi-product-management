---
title: "Unified CI/CD + Git event notifications (Telegram)"
slug: unified-cicd-notifications
status: shipped
area: "09"
type: chore
priority: wave-0
risk: low
epic: "09-platform-infra/cicd-telegram-notifications"
build_order: "#2"
updated: 2026-06-12
---

# Scope doc — Unified CI/CD + Git event notifications via Telegram

> **Status: APPROVED 2026-06-06** (Daniel signed off; epic location = new `Roadmap/09-platform-infra/` area; Vercel mechanism revised for free tier — see D5).
> Groomed 2026-06-06 (BUILD-ORDER #2). Class: **Chore / infra epic** (observability for the technical founder; no buyer/seller/agent-facing change).

---

## 1. Overview

**As a** technical founder, **I want** every code-movement and production-deploy event across both repos pushed into a single Telegram feed, **so that** I have one mobile-glanceable source of truth for ecosystem health — what shipped, where, and whether it succeeded — without watching three dashboards (GitHub, Vercel, GCP Cloud Build/Run).

This is **infra wiring, not a product feature.** It reuses the marketplace's existing Telegram bot and message style; it adds no commerce code and no user-facing surface.

## 2. Stage-2.5 bucket — can we already do this?

**Bucket 3 (genuinely new wiring), with heavy reuse.** The bot, token, chat plumbing, and message conventions already exist; what does **not** exist is any hook from the *delivery pipelines* into Telegram. The key reframe:

> **`apps/miyagisanchez/lib/telegram.ts` runs inside the Next.js app process.** It can observe *business* runtime events (a sale, a new shop, an offer) because those happen in a request handler. It **cannot** observe a git push, a Vercel deploy, or a Cloud Build run — those occur entirely outside the app. So "reuse the existing Telegram send primitive" means **reuse the bot + token + message style (HTML mode, emoji hierarchy, escaping)** — not call `tgNotify()` from CI. Each pipeline emits its own `sendMessage` call from its own execution context (GitHub Actions, Cloud Build/Pub-Sub, a Vercel webhook receiver), with the bot token re-provisioned into that platform's own secret store.

## 3. Decisions locked at grooming (Daniel, 2026-06-06)

| # | Decision | Implication |
|---|---|---|
| D1 | **Dedicated CI/CD channel** — new Telegram channel/topic, same bot | Deploy/ops noise stays out of the `@Don_Dany` private chat where sales/offers/new-shop pings live. A **second chat ID** (`TELEGRAM_CICD_CHAT_ID`) is provisioned into each pipeline's secret store. |
| D2 | **Both push + deploy-finished** | A "pushed to main" ping (instant) *and* a "deploy finished ✅/❌" ping (Vercel ~fast; Cloud Run ~12 min). Two messages per change, by design. |
| D3 | **Production only (main)** | Only main-branch pushes and their prod deploys notify. Preview/PR deploys stay silent (CI already polls them; Daniel watches PRs directly). |
| D4 | **HTML parse_mode** (resolves AC 3.2) | Standardize on Telegram **HTML** mode, matching `lib/telegram.ts`'s `esc()` (escape `& < >`). This sidesteps AC 3.2's MarkdownV2 character list (`_ * [ ] ` `) entirely — under HTML mode those characters are literal and need no escaping. One escaping rule, reused verbatim across all three pipelines. |
| D5 | **Vercel = API polling, not webhooks** (free tier) | We're on the Vercel **Hobby/free** plan; configurable account webhooks are **Pro-only** (confirmed 2026-06-06). So the prod-deploy-finish signal is obtained by **polling the Vercel API** from a GitHub Actions job for the production deployment matching the pushed commit SHA — the exact pattern already in `ci.yml`. No app route, no Vercel team config; **Sprint 3 drops to low-risk.** |

## 4. What already exists (reuse, don't rebuild)

- **`apps/miyagisanchez/lib/telegram.ts`** — `tgNotify(text)`: HTML `parse_mode`, fire-and-forget, 5 s `AbortSignal.timeout`, `esc()` for `& < >`, typed emoji-prefixed event helpers (🏪 📦 💳 ✅ ⚠️ 🧹). **The message-format house style to mirror** in every pipeline. The function itself is reusable *only* by the Vercel webhook receiver (slice 3), which runs in-app.
- **`TELEGRAM_BOT_TOKEN`** — the existing @BotFather bot (sends to `@Don_Dany`). **Same bot, new chat target.** Re-provision the token into GitHub Secrets (both repos), GCP Secret Manager, and (for the receiver) the frontend env.
- **Backend `apps/backend/cloudbuild.yaml`** — `build → push → deploy` to Cloud Run `medusa-web` (us-east4) on push to main. Substitutions `$SHORT_SHA`, `$PROJECT_ID`, `$_REGION`, `$_SERVICE` are available; Cloud Build publishes status to the **`cloud-builds` Pub/Sub topic** (the clean success-*and*-failure hook).
- **Frontend `apps/miyagisanchez/.github/workflows/ci.yml` + `browser-smoke.yml`** — GitHub Actions already wired; the push-notify workflow is a sibling addition. `ci.yml` already demonstrates resolving a Vercel deployment for a commit via the Vercel API (reusable pattern/token).
- **`apps/backend/infra/gcp/cicd-setup.sh` / `deploy.sh`** — where the Cloud Build trigger + Cloud Run env/secrets were provisioned; the GCP secret + Pub/Sub notifier wiring belongs in the same infra-as-script spirit.
- **Repos:** `danybgoode/miyagisanchezcommerce` (frontend) · `danybgoode/medusa-bonsai-backend` (backend).

## 5. Acceptance criteria (refined from the seed + decisions)

1. **AC1 — Push to main, both repos.** On any successful push to `main` of `miyagisanchezcommerce` **or** `medusa-bonsai-backend`, a message lands in the CI/CD channel: repo name · 📦 · short SHA · commit header · author handle · link to the commit diff.
2. **AC2 — Vercel prod deploy finished.** When a **production** Vercel deployment of the frontend reaches a terminal state, a message fires for **both** success (✅) and failure (❌): repo · 🚀 · short SHA · commit header · status · deploy/inspect URL. (Previews excluded — D3.)
3. **AC3 — Cloud Run deploy finished.** When the backend Cloud Build run reaches a terminal state, a message fires for **both** success (✅) and failure (❌): repo · 🚀 · short SHA · commit header · status · build-log URL.
4. **AC4 — Minimum payload (every message).** Repository name · shortened commit SHA · commit description/header · explicit success/failure status (where the event has one).
5. **AC5 — Enrichment (best-effort).** Markdown/HTML links to the GitHub commit diff, the Vercel deployment URL, or the GCP build-log window; author handle; branch target; build duration — included when cheaply available, never required.
6. **AC6 — HTML-safe.** All interpolated values pass through the shared `& < >` escape (D4) so a commit message can't break the Telegram layout.
7. **AC7 — Quiet failures / idempotency.** A Telegram outage **never** fails a build or blocks a deploy. The notify step is best-effort (timeout + swallow), exactly like `tgNotify`.
8. **AC8 — Zero hardcoding.** Bot token + CI/CD chat ID come only from GitHub Secrets / GCP Secret Manager / Vercel env. No secrets in `Roadmap/`, workflow YAML, or app code.

## 6. Architecture (per-platform, lean footprint)

Three pipelines, three native mechanisms — chosen so notification code stays out of the business apps' request paths (per AGENTS "lean footprint") and so success **and** failure are both observable:

| Trigger | Mechanism | Secret store | Notes |
|---|---|---|---|
| Push → main (both repos) | New GitHub Actions workflow `notify-telegram.yml`, `on: push: branches:[main]`, single curl step | GitHub Secrets (each repo) | `github` context gives SHA, message, author, commit URL for free. |
| Backend Cloud Run finish | Subscribe to the **`cloud-builds` Pub/Sub topic** with a tiny notifier (Cloud Function / small Cloud Run service) → Telegram | GCP Secret Manager | Trailing YAML steps **don't run on a failed build**, so a Pub/Sub subscriber is the only clean success-*and*-failure hook. |
| Vercel prod deploy finish | **GitHub Actions job polls the Vercel API** for the production deployment matching the pushed commit SHA, until terminal → curl Telegram | GitHub Secrets (`VERCEL_API_TOKEN` already exists) | Free-tier-safe (D5): configurable webhooks are Pro-only. Reuses `ci.yml`'s exact resolve-by-`meta.githubCommitSha` + poll-`state`/`readyState`-until-`READY`/`ERROR` loop, scoped to `target=production`. No app route, no Vercel team config. |

*Researched 2026-06-06 — Vercel **Hobby/free** plan does **not** include configurable webhooks (Pro-only), so the webhook receiver path is unavailable here; the API-poll pattern (already in `ci.yml`) is the free-tier mechanism. (Vercel docs: plans/hobby, webhooks; Fencode/Costbench 2026 plan-limit write-ups.)*

## 7. Sliced stories (skateboard → car)

**Proposed shape: one infra epic, 3 thin sprints** (each independently shippable + testable; platforms are independent with different secret stores and risk tiers).

### Sprint 1 — Push-to-main notifications, both repos *(the skateboard)*
- **S1.1** — *As Daniel, I want a Telegram ping when code lands on `main` of either repo, so I see movement instantly.* Add `notify-telegram.yml` (`on: push: branches:[main]`) to **both** repos; curl `sendMessage` with repo · 📦 · short SHA · header · author · commit-diff link (HTML-escaped). Provision `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CICD_CHAT_ID` into each repo's GitHub Secrets; create the dedicated CI/CD channel and capture its chat ID.
  - **Acceptance (Daniel):** push a trivial commit to each repo's `main` → within seconds the CI/CD channel shows a correctly-formatted, link-bearing message; a commit message containing `< > &` renders intact.
  - **QA/smoke:** no app code → no Playwright spec. Smoke = the manual push test above (workflow runs are the evidence). **Risk: low** (additive CI workflow, no commerce/app surface).

### Sprint 2 — Backend Cloud Run deploy-finished (✅/❌)
- **S2.1** — *As Daniel, I want a Telegram ping when the backend finishes deploying (or fails), so I know the ~12-min Cloud Run cycle's outcome without watching GCP.* Stand up the `cloud-builds` Pub/Sub notifier; forward success + failure with repo · 🚀 · short SHA · header · status · build-log link. Token from Secret Manager; wire alongside `infra/gcp/`.
  - **Acceptance (Daniel):** merge to backend `main` → on build success a ✅ message with a working build-log link; force a failing build → a ❌ message; a Telegram outage doesn't change the Cloud Run result.
  - **QA/smoke:** API/infra smoke owned by the agent (trigger a build, observe Pub/Sub → message); **Risk: high** (shared infra / GCP / deploy pipeline → Daniel merges).

### Sprint 3 — Vercel production deploy-finished (✅/❌)
- **S3.1** — *As Daniel, I want a Telegram ping when a production frontend deploy finishes (or errors), so the Vercel half matches the backend half.* Add a job to the frontend repo's `notify-telegram.yml` (running after the push ping) that polls the **Vercel API** for the `target=production` deployment matching `$GITHUB_SHA` (reusing `ci.yml`'s resolve + poll loop) until terminal, then curls Telegram with repo · 🚀 · short SHA · header · status · deploy/inspect URL. Token + CI/CD chat ID from GitHub Secrets; `VERCEL_API_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` already present.
  - **Acceptance (Daniel):** merge to frontend `main` → prod deploy finishes → a ✅ message with a working deploy URL; a failed prod build → ❌; a PR/preview deploy produces **no** message (D3).
  - **QA/smoke:** no app code → no Playwright spec; if a message-formatter helper is extracted it gets a pure-logic spec (free coverage). Smoke = the manual merge-to-main test above (workflow run is the evidence); live confirmation owed to Daniel. **Risk: low** (additive GHA job, no app/commerce surface, no Vercel config change).

*Enrichment (AC5) and the shared escape/formatter (AC6) are built into each slice's message, not a separate story.*

## 8. In / out of scope (v1)

**In:** push-to-main pings (both repos) · prod Vercel deploy finish (✅/❌) · Cloud Run deploy finish (✅/❌) · the dedicated CI/CD channel · the shared HTML escape + message style · secret provisioning across the three stores.

**Out (v1):** preview/PR deploy notifications (D3) · non-`main` branch pushes · PR-opened/merged/review events · test-suite pass/fail pings · alert routing/on-call/escalation · interactive bot commands (rollback-from-Telegram etc.) · any change to the existing business-event notifications in `lib/telegram.ts`.

## 9. AGENTS five-rule check

No commerce code (rule 1 N/A) · no Supabase tables (rule 2 N/A) · no UCP/MCP surface — internal observability only (rule 3 N/A) · Clerk untouched (rule 4 ✓) · **no user-facing strings** — all messages are internal ops text to Daniel, so the bilingual mandate (rule 5) does **not** apply (messages may be plain English/operational). Flag if Daniel wants them in Spanish anyway.

## 10. Open risks / notes

- **Epic location — DECIDED.** New infra area `Roadmap/09-platform-infra/cicd-telegram-notifications/` (the `Roadmap/` poster is product-only, so this infra epic sits outside macro-sections 01–08).
- **Cross-repo reality.** The two app repos are git-ignored in this monorepo and ship independently; S1's workflow + S2's GCP wiring + S3's GHA job land in **their own repos**, not here. Only this `Roadmap/` planning doc + the epic/sprint docs are tracked in the monorepo-root repo.
- **Pub/Sub notifier footprint (S2).** A tiny Cloud Function/Run service is new standing infra (small cost, an IAM binding, a deploy of its own). Acceptable for the clean failure path — flag if you'd rather accept "success-only via a trailing cloudbuild step" to avoid the extra service.
- **Vercel poll cost (S3).** The GHA poll job burns a few Actions minutes per main deploy while it waits for Vercel prod to go terminal (fast for the frontend). Negligible, but noted.
- **Secret sprawl.** The same bot token now lives in three more stores (GitHub Secrets ×2, GCP Secret Manager). Rotation means updating all of them — noted for the runbook.

## 11. Definition of Ready — checklist

- [x] "As a / I want / so that" clear; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (bucket 3, reuse-heavy).
- [x] v1 in/out boundary written; present-day Vercel facts researched + cited.
- [x] Reuse list produced (the app-runtime-vs-pipeline reframe is the core insight).
- [x] Each story risk-tiered; QA stage named; smoke owner identified.
- [x] **Daniel approved this scope doc** (2026-06-06) + epic location decided (§10) → epic/sprint docs scaffolded + committed under `09-platform-infra/cicd-telegram-notifications/`; 3 Claude Code kickoff prompts emitted.
