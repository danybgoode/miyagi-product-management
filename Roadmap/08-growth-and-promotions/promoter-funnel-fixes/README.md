---
status: planned
slug: promoter-funnel-fixes
---

# Epic: Promoter funnel fixes — `{url}` prompt, `/promotor/cerrar` 404, promoter-aware "Agente IA" sheet

> **Area:** 08-growth-and-promotions · **Risk:** low · **Type:** bug + light enhancement
> **Scope doc:** [`00-ideas/2. readyforscope/promoter-funnel-fixes.md`](../../00-ideas/2.%20readyforscope/promoter-funnel-fixes.md)
> **Status:** 📋 planned · approved 2026-07-01 · Promoter program (epic `promoter-program`) follow-up

## Why
Three cracks in the promoter recruit → close funnel: (1) the copy-paste "ask your AI" prompt on
`/vende/promotor` renders the literal `{url}` instead of a real URL, so a recruit's agent can't open it;
(2) `/vende/promotor` → `/promotor/cerrar` 404s (the route `notFound()`s when `promoter.enabled` is false),
dead-ending the primary CTA; and (3) the top-navbar "Agente IA" bottom-sheet offers the generic **buyer**
prompt on promoter/seller pages instead of a promoter/seller-onboarding one. All frontend copy + one pure
function + a flag confirmation — no commerce/money code.

## Medusa-first note
N/A — no commerce primitive. `{url}` is a wiring fix in `buildPromoterPageConfig`; the 404 is a flag/degrade
matter on an existing Clerk-gated route; the sheet is a new branch in the pure `lib/agent-prompt.ts` seam.
AGENTS rule #1 not engaged. Rule #5: all copy es-MX; the agent prompt stays es-MX only (not on the bilingual
allow-list).

## What already exists (reuse, don't rebuild)
- `lib/seller-acquisition.ts` `sellerTrustPrompt(id, template)` — the `{url}` → absolute-URL substitution
  the persona pages use; the promoter builder bypasses it. **Reuse.**
- `app/(shell)/vende/_components/page-config.ts` `buildPromoterPageConfig` — sets `trustPrompt` to the raw
  template; the one line to fix.
- `lib/flags.ts` `isEnabled('promoter.enabled')` — the existing gate; confirm its prod value + degrade path.
- `lib/agent-prompt.ts` (`AgentPromptContext`, `resolveAgentContext`, `buildAgentPrompt`, `PREAMBLE`) — the
  shipped contextual-agent-handoff seam; add a `seller`/`promoter` kind + es-MX `ask()`.
- `app/components/AIAgentButton.tsx` — the sheet UI (copy + `claude.ai/new?q=` deep-link); renders whatever the
  builder returns — **no UI change**.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Substitute the real URL into the `/vende/promotor` copy-paste prompt (both render sites) | low |
| 1 | Confirm `promoter.enabled` prod state; make the public promoter CTA degrade gracefully (never 404) | low + ops |
| 1 | Add `seller`/`promoter` context to `resolveAgentContext` + es-MX onboarding `ask()` | low |

## Deploy order
Frontend-only (`apps/miyagisanchez` → Vercel). No backend/Cloud Run, no migration. One PR; reviewer may
auto-merge on a green gate (low-risk). Story 2's flag confirmation is an ops step owed to Daniel (Flagsmith).

## Definition of Done (epic)
- [ ] All sprint-1 stories merged to `main` + smoke-tested (gaps stated)
- [ ] `sprint-1.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated (08 promoter line, if behavior changes)
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe)
- [ ] `promoter.enabled` prod state confirmed (Daniel); feature branch deleted
