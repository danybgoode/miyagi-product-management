# Build order — the agreed grooming queue

> **What this is.** When Daniel drops a *batch* of prioritized asks (the backlog keeps growing), we
> first **agree a consolidated build order**, then **groom one ask per session** down that order (the
> `groom` skill, Stage 9 — "backlog cadence"). This file is the **persisted queue** so any fresh
> session can pick up where the last left off without re-deriving the order from chat.
>
> **How to use it.** At the end of each groom run, the just-groomed item is ticked here and the
> **next-session handoff prompt** (bottom of this file) points at the next ⬜ item. Re-order freely as
> new information lands — this is a living queue, not a contract.

_Last updated: 2026-06-06._

## The agreed order (consolidated from the 2026-06-06 backlog dump)

Seven raw asks collapsed into four real groups; sequenced so the cheap enablers de-risk everything
after them, the UX audit is refreshed before anything it drives is sliced, and #5/#6 are treated as
downstream of #3 + #4.

### Wave 0 — Enablers (parallelizable; unblock everything)
- ✅ **#1 · Flagsmith spike** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/spikeflagsmith.md`. Class: spike → written decision. **Next action: Claude Code investigation session** (handoff prompt was emitted at groom time).
- ✅ **#2 · Unified CI/CD + Git event notifications via Telegram** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/unifiedcdcinotificationsystem.md`. Class: chore/infra epic. Scaffolded under new area `09-platform-infra/cicd-telegram-notifications/` (3 sprints: push both repos · Cloud Run finish · Vercel prod finish). Vercel mechanism = API poll (free tier, no webhooks). **Next action: Claude Code build, Sprint 1 first** (kickoff prompts emitted at groom time).
- ⬜ **#4 · Design-token / design-system foundation** — foundation. **← next to groom.** Seeds: `2. readyforscope/Themingsystem.md`, `MiyagiSanchezxDesignerN.md`. **Reconcile first** with the already-shipped `08/seasonal-theme-engine` (memory: `seasonal_theme_engine.md`, `project_design_system.md`) — likely *update*, not rebuild. Substrate for #6.

### Wave 1 — Refresh the lens
- ⬜ **#3a · UX audit refresh** — re-run the 5 audit docs (`2. readyforscope/ux-audit/results/01–05`) against current `main` (personalized products, subdomains, short-links, support widget all postdate them). Planning input that re-scopes #5/#6. (Ignore the older `00-ideas/ux-uiaudit/` set.)

### Wave 2 — Highest-value product (driven by the refreshed audit)
- ⬜ **#3b · Checkout & manual-payment state hardening** — the audit P0s (durable `buyer_reported_paid`, block-ship-before-paid, coupon-total mismatch). Money path, high-risk, biggest trust win.
- ⬜ **#5 · Granular multi-channel notifications (Email + Telegram)** — feature. Downstream of the #3 checkout/trust findings; reuses the existing Telegram send primitive. Sequences right behind #3b (manual-payment events are the canonical triggers).

### Wave 3 — Surfaces
- ⬜ **#6 · Sellers landing page redesign** — sits on the #4 design tokens (redesigning before tokens = rework).
- ⬜ **#3c · Remaining audit polish** — discovery listing-type taxonomy, CP-first shipping, the in-chat shared transaction ledger — sliced as domain epics.

### Wave 4 — New capability (orientation first)
- ⬜ **#7 · Ticket & event management** — spike first (Stage 2.5): how much is already servable via `listing_type` (events) + sweepstakes + print-social primitives before committing to an epic.

---

## Next-session handoff prompt (paste into a fresh Cowork session)

```
We're working the agreed build order in Roadmap/00-ideas/BUILD-ORDER.md.
The last groomed item was #2 (Unified CI/CD + Telegram notifications) — signed off + scaffolded
under Roadmap/09-platform-infra/cicd-telegram-notifications/ (ready for Claude Code build, Sprint 1 first).

Groom the next ⬜ item: #4 · Design-token / design-system foundation.
Read first, in order: Roadmap/00-ideas/BUILD-ORDER.md, then Stage 0 orientation
(Roadmap/README.md, Roadmap/WAYS-OF-WORKING.md, Roadmap/LEARNINGS.md), then the scope seeds
Roadmap/00-ideas/2. readyforscope/Themingsystem.md and MiyagiSanchezxDesignerN.md.
IMPORTANT (per BUILD-ORDER): reconcile FIRST with the already-shipped 08/seasonal-theme-engine
(team memory: seasonal_theme_engine.md, project_design_system.md) — this is likely an *update*,
not a rebuild. Then run /groom on #4 — one ask, the normal stages — and stop at the scope-doc gate for my sign-off.
```
