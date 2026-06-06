# Build order — the agreed grooming queue

> **What this is.** When Daniel drops a *batch* of prioritized asks (the backlog keeps growing), we
> first **agree a consolidated build order**, then **groom one ask per session** down that order (the
> `groom` skill, Stage 9 — "backlog cadence"). This file is the **persisted queue** so any fresh
> session can pick up where the last left off without re-deriving the order from chat.
>
> **How to use it.** At the end of each groom run, the just-groomed item is ticked here and the
> **next-session handoff prompt** (bottom of this file) points at the next ⬜ item. Re-order freely as
> new information lands — this is a living queue, not a contract.

_Last updated: 2026-06-06 (after grooming #3a)._

## The agreed order (consolidated from the 2026-06-06 backlog dump)

Seven raw asks collapsed into four real groups; sequenced so the cheap enablers de-risk everything
after them, the UX audit is refreshed before anything it drives is sliced, and #5/#6 are treated as
downstream of #3 + #4.

### Wave 0 — Enablers (parallelizable; unblock everything)
- ✅ **#1 · Flagsmith spike** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/spikeflagsmith.md`. Class: spike → written decision. **Next action: Claude Code investigation session** (handoff prompt was emitted at groom time).
- ✅ **#2 · Unified CI/CD + Git event notifications via Telegram** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/unifiedcdcinotificationsystem.md`. Class: chore/infra epic. Scaffolded under new area `09-platform-infra/cicd-telegram-notifications/` (3 sprints: push both repos · Cloud Run finish · Vercel prod finish). Vercel mechanism = API poll (free tier, no webhooks). **Next action: Claude Code build, Sprint 1 first** (kickoff prompts emitted at groom time).
- ✅ **#4 · Design-token / design-system foundation** — *groomed + signed off 2026-06-06.* Reconcile confirmed it's an **update, not a rebuild**: Design System v2 tokens (`globals.css`) + the seasonal theme engine already ship the bulk; the seeds were largely already-done. Scoped tightly (Daniel) to **foundation hardening + a documented token contract** — palette library + designer submission portal deferred. Scope: `2. readyforscope/design-token-foundation.md`. Class: chore/foundation. Scaffolded under `09-platform-infra/design-token-foundation/` (3 sprints: token contract · tokenize customer-facing surfaces · AA contrast + no-regression guard; all low-risk). **Next action: Claude Code build, Sprint 1 first** (kickoff prompts emitted at groom time). Substrate for #6.

### Wave 1 — Refresh the lens
- ✅ **#3a · UX audit refresh** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/ux-audit-refresh.md`. Class: **spike** (read-only re-audit → written findings + re-scope delta, no build). Scoped (Daniel) to: **all 5 domains weighted** (deep on 02/03/05, light on 01/04), deliverable = **refreshed findings + explicit re-scope deltas** for #3b/#5/#6/#3c that update this file, and **re-check old findings + audit the new surfaces** (personalized products, subdomains, short-links, support widget, custom-domain checkout). Refreshed docs land in `ux-audit/results-refresh-2026-06/` (v1 baseline kept). **Next action: Claude Code spike investigation session** (kickoff prompt in the scope doc) — *do NOT scaffold an epic*; the findings re-scope the waves below.

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

> **Sequencing note.** #3a is *groomed + signed off* but the spike itself hasn't *run* yet — and its
> whole purpose is to re-scope #3b. So the next step is **not** to groom #3b blind; it's to **run the
> #3a spike investigation first** (Claude Code, read-only, no build), then groom #3b off the refreshed
> findings. The two prompts below are in order.

**Step 1 — run the #3a spike (Claude Code, read-only investigation, no branch/build):**
the kickoff prompt lives in `Roadmap/00-ideas/2. readyforscope/ux-audit-refresh.md` (bottom section).
It produces refreshed findings in `ux-audit/results-refresh-2026-06/01–05` + a re-scope delta that
edits this file (sharpens the #3b/#5/#6/#3c lines).

**Step 2 — once the spike's findings have landed, groom the next ⬜ item (#3b) in a fresh Cowork session:**
```
We're working the agreed build order in Roadmap/00-ideas/BUILD-ORDER.md.
The last groomed item was #3a (UX audit refresh) — a spike, signed off; its investigation has now run
and the refreshed findings live in Roadmap/00-ideas/2. readyforscope/ux-audit/results-refresh-2026-06/.

Groom the next ⬜ item: #3b · Checkout & manual-payment state hardening.
Read first, in order: Roadmap/00-ideas/BUILD-ORDER.md, then Stage 0 orientation
(Roadmap/README.md, Roadmap/WAYS-OF-WORKING.md, Roadmap/LEARNINGS.md), then the refreshed audit
findings (results-refresh-2026-06/02, 03, 05) and the #3a re-scope delta. #3b is the money path:
durable buyer_reported_paid, block-ship-before-paid, coupon-vs-CTA total mismatch — high-risk,
Daniel merges. Then run /groom on #3b — one ask, the normal stages — and stop at the scope-doc gate
for my sign-off.
```
