---
status: ready
slug: contextual-agent-handoff
---

# Epic: Navigation polish — contextual AI-agent handoff + AI/theme icon disambiguation

> **Area:** 07 · Agentic & Federated Commerce · **Risk:** low · **Scope doc:** [`00-ideas/2. readyforscope/contextual-agent-handoff.md`](../../00-ideas/2.%20readyforscope/contextual-agent-handoff.md)

> **Approved by Daniel 2026-06-25.** Two parts, one small epic (both touch the navbar chrome): make the
> "Compra con tu agente IA" card **Spanish + contextual per page**, and give the **seasonal/designer theme**
> feature its own icon (`flask`) so it stops sharing the AI **sparks** glyph.

## Why
The AI handoff card (opened from the navbar AI icon) ships one hardcoded, half-English prompt regardless of
where the user is. A shopper on a product page should be able to open it and copy a prompt that already
carries *that* product, so their agent can pick up seamlessly. The agent already resolves listings/shops over
UCP/MCP, so the prompt only has to hand it the **canonical URL** (with human-readable title/price/shop as a
readability nicety). Separately, the seasonal/designer theme toggle currently borrows the same **sparks**
icon as the AI feature — two features, one glyph — so the theme toggle moves to **flask** and AI keeps sparks
(the industry-standard AI glyph).

## Context (Daniel's grooming calls — 2026-06-25)
| Decision | Call |
|---|---|
| Icon split | Theme toggle → `flask`; AI keeps `sparks` (`flask-solid` if preferred + present) |
| Sections (v1) | PDP · Catalog/search · Shop · Account/orders (homepage/other = generic) |
| Prompt data | URL **+ human-readable details** (title/price/shop) — not bare URL, not full payload |
| Language | **es-MX only** (no bilingual closing line; not added to the allow-list) |

## Medusa-first note
**No commerce, no DB, no backend.** Client-side UI/copy only. AGENTS five rules: 1 N/A (no commerce
code — we only read the URL), 2 N/A (no table), **3 reinforced** (the prompt hands the agent a canonical
URL it resolves via existing UCP/MCP — no new agent surface/manifest change), 4 untouched (Clerk),
**5 satisfied** — the prompt is es-MX-only and stays **off** the bilingual allow-list.

## What already exists (reuse, don't rebuild) — verified 2026-06-25
- `app/components/AIAgentButton.tsx` — the card: sheet UI, copy-to-clipboard, `claude.ai/new?q=…`
  deep-link, 3 variants (`icon`/`affordance`/`search`). Only its **prompt source** changes (constant → builder).
- `app/components/AgentHandoff.tsx` — **already does contextual order/refund prompts** (takes a `prompt`
  prop). The proven shape the account/orders story reuses.
- `app/components/PlatformShell.tsx` (L116/126/237) — mount points; server/static, so Sprint-2 rich
  context flows through a **client** `AgentContext` island, not the shell.
- `app/components/PlatformThemeToggle.tsx` (L46/85, `const icon = 'iconoir-sparks'`) — the one-line swap.
- `app/layout.tsx` L106 — iconoir CDN `@main`; `iconoir-flask` confirmed valid.
- Routes for detection: `(shell)/l/[id]` (PDP) · `/l` (catalog) · `/s/[slug]` (shop) · `(site)/page.tsx` (home).
- `app/(shell)/agent/page.tsx` + `/api/ucp/*` — the briefing every prompt's preamble points the agent at.

## Scope — stories
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | Theme toggle → flask; AI keeps sparks | low | ⬜ ready |
| 1 | Spanish-only prompt + extract `lib/agent-prompt.ts` builder | low | ⬜ ready |
| 1 | Route-aware contextual prompt (URL-only) — PDP/catalog/shop/account/default | low | ⬜ ready |
| 2 | `AgentContext` provider + per-page setter (rich context plumbing) | low | ⬜ ready |
| 2 | PDP + shop embed title/price/shop name | low | ⬜ ready |
| 2 | Account/orders contextual handoff in the navbar card (reuse `AgentHandoff` shape) | low | ⬜ ready |
| 2 | Lock the builder with unit/API specs + smoke walkthrough | low | ⬜ ready |

## Deploy order
**Frontend-only (Vercel); no backend, no migration.** Sprint 1 ships standalone (icon split + Spanish +
URL-only context). Sprint 2 layers rich context on top — depends on Sprint 1's `lib/agent-prompt.ts` seam.
All Low-risk → reviewer may auto-merge on green CI **unless** a story touches shared chrome
(`PlatformShell.tsx`, `app/layout.tsx`) — then announce (it can break sibling PRs).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated (07 feature map + Recent highlights)
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted
- [ ] **No kill-switch** (all Low-risk, no money/auth/commerce path)
