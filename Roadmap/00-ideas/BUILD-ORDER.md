# Build order — the grooming queue + build status

> **What this is.** The persisted queue for the batch of asks Daniel dropped on 2026-06-06. We agree a
> consolidated order, then groom one ask per session down it. This file is the at-a-glance **status board**;
> the real detail lives in each item's seed (`seeds/<slug>.md`) and its scaffolded epic.
>
> **Legend:** ✅ done · 🏗️ building · 📋 ready to build (groomed + scaffolded, not started) · ⬜ not groomed
>
> _Last updated: 2026-06-08 — reconciled the `plan/seller-acquisition-landing-pages` branch into `main`
> (brought #6, #7, #3c epics onto the flattened `seeds/` structure) and rewrote this board to true state._

## TL;DR — where we are

- **The original batch (#1–#7) is fully groomed + scaffolded. The grooming queue is empty** — new grooming = brand-new asks.
- **Building now / next (Claude Code):** **#7 Sprint 2** (assigned to **Codex**, not started) → #7 S3; and **#3c is ready for assignment in full** (Spike 0 + Epics A/B/C/D).
- **In progress (this Cowork track):** process improvement — `00-ideas` flattened to `seeds/` + frontmatter, the groom scaffolder, the Notion projection, and this branch reconciliation.

---

## The agreed order (status)

### Wave 0 — Enablers
- ✅ **#1 · Flagsmith spike** → `09-platform-infra/feature-flags-killswitches/`
- ✅ **#2 · Unified CI/CD + Telegram notifications** → `09-platform-infra/cicd-telegram-notifications/`
- ✅ **#4 · Design-token / design-system foundation** → `09-platform-infra/design-token-foundation/` (epic complete)

### Wave 1 — Refresh the lens
- ✅ **#3a · UX audit refresh** (spike) → findings in `audits/results-refresh-2026-06/`; seed `seeds/ux-audit-refresh.md`

### Wave 2 — Highest-value product
- ✅ **#3b · Checkout & manual-payment state hardening** → `02-checkout-and-payments/checkout-state-hardening/`
- ✅ **#5 · Granular multi-channel notifications** → `05-trust-offers-and-messaging/granular-notifications/` (epic complete)
- ✅ **#5b · Buyer Telegram channel + preference center** → `05-trust-offers-and-messaging/buyer-notifications/` (epic complete)

### Wave 3 — Surfaces
- ✅ **#6 · Seller-acquisition landing pages** → `08-growth-and-promotions/seller-acquisition-landing-pages/` · seed `seeds/seller-acquisition-landing-pages.md`
  **Complete — all 4 sprints shipped to prod 2026-06-07** (S1 lock · S2 `/vende/mundial` PR #42 · S3 anchor `/vende` + Creator PR #44 · S4 `/vende/negocios`+`/vende/servicios`+SEO/OG+A/B PR #45). *Doc close-out done 2026-06-10 (had been left 🏗️ despite shipping — see RETROSPECTIVE + LEARNINGS).*
- 📋 **#3c · Remaining audit polish** — *all sub-items deep-groomed + scaffolded; ready for assignment.* Umbrella seed `seeds/remaining-audit-polish.md`. Build order: **Spike 0 → A → C → D, with B**.
  - 📋 **Spike 0 · Arranged-only delivery policy** (decision) — seed `seeds/spike-arranged-only-delivery.md`. Blocks Epic B's arranged-only slice (B.5) only.
  - 📋 **Epic A · Discovery polish** (01) → `01-discovery-and-shopping/discovery-polish/` (3 sprints)
  - 📋 **Epic B · Delivery & manual-money polish** (02) → `02-checkout-and-payments/delivery-money-polish/` (3 sprints; S1/S2 HIGH) · seed `seeds/delivery-money-polish.md`
  - 📋 **Epic C · Trust & messaging polish** (05) → `05-trust-offers-and-messaging/trust-messaging-polish/` (2 sprints) · seed `seeds/trust-messaging-polish.md`
  - 📋 **Epic D · Cross-channel storefront trust parity** (07) → `07-agentic-and-federated-commerce/cross-channel-trust-parity/` (1 sprint; **blocked-by C.4** — build Epic C Sprint 2 first) · seed `seeds/cross-channel-trust-parity.md`

### Wave 4 — New capability
- 🏗️ **#7 · Ticket & event management** → `10-events-and-ticketing/events-and-ticketing/` · seed `seeds/spike-ticket-event-management.md`
  Spike run → promoted to an epic (3 sprints: S1 paid admission · S2 free RSVP · S3 shared per-attendee ticket primitive + check-in). **S1 deployed. → NEXT: Sprint 2 (assigned to Codex, not started) → Sprint 3.**

---

## Process improvement (this Cowork track) — 🏗️ in progress
Not part of the feature batch; tracked here so it isn't lost.
- ✅ `00-ideas` flattened to `seeds/` + `audits/`; lifecycle now in seed **frontmatter** (`seeds/process-scaffolding-and-00-ideas.md`, `00-ideas/README.md`).
- ✅ Groom scaffolder + templates (`skills/groom/scaffold-epic.mjs`, `skills/groom/templates/`).
- ✅ One-way docs→Notion projection (`scripts/roadmap-to-notion.mjs`; "Marketplace Roadmap" DB) — seed `seeds/notion-roadmap-sync.md`.
- ✅ Branch reconciliation: `plan/...` grooming merged onto `main` (this update).
- 📋 **Cross-agent code review** (advisory second-opinion command, Codex/Antigravity) → `09-platform-infra/cross-agent-code-review/` · seed `seeds/cross-agent-code-review.md` · groomed + scaffolded 2026-06-10 · 1 sprint, all LOW — **ready to build**.
- ⬜ Deferred (not now): full doc↔code audit (verify every epic's ✅ claims against shipped code).

---

## New asks (groomed post-batch)
- 📋 **PWA Liquid-Glass Nav Polish** → `09-platform-infra/pwa-liquid-glass-nav-polish/` · seed
  `seeds/pwa-liquid-glass-nav-polish.md` · groomed + scaffolded 2026-06-13 · 2 sprints (compressible to 1),
  all LOW — **ready to build**. Frontend-only PWA bottom-bar restyle + bottom-sheet search; **knowingly
  reverses two nav-reorg decisions** (detached search + Favoritos-as-tab) → epic close must reconcile the
  nav-reorg docs + poster.

---

## Next actions

**Builds — Claude Code (work the docs on `main`):**
- **#7 Sprint 2** (Codex) — read `AGENTS.md` + `WAYS-OF-WORKING.md` + `LEARNINGS.md`, then `Roadmap/10-events-and-ticketing/events-and-ticketing/README.md` + `sprint-2.md`; branch `feat/events-and-ticketing` (or continue it) off latest `main`; build one story at a time; HIGH stories → Daniel merges. Then Sprint 3.
- **#3c** — run **Spike 0** first (`seeds/spike-arranged-only-delivery.md`, written decision, no code), then build **Epic A**, then **Epic C** → **Epic D** (D.2 needs C.4), and **Epic B** (B.5 waits on Spike 0). One Claude Code session per epic; kickoffs per `SESSION-KICKOFFS.md` §2.

**Grooming — Cowork:** the batch queue is **empty**. Bring a **new ask** with the standard groom kickoff (`SESSION-KICKOFFS.md` §1). One ask per session; it lands a seed in `seeds/<slug>.md` (frontmatter `status: ready`), and on approval the scaffolder builds the epic.
