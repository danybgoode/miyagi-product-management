# Epic — Feature flags & kill-switches (Flagsmith)

> **Status: ✅ SHIPPED 2026-06-06** (S1 frontend PR #34 + S2 backend PR #9, both merged). `checkout.stripe_enabled`
> is a true fail-open kill-switch enforced across UI + agents/UCP + direct checkout. Future taxonomy
> (other rails, `checkout.global_pause`, `routing.*`, A/B) **deferred by decision** — the foundation is
> proven and cheap to extend on demand (see [RETROSPECTIVE](RETROSPECTIVE.md)). S2 post-deploy toggle
> smoke owed to Daniel.

**Macro-section:** 09 · Platform & Infra
**Class:** Infra / platform tooling (operational control for the founder; gates buyer/seller surfaces but is not itself a product journey).
**Scope doc / decision:** [`Roadmap/00-ideas/2. readyforscope/spikeflagsmith.md`](../../00-ideas/2.%20readyforscope/spikeflagsmith.md) — spike **investigated + GO signed off 2026-06-06**.

## Why

A backend deploy is ~12 min (no preview); a frontend deploy is fast but still a deploy. When a payment
rail or a feature misbehaves in production, the founder needs to **turn it off from a dashboard in
seconds, without shipping code**. Today blast-radius control is ad-hoc (presence checks, the homegrown
theme toggle). This epic stands up **Flagsmith** as the platform's **fail-open, admin-only,
server-evaluated kill-switch layer** — and makes the `LEARNINGS.md` "gate new behaviour on a flag" rule
first-class.

## Context (from the spike)

| | |
|---|---|
| **Instance** | Flagsmith **SaaS** (`app.flagsmith.com`), project `miyagisanchezmarketplace` (id 39767, org 30549) |
| **Environments** | Production (`YWCRELpbn2VJn32ijkan27`) · Development (`UmCgZPX5RCzP7qjHZowE4K`) — both empty until this epic |
| **Keys staged** | `apps/miyagisanchez/.env.local`: `FLAGSMITH_ENVIRONMENT_KEY` (server, Dev), `NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY` (Dev client), `FLAGSMITH_ADMIN_API_TOKEN` (REST/tooling). ⚠️ **Production server-side key to be generated before go-live.** |
| **SDK** | `flagsmith-nodejs` — **local in-process evaluation** (~0 ms/request, periodic env-doc refresh; request volume ≠ eval volume → SaaS free 50K/mo is ample) |

## Non-negotiable design rules

1. **Fail-open.** Every flag read falls back to a hardcoded `DEFAULT_FLAGS` map. Flagsmith being
   unreachable must **never** block a request (especially checkout). The default for a kill-switch is
   **enabled** (i.e. the feature stays on if the flag service is down).
2. **Admin-only, environment-level.** No per-identity traits, no per-shop segments in v1. Global flag
   state, cached.
3. **Server-evaluated.** Evaluate in server code; no client SDK in v1 (avoids a round-trip + flash).

## Medusa-first / five-rule check (AGENTS)

Rule 1 (Medusa owns commerce): **respected** — the kill-switch *filters* the payment options Medusa
returns at the frontend proxy seam; it does not reimplement availability logic. Rule 2 (Supabase): N/A
(no new tables). Rule 3 (UCP/MCP): the v1 slice gates the **human** checkout proxy only; the UCP
checkout-session path is a noted follow-up (it calls the backend directly). Rule 4 (Clerk): untouched.
Rule 5 (bilingual): N/A — a kill-switch **hides** an option; it adds no user-facing copy.

## Scope

| Sprint | Story | What it ships | Risk | Status |
|---|---|---|---|---|
| [S1](sprint-1.md) | US-1 | `flagsmith-nodejs` + `lib/flags.ts` (fail-open, local eval) + **`checkout.stripe_enabled`** at the frontend checkout-options proxy, flip-without-deploy | **HIGH** | ✅ Merged (PR #34) + live-smoked |
| [S2](sprint-2.md) | US-1 | **Backend enforcement** — `src/lib/flags.ts` + gate in `resolveSellerPaymentMethods` (catalog → agents/UCP) + `start-checkout` 422; makes the kill *real* (closes review finding #1) | **HIGH** | ✅ Merged (PR #9); deploy in flight |

**Future sprints (taxonomy from the spike §3 — not yet scoped/approved):** the rest of the checkout-rail
kill-switches + `checkout.global_pause`; `agent.mcp_write_enabled`, `shipping.envia_enabled`,
`messaging.realtime_enabled`, `ai_assistant_enabled`, embed/support widget switches; the
`routing.*` switches **(these touch `middleware.ts` — highest blast radius, separate sprint)**; and the
gradual-rollout gates (`buyer_protection_escrow`, standardizing `personalized_products`). A/B is
**deferred** (no product-analytics tool is wired — see spike §5).

## Risk

**HIGH when built** — the layer touches **shared request surface** (`middleware.ts` / `layout.tsx`) and
**checkout rail selection** (money). Per `WAYS-OF-WORKING.md`, **Daniel merges**. S1 is deliberately
scoped to the **checkout-options proxy seam** (not middleware) to keep the proving slice low-blast-radius
and previewable; the `routing.*` switches that touch middleware come in a later, separately-approved
sprint.

## Definition of Done (epic)

- [x] S1 merged + **live-smoked green** (flip in Flagsmith → Stripe rail disappears, no deploy → flip back).
- [x] S2 merged (backend enforcement); Cloud Run deploy in flight + secret provisioned. **Post-deploy toggle smoke owed to Daniel** (gap stated — toggle touches live prod payments).
- [x] `sprint-1.md` + `sprint-2.md` have fool-proof smoke walkthroughs + status ticked with refs.
- [x] This `README.md` marked ✅; [`RETROSPECTIVE.md`](RETROSPECTIVE.md) written.
- [x] **Poster note:** infra (no `Roadmap/README.md` line) — `09-platform-infra/README.md` flipped to ✅.
- [x] Team memory + `LEARNINGS.md` updated (fail-open flag pattern + tooling gotchas).
- [x] Branches deleted; both PRs merged.
