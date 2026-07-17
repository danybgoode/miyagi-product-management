---
status: shipped
slug: agent-readability-marketing-surface
---

# Epic: Agent-readability & marketing-surface hardening

> **Area:** 07-agentic-and-federated-commerce · **Risk:** low · **Scope seed:** [`00-ideas/seeds/agent-readability-marketing-surface.md`](../../00-ideas/seeds/agent-readability-marketing-surface.md) · **Archetype:** Maintainer

## Why
The campaign phrase "pregúntale a tu IA por **miyagisanchez.com**" must always work. Validated
2026-07-14: the whole agent-discovery chain works (robots → llms.txt → /agent → manifest → /vende)
**except bare `/acerca` returns an empty body to non-JS fetchers** — the #1 page llms.txt sends agents
to. Fix it, unify the social previews the marketing URLs show, and gate the whole surface in CI so it
can't silently regress.

## Medusa-first note
No commerce data touched; page metadata + caching + one Playwright spec. AGENTS rule #3 satisfied by
existing UCP surfaces (validated live).

## What already exists (reuse, don't rebuild)
- `agent-discovery-and-indexing`, `agent-readable-about-surface`, `marketplace-positioning-meta` epics — the chain being hardened
- `app/(shell)/acerca/page.tsx` — correct server component; the bug is a caching layer, not the code
- e2e `api` project — the guard spec's home; zero new harness
- `/vende`'s canonical + own OG image — the pattern the sweep replicates

## Scope — stories
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | 1.1 Fix `/acerca` empty body to fetch agents (P0) | low | ✅ premise stale — verified NOT reproducible live 2026-07-16 (page renders dynamic, CF DYNAMIC); root cause recorded in PR [#270](https://github.com/danybgoode/miyagisanchezcommerce/pull/270); durable guard = 1.3 |
| 1 | 1.2 OG sweep: shared template, per-page headline | low | ✅ shipped + live 2026-07-16 — PR [#270](https://github.com/danybgoode/miyagisanchezcommerce/pull/270) |
| 1 | 1.3 Agent-readability CI spec | low | ✅ shipped + live 2026-07-16 — PR [#270](https://github.com/danybgoode/miyagisanchezcommerce/pull/270), 16/16 green vs prod |

## Deploy order
Frontend only (Cloud Run via merge). Story 1.1's fix may be a Cloudflare cache rule — announce if it
touches shared edge config.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
