# 09 · Platform & Infra

> **What this is.** The home for **infra / tooling / observability** epics that keep the platform
> healthy but don't sit inside a buyer/seller/agent product journey (macro-sections 01–08). The
> product poster (`Roadmap/README.md`) stays product-only; this area holds the engineering-facing
> work that has its own scope, slices, and Definition of Done.

Status legend: ✅ Live · 🚧 In progress · 📋 Planned

## Epics

| Epic | In one line | Status |
|---|---|---|
| [cicd-telegram-notifications](cicd-telegram-notifications/) | Unified CI/CD + git-event notifications into a dedicated Telegram channel (push + prod-deploy finish, both repos) | 📋 Planned (groomed 2026-06-06) |
| [design-token-foundation](design-token-foundation/) | Harden + document the existing design-token foundation (token contract, locked/unlockable matrix, tokenize customer-facing surfaces, AA contrast + no-regression guard) — substrate for #6 | 📋 Planned (groomed 2026-06-06) |
| [feature-flags-killswitches](feature-flags-killswitches/) | Flagsmith as the platform's fail-open, admin-only, server-evaluated kill-switch layer (S1: `checkout.stripe_enabled` at the checkout-options proxy, flip-without-deploy) | 🚧 In progress (spike GO 2026-06-06) |
