# Epic — Unified CI/CD + Git event notifications via Telegram

**Macro-section:** 09 · Platform & Infra
**Class:** Chore / infra (observability for the technical founder; no buyer/seller/agent-facing change).
**Scope doc:** [`Roadmap/00-ideas/seeds/unified-cicd-notifications.md`](../../00-ideas/seeds/unified-cicd-notifications.md) — APPROVED 2026-06-06.

## Why

Code movement and deploy outcomes are spread across three dashboards (GitHub, Vercel, GCP Cloud
Build/Run). This epic funnels them into a **single, mobile-glanceable Telegram feed** so Daniel sees —
in one place — what shipped, where, and whether it succeeded. Pure observability; no commerce code.

## Context

| | |
|---|---|
| **Repos** | `danybgoode/miyagisanchezcommerce` (frontend) · `danybgoode/medusa-bonsai-backend` (backend) |
| **Frontend deploy** | Vercel **Hobby/free** — prod on push to `main`, fast; per-branch previews |
| **Backend deploy** | Cloud Build trigger `backend-main-deploy` (us-east4) → Cloud Run `medusa-web`, ~12 min, no preview |
| **Bot** | Existing @BotFather bot (`TELEGRAM_BOT_TOKEN`); today it pings Daniel's private `@Don_Dany` chat from `lib/telegram.ts` |

## Decisions (Daniel, 2026-06-06)

1. **Dedicated CI/CD channel** — new Telegram channel/topic (same bot, new `TELEGRAM_CICD_CHAT_ID`), so deploy noise stays out of the business-event chat (sales/offers/new-shop).
2. **Both push + deploy-finished** — a "pushed to main" ping *and* a "deploy finished ✅/❌" ping per change.
3. **Production only (main)** — no preview/PR-deploy notifications.
4. **HTML parse_mode** — reuse `lib/telegram.ts`'s `esc()` (`& < >`); sidesteps the MarkdownV2 escaping list entirely.
5. **Vercel = API polling, not webhooks** — configurable webhooks are Vercel **Pro-only**; on free tier we poll the Vercel API from a GitHub Actions job (the `ci.yml` pattern). No app route, no Vercel team config.

## Medusa-first note

N/A — no commerce surface. The AGENTS five-rule check (scope doc §9): rules 1–3 N/A (no commerce / no
Supabase / no UCP-MCP), rule 4 (Clerk) untouched, rule 5 (bilingual) does **not** apply — messages are
internal ops text to Daniel, not user-facing copy.

## What already exists (reuse, don't rebuild)

- **`apps/miyagisanchez/lib/telegram.ts`** — the **message-format house style**: HTML mode, `esc()` for `& < >`, fire-and-forget with a 5 s timeout, emoji prefixes (📦 🚀 ✅ ❌ ⚠️). The *function* is reusable only in-app; CI pipelines mirror the **style**, not the call.
- **`TELEGRAM_BOT_TOKEN`** — same bot, re-provisioned into GitHub Secrets (×2) + GCP Secret Manager.
- **`apps/miyagisanchez/.github/workflows/ci.yml`** — already resolves a Vercel deployment by `meta.githubCommitSha` and polls `state`/`readyState` until terminal; **S3 reuses this exact loop** (scoped to `target=production`). Sibling workflow pattern for S1.
- **`apps/backend/cloudbuild.yaml`** — `build → push → deploy`; substitutions `$SHORT_SHA`/`$PROJECT_ID`/`$_REGION`/`$_SERVICE`; Cloud Build publishes status to the **`cloud-builds` Pub/Sub topic** (the clean success+failure hook for S2).
- **`apps/backend/infra/gcp/cicd-setup.sh` / `deploy.sh`** — where the trigger + Cloud Run env/secrets were provisioned; S2's secret + Pub/Sub notifier wiring belongs in the same infra-as-script spirit.

## Scope (3 sprints)

| Sprint | Story | What it ships | Risk |
|---|---|---|---|
| [S1](sprint-1.md) | US-1 | Push-to-main Telegram ping, **both repos** (`notify-telegram.yml`) + the dedicated channel + secret provisioning | LOW |
| [S2](sprint-2.md) | US-1 | Backend **Cloud Run** deploy-finished ✅/❌ via `cloud-builds` Pub/Sub notifier | HIGH |
| [S3](sprint-3.md) | US-1 | Frontend **Vercel prod** deploy-finished ✅/❌ via GHA API-poll job | LOW |

**Deploy order:** independent — ship in any order. S1 is the skateboard (establishes channel + format +
secret wiring), so build it first. S2 and S3 then attach the two deploy-finish halves.

## Definition of Done (epic)

- [ ] All three sprints' stories merged + smoke-tested (gaps stated); the dedicated CI/CD channel is live and receiving push + both deploy-finish events.
- [ ] Each `sprint-N.md` has its fool-proof smoke walkthrough + status ticked with commit refs.
- [ ] This `README.md` marked ✅; `RETROSPECTIVE.md` written.
- [ ] **Poster note:** this is infra (no product-poster feature line); add a one-line entry to `09-platform-infra/README.md` (✅) instead of `Roadmap/README.md`.
- [ ] Team memory updated (deploy-topology note: bot token now in GitHub Secrets ×2 + GCP Secret Manager; rotation runbook).
- [ ] `Roadmap/LEARNINGS.md` updated with any durable learning (e.g. the app-runtime-vs-pipeline distinction; Vercel free-tier webhook limit).
- [ ] Feature branches deleted; PRs merged.
