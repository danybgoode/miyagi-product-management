---
status: planned
slug: agent-discovery-and-indexing
---

# Epic: Agent discovery & indexing — why nothing is indexed, `/agent` in es-MX, `/vende` as the agent target

> **Area:** 07-agentic-and-federated-commerce (the `/vende` indexing angle is 08-Growth flavored — cross-linked)
> · **Risk:** spike + low · **Type:** spike + copy chore
> **Scope doc:** [`00-ideas/2. readyforscope/agent-discovery-and-indexing.md`](../../00-ideas/2.%20readyforscope/agent-discovery-and-indexing.md)
> **Status:** 📋 planned · approved 2026-07-01 · **spike-first — no build until S0's decision lands**

## Why
"Agents can't find us" is an **indexing** problem, not a code bug. Validated live 2026-07-01: `/vende` is fully
server-rendered and agent-readable (raw fetch returns the whole page — hero, ML/Shopify benchmark, personas,
FAQ — with `robots: index,follow`, canonical, full OG/Twitter, an OG image), and `robots.txt` is permissive +
advertises the sitemap/llms.txt/manifest. **But `site:miyagisanchez.com` returns zero results** — the whole
domain is absent from the search index, which is why Gemini/ChatGPT "can't find the site" when they *search*
(a direct-URL fetch works). So we diagnose the zero coverage (spike → written decision + action list), and
separately bring `/agent` into es-MX and keep `/vende` as the promoted agent target.

## Decisions locked with Daniel (2026-07-01)
- **Promoted agent target = keep `/vende`** (richest page: cost comparison + personas; human+agent readable).
- **`/agent` → translate to es-MX** (no marketing reason for English; rule #5). Agents still relay to the
  user's language via `RELAY_LANGUAGE_DIRECTIVE`. Not added to the bilingual allow-list.

## Medusa-first note
N/A — content + crawl config only; no commerce/data/auth (rules 1/2/4 untouched). Rule 3 reinforced (verify the
agent-discovery surfaces). Rule 5: the `/agent` translation removes a stray English surface; es-MX only.

## What already exists (reuse, don't rebuild)
- `app/robots.txt/route.ts`, `app/sitemap.ts`, `app/llms.txt`, `/api/ucp/manifest` — machine-discovery surfaces
  (present + correct-looking). The spike **audits**, doesn't rebuild.
- `app/(shell)/agent/page.tsx` + `lib/about-content.ts` (`getAboutSection(...).en`) + `ucp-use-cases.json` +
  `lib/about-agent.ts` — `/agent`'s content sources; translate the **rendered** copy, keep JSON-LD keys English.
- `app/(shell)/vende/*` + `opengraph-image.tsx` — the seller landing + OG image (working). Keep the promoted
  prompt pointed here.
- `lib/setup-spec.ts` `buildSetupPrompt()` renders on `/agent` — if `seller-agent-connect-mcp-url` rewrites it,
  `/agent` inherits that; don't double-edit.

## S0 — the indexing spike (do FIRST, no build)
Answer against Google Search Console + live crawler-UA responses, then write a decision + prioritized action
list into `RETROSPECTIVE.md`:
1. Is `miyagisanchez.com` a **verified** Search Console property? If not → verify + submit `sitemap.xml`.
2. Why zero coverage? Rule in/out: new-domain/no-backlinks crawl starvation · `noindex`/`X-Robots-Tag` served
   **to Googlebot specifically** · canonical/host consolidation · past Vercel SSO/preview shadowing prod ·
   manual action. (Raw-fetch evidence already excludes "empty client-rendered shell".)
3. Are ChatGPT/Gemini blocked at the crawler layer? Confirm no need for explicit `GPTBot` / `Google-Extended`
   / `OAI-SearchBot` / `PerplexityBot` lines.
4. Are `sitemap.xml` / `llms.txt` / manifest reachable + valid?
5. **Output:** confirmed cause(s) + action list (ops vs code/config vs submit-and-wait). **Gate:** nothing in
   Sprint 2 builds until this lands.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| S0 | Indexing diagnosis → written decision + action list (ops/investigation) | spike |
| 1 | Translate `/agent` rendered copy to es-MX (keep JSON-LD keys English) | low |
| 1 | Promoted prompt consistently points to `/vende` (coordinate with promoter `{url}` fix) | low |
| 1 | Re-verify `/vende` link unfurl (OG image + tags) | low |
| 2 | Execute the spike's code/config fixes — only if S0 finds any | tbd (set at S0) |

## Deploy order
S0 is investigation (Daniel holds Search Console; agent audits headers/robots/sitemap/llms/manifest). Sprint 1
frontend-only, low-risk, ships alone. Sprint 2 conditional on S0 (risk set when the cause is known). Indexing
outcomes are **asynchronous** — "did it get indexed" is a post-submit read, not a merge gate.

## Definition of Done (epic)
- [ ] S0 written decision + action list in `RETROSPECTIVE.md`; ops actions done or owed to Daniel
- [ ] Sprint 1 merged + smoke-tested; `sprint-1.md` smoke walkthrough present (real URLs)
- [ ] `/agent` renders es-MX; JSON-LD/schema keys still valid
- [ ] `/vende` link unfurl verified; promoted prompt points to `/vende` everywhere
- [ ] This README marked ✅; sprint status ticked with commit refs
- [ ] Product poster (`Roadmap/README.md`) updated (07 discovery / `/agent` line)
- [ ] Team memory + `MEMORY.md` index updated; durable learnings → `Roadmap/LEARNINGS.md` (dedupe)
- [ ] Feature branch deleted; PR merged
