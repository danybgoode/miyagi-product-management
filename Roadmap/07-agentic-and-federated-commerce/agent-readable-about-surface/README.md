# Epic: Agent-readable why-sell / about surface

> **Area:** 07 · Agentic & Federated Commerce · **Risk:** low · **Scope seed:** [`00-ideas/seeds/agent-readable-about-surface.md`](../../00-ideas/seeds/agent-readable-about-surface.md)

> **✅ EPIC COMPLETE — both sprints shipped to prod 2026-06-09.** S1 PR #57 (`0f71ff5`) — bilingual
> content source + `/acerca`. S2 PR #59 (`c12c969`) — agent surfaces (manifest `about` block · `/agent`
> why-sell · `/llms.txt` + robots pointer · MCP `about_miyagi` tool+resource), each carrying the
> relay-language directive. One pure seam `lib/about-agent.ts` projects the source onto every surface.
> **Content fill still owed by Daniel:** founder's note + philosophy + final premium pricing replace the stubs.

## Why
When a prospective seller asks their own AI *"¿qué es miyagisanchez.com y por qué vendería ahí?"* the
agent must get a grounded, **supply-side** answer — what Miyagi is, why sell here, how to start, what
it costs, and who's behind it — and an offer to help them begin. Today the agent surfaces
(`/agent`, `/api/ucp/manifest`, MCP) only describe **buying** and **existing-seller config**; the
human why-sell exists (the shipped `/vende` pages) but no machine surface carries it. This epic is the
unlock for the **"No nos creas, pregúntale a Claude"** campaign — and the sibling to #6.

## Medusa-first note
**No commerce, no DB, no Medusa, no Supabase.** Content + presentation only. AGENTS five rules: 1 N/A
(no commerce), 2 N/A (content lives in-repo, no table), **3 satisfied — this *extends* UCP/MCP, the
agent-first surface**, 4 untouched (public/anonymous), 5 — `/acerca` is fully bilingual (es/en);
`/llms.txt` English-primary + an es summary; manifest keeps `locale: es-MX`.

## Architecture spine — author once, render many
One **structured, bilingual content source** (`lib/about-content.ts`, no DB) holds the sections
(what-is-Miyagi · why-sell · how-to-start · cost-transparency · pricing · founder · philosophy), each
with `es`/`en`. Every surface renders *from it* — the `/acerca` page, the `/agent` section, the
manifest block, `/llms.txt`, and the MCP resource. One edit updates all five. **Founder + pricing
ship as clearly-marked stubs** (Daniel authors the founder's note + philosophy; domain/subdomain
prices are TBD) — no invented claims, no fake prices.

## What already exists (reuse, don't rebuild)
- `app/agent/page.tsx` + `ucp-use-cases.json` + `lib/ucp/capabilities.ts` (`UCP_ENDPOINTS`, `MCP_*_TOOLS`) — extend.
- `app/api/ucp/manifest/route.ts` — add a `seller_onboarding`/`about` block beside the buyer endpoints.
- `app/api/ucp/mcp/route.ts` — add an `about_miyagi` resource/tool beside the existing tools.
- `app/robots.ts` — point at `/llms.txt` + the manifest.
- **#6 `/vende` pages + section system** (`lib/seller-acquisition.ts` + components) + **#4 tokens** (`token-contract.md`) — `/acerca` reuses these; cross-link funnel ↔ about.
- **`00-ideas/seeds/agent-native-gtm/README.md`** — source material for the why-sell / cost / business-model / founder content.
- `locales/en.json` + `locales/es.json` — bilingual strings (AGENTS rule 5).

## Scope — stories
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | Content source + /acerca human page (es/en) | low | ✅ shipped (PR #57, `0f71ff5`) |
| 2 | Expose to agents — manifest · /agent · llms.txt · MCP | low | ✅ shipped (PR #59, `c12c969`) |

## Deploy order
Frontend-only (Vercel); no backend, no migration. **S1 (content source + `/acerca`) → S2 (agent
surfaces read from the same source).** Both additive + public + low-risk → reviewer may auto-merge on
green CI unless a story touches shared layout / `robots.ts` / `middleware` (then announce). Each
sprint ships independently.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated (07 feature map + Recent highlights)
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Feature branch deleted; seed frontmatter `status: shipped`
- [ ] **Content fill owed by Daniel:** founder's note + philosophy + final pricing replace the stubs
- [ ] **Live smoke owed to Daniel:** the end-to-end "ask Claude in another language" relay (sprint-2 steps 6–7)
