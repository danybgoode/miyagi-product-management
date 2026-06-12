# 09 · Platform & Infra

> **What this is.** The home for **infra / tooling / observability** epics that keep the platform
> healthy but don't sit inside a buyer/seller/agent product journey (macro-sections 01–08). The
> product poster (`Roadmap/README.md`) stays product-only; this area holds the engineering-facing
> work that has its own scope, slices, and Definition of Done.

Status legend: ✅ Live · 🚧 In progress · 📋 Planned

## Epics

| Epic | In one line | Status |
|---|---|---|
| [backend-production-readiness](backend-production-readiness/) | Backend prod-readiness audit (staging · backups · recovery · monitoring · security · scaling) → hardening; opens with an audit spike that decides the staging platform | ✅ **All 5 sprints built 2026-06-12** — S0 audit · S1 staging (`medusa-web-staging` + Neon branch) · S2 backups (escrow LIVE + both restore drills) · S3 recovery (HTTP `/health` probes on prod + rollback runbook) · S4 monitoring (uptime + Cloud Run alert policies → `MiyagiDevopsTele` + Error Reporting + Dependabot + `deploy.sh` drift guard; staging-rehearsed). **Owed Daniel:** merge S4 PRs + prod monitoring provision |
| [cicd-telegram-notifications](cicd-telegram-notifications/) | Unified CI/CD + git-event notifications into a dedicated Telegram channel (push + prod-deploy finish, both repos) | 📋 Planned (groomed 2026-06-06) |
| [design-token-foundation](design-token-foundation/) | Harden + document the existing design-token foundation (token contract, locked/unlockable matrix, tokenize customer-facing surfaces, AA contrast + no-regression guard) — substrate for #6 | ✅ Shipped 2026-06-07 (PR #37; closed out — `token-contract.md` written, retro done; screenshot-diff owed to Daniel) |
| [feature-flags-killswitches](feature-flags-killswitches/) | Flagsmith as the platform's fail-open, admin-only, server-evaluated kill-switch layer — `checkout.stripe_enabled` enforced across UI + agents/UCP + checkout | ✅ Shipped 2026-06-06 (S1 PR #34 + S2 PR #9); further taxonomy deferred by decision |
