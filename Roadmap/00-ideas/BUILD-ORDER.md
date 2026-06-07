# Build order — the agreed grooming queue

> **What this is.** When Daniel drops a *batch* of prioritized asks (the backlog keeps growing), we
> first **agree a consolidated build order**, then **groom one ask per session** down that order (the
> `groom` skill, Stage 9 — "backlog cadence"). This file is the **persisted queue** so any fresh
> session can pick up where the last left off without re-deriving the order from chat.
>
> **How to use it.** At the end of each groom run, the just-groomed item is ticked here and the
> **next-session handoff prompt** (bottom of this file) points at the next ⬜ item. Re-order freely as
> new information lands — this is a living queue, not a contract.

_Last updated: 2026-06-06 (after grooming + signing off #5b — buyer notifications — with Devoluciones folded into v1)._

## The agreed order (consolidated from the 2026-06-06 backlog dump)

Seven raw asks collapsed into four real groups; sequenced so the cheap enablers de-risk everything
after them, the UX audit is refreshed before anything it drives is sliced, and #5/#6 are treated as
downstream of #3 + #4.

### Wave 0 — Enablers (parallelizable; unblock everything)
- ✅ **#1 · Flagsmith spike** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/spikeflagsmith.md`. Class: spike → written decision. **Next action: Claude Code investigation session** (handoff prompt was emitted at groom time).
- ✅ **#2 · Unified CI/CD + Git event notifications via Telegram** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/unifiedcdcinotificationsystem.md`. Class: chore/infra epic. Scaffolded under new area `09-platform-infra/cicd-telegram-notifications/` (3 sprints: push both repos · Cloud Run finish · Vercel prod finish). Vercel mechanism = API poll (free tier, no webhooks). **Next action: Claude Code build, Sprint 1 first** (kickoff prompts emitted at groom time).
- ✅ **#4 · Design-token / design-system foundation** — *groomed + signed off 2026-06-06.* Reconcile confirmed it's an **update, not a rebuild**: Design System v2 tokens (`globals.css`) + the seasonal theme engine already ship the bulk; the seeds were largely already-done. Scoped tightly (Daniel) to **foundation hardening + a documented token contract** — palette library + designer submission portal deferred. Scope: `2. readyforscope/design-token-foundation.md`. Class: chore/foundation. Scaffolded under `09-platform-infra/design-token-foundation/` (3 sprints: token contract · tokenize customer-facing surfaces · AA contrast + no-regression guard; all low-risk). **Next action: Claude Code build, Sprint 1 first** (kickoff prompts emitted at groom time). Substrate for #6.

### Wave 1 — Refresh the lens
- ✅ **#3a · UX audit refresh** — *groomed + signed off 2026-06-06; **spike now RUN, findings landed 2026-06-06**.* Scope: `2. readyforscope/ux-audit-refresh.md`. Class: **spike** (read-only re-audit → written findings + re-scope delta, no build). Deliverable landed in `ux-audit/results-refresh-2026-06/` (v1 baseline kept): refreshed 01–05 + a cross-cutting **`00-rescope-delta.md`**. Pinned to `origin/main` (frontend `ed447bd`, backend `0980253`). **Outcome:** all three #3b money-path P0s reproduce on current `main`; **no new P0 jumps the queue**; two reuse hooks found (a `paymentSettled` predicate already computed; the print flow already persists a `payment_reported` flag) → #3b is cheaper than v1 implied. *(Audit-env note: the working tree was on stale branches 48 commits behind `main` — findings were re-read from `origin/main`.)* No epic scaffolded — the deltas re-scope the waves below.

### Wave 2 — Highest-value product (driven by the refreshed audit)
- ✅ **#3b · Checkout & manual-payment state hardening** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/checkout-state-hardening.md`. Class: Feature/epic (money-path hardening). Scaffolded under `02-checkout-and-payments/checkout-state-hardening/` (**3 sprints**: S1 durable manual-payment state machine · S2 block-ship-before-paid UI+server · S3 one coupon-aware total + trust polish). Daniel's calls: **all 02 P1s in v1** (preview-before-placement + async-success recovery), refund-language **copy-only fix in #3b**, 3 sprints. **All stories HIGH-risk — Daniel merges each.** Reuse hooks confirmed: `paymentSettled` predicate (re-point at shipping) + the print `payment_reported` pattern (mirror, Medusa-first). **Next action: Claude Code build, Sprint 1 first** (kickoff prompts emitted at groom time).
- ✅ **#5 · Granular multi-channel notifications (Email + Telegram)** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/granular-notifications.md`. Class: Feature/epic. **Sellers-first.** Scaffolded under `05-trust-offers-and-messaging/granular-notifications/` (**3 sprints**: S1 dispatch seam + Supabase prefs/link tables + settings grid (email/push; TG stub) · S2 Telegram seller channel — `/start` deep-link + webhook linking, `tgNotify`→`tgSend`, unlink + test · S3 ⛔ blocked-by #3b: wire durable `buyer_reported_paid` → seller across channels + complete Payments group + bilingual polish). Daniel's calls: sellers-first · per-channel + event-group toggles · unify only in-scope events · include `buyer_reported_paid` (blocked-by #3b). **All stories HIGH-risk — Daniel merges.** Reuse confirmed: email (`lib/email.ts`) + push (`lib/notify.ts`) channels already ship; net-new is the Telegram *user* channel + the preference layer; `tgNotify` generalizes to `tgSend`. **Dependency: Sprints 1–2 run in parallel with #3b; Sprint 3 blocked-by #3b.** **Next action: Claude Code build, Sprint 1 first** (kickoff prompts emitted at groom time).
- ✅ **#5b · Buyer Telegram channel + buyer preference center** — *groomed + signed off 2026-06-06.* Scope: `2. readyforscope/buyer-notifications.md`. Class: Feature/epic — a **pure EXTENSION of #5** to the buyer audience. Scaffolded under `05-trust-offers-and-messaging/buyer-notifications/` (**2 sprints**: S1 buyer prefs + `dispatchToBuyer` seam + `app/account/notificaciones` grid + guest-safe routing · S2 buyer Telegram link/deliver/unlink+test + polish). Daniel's calls: **signed-in buyers only** (prefs/TG are `clerk_user_id`-keyed; guests keep today's emails) · **Compras email mandatory** (forced-on in the resolver) · event-groups **Compras/Envíos/Ofertas/Devoluciones** (Devoluciones folded in at sign-off) · settings at **new `app/account/notificaciones`**. Reuse confirmed: #5's seam + pure resolver, the two Supabase tables (audience-namespaced keys, no new table), `tgSend`, the `/start` linking webhook, the settings-grid component, every buyer email sender, `app/account` shell. **All stories HIGH-risk — Daniel merges.** **Hard dependency: #5** (build after it merges); **#3b is only a soft vocabulary alignment** (buyer money events are already-firing emails). **Next action: Claude Code build, Sprint 1 first** (kickoff prompts emitted at groom time).

### Wave 3 — Surfaces
- ⬜ **#6 · Sellers landing page redesign** — sits on the #4 design tokens (redesigning before tokens = rework). **New constraint (from #3a):** make it **channel-aware** — the storefront now renders white-label across subdomain / custom-domain / short-link / embed, so add a **per-channel trust-signal audit** to discovery.
- ⬜ **#3c · Remaining audit polish** — discovery listing-type taxonomy (`lib/listings.ts` already normalizes `listing_type` — head start), mobile filter rebuild, PDP hierarchy, CP-first capture, quote recovery/timeout, the in-chat shared transaction ledger (**consumes #3b's durable state, doesn't re-model it**) — plus items #3b defers: **assisted multi-step refund state machine** + **pickup reserved-slot scheduling**. **Product decision owed (pre-#3c):** arranged-only delivery policy (`onlyCoordinated = false` is hardcoded). Sliced as domain epics.

### Wave 4 — New capability (orientation first)
- ⬜ **#7 · Ticket & event management** — spike first (Stage 2.5): how much is already servable via `listing_type` (events) + sweepstakes + print-social primitives before committing to an epic.

---

## Next-session handoff prompt (paste into a fresh Cowork session)

> **State.** #3a (spike) is *run + landed*; **#3b, #5 and #5b are all *groomed + signed off +
> scaffolded*** (#3b: 3 sprints under `02-checkout-and-payments/checkout-state-hardening/`; #5: 3
> sprints under `05-trust-offers-and-messaging/granular-notifications/`; #5b: 2 sprints under
> `05-trust-offers-and-messaging/buyer-notifications/`; kickoff prompts emitted for all three). Threads
> now open: **(A) BUILD #3b**, **(B) BUILD #5** (S1–2 parallel with #3b; S3 blocked-by #3b), **(C) BUILD
> #5b** (after #5 merges — it extends #5's seam/tables/`tgSend`/webhook/grid), and **(D) GROOM the next
> ⬜ item, #6** (sellers landing page redesign) in a fresh Cowork session. All high-risk → Daniel merges.

**Thread A — build #3b (Claude Code):** start Sprint 1 (durable manual-payment state machine). Kickoff
prompt: read `AGENTS.md` + `WAYS-OF-WORKING.md` + `LEARNINGS.md`, then
`Roadmap/02-checkout-and-payments/checkout-state-hardening/README.md` + `sprint-1.md`; branch
`feat/checkout-state-hardening`; build one story at a time; backend-first deploy; Daniel merges.

**Thread B — build #5 (Claude Code):** start Sprint 1 (dispatch seam + prefs/link tables + settings
grid). Kickoff prompt: read `AGENTS.md` + `WAYS-OF-WORKING.md` + `LEARNINGS.md`, then
`Roadmap/05-trust-offers-and-messaging/granular-notifications/README.md` + `sprint-1.md`; branch
`feat/granular-notifications`; build one story at a time; Supabase migration first; Daniel merges.
**Sprints 1–2 run in parallel with #3b; Sprint 3 is blocked-by #3b** (it imports #3b's
`buyer_reported_paid` from `lib/manual-payment-state.ts`).

**Thread C — build #5b (Claude Code), AFTER #5 has merged:** start Sprint 1 (buyer seam + prefs grid +
guest-safe routing). Kickoff prompt: read `AGENTS.md` + `WAYS-OF-WORKING.md` + `LEARNINGS.md`, then
`Roadmap/05-trust-offers-and-messaging/buyer-notifications/README.md` + `sprint-1.md`; branch
`feat/buyer-notifications`; build one story at a time; **reuse #5's seam/resolver/tables/`tgSend`/webhook/
grid — extend, don't rebuild**; Daniel merges. (No #3b gate — buyer money events are already-firing emails.)

**Thread D — groom the next ⬜ item (#6) in a fresh Cowork session:**
```
We're working the agreed build order in Roadmap/00-ideas/BUILD-ORDER.md.
The last groomed item was #5b (buyer Telegram channel + buyer preference center) — signed off +
scaffolded, signed-in-buyers-only, Devoluciones folded in.

Groom the next ⬜ item: #6 · Sellers landing page redesign.
Read first, in order: Roadmap/00-ideas/BUILD-ORDER.md, then Stage 0 orientation
(Roadmap/README.md, Roadmap/WAYS-OF-WORKING.md, Roadmap/LEARNINGS.md), then the #4 design-token scope
(2. readyforscope/design-token-foundation.md) and its epic, plus the #3a re-scope delta
(2. readyforscope/ux-audit/results-refresh-2026-06/00-rescope-delta.md).
Key points: #6 sits on the #4 design tokens (redesigning before tokens = rework), and the #3a refresh
added a constraint — make it CHANNEL-AWARE (storefront now renders white-label across subdomain /
custom-domain / short-link / embed), so include a per-channel trust-signal audit in discovery.
Then run /groom on #6 — one ask, the normal stages — and stop at the scope-doc gate for my sign-off.
```
