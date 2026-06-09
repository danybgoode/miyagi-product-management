---
title: "Agent-readable why-sell / about surface"
slug: agent-readable-about-surface
status: scaffolded
area: "07"
type: feature
priority: null
risk: low
epic: 07-agentic-and-federated-commerce/agent-readable-about-surface
build_order: null
updated: 2026-06-08
---

# Scope — Agent-readable why-sell / about surface

> The unlock for the **"No nos creas, pregúntale a Claude"** campaign: when a prospective seller asks
> their own AI *"¿qué es miyagisanchez.com?"*, the agent must get a grounded, supply-side answer —
> what Miyagi is, **why sell here**, **how to start**, what it costs, and who's behind it. Sibling to
> #6 (which shipped the human acquisition funnel). Captured in `seeds/agent-native-gtm/` (spawned
> ask #2). Planning only — no code.

## Outcome & signal
**After this ships:** an AI agent (Claude / Perplexity / an MCP client / a crawler reading HTML) that
inspects `miyagisanchez.com` returns an accurate, persuasive, *supply-side* answer and can point the
user to start — instead of today's buyer/catalog-only story.
**How Daniel tests it:** ask Claude/Perplexity *"¿qué es miyagisanchez.com y por qué vendería ahí?"*
and get a correct why-sell + how-to-start + cost answer; fetch `/llms.txt` and `/api/ucp/manifest`
and see a seller-onboarding/about block; call the MCP `about_miyagi` resource and get the structured
story; open `/acerca` and read it (es + en).

## Stage-2.5 bucket
**Light-enhancement + genuinely-new content.** Validated against `main`:
- The **rails exist** (light-enhancement path): `/agent` briefing page, `/api/ucp/manifest`,
  `/api/ucp/mcp`, `robots.ts`, the shipped `/vende` pages + reusable section system (#6), #4 tokens.
- But every one of them is **buyer/commerce or existing-seller-config** — the manifest describes
  catalog/checkout/offers/MCP-shopping + `get/patch_store_configuration`; the `/agent` "What is this
  marketplace?" blurb is buyer/integrator-framed and English-only. **No "why sell / how to start /
  pricing / cost / founder / philosophy" content exists anywhere** (genuinely-new content).
So: ~no new infra; the work is **authoring the supply-side content once + exposing it across the
existing agent surfaces** + one new human page.

## Decisions (Daniel, 2026-06-08)
- **Surfaces — all four:** extend `/agent` + `/api/ucp/manifest`; add `/llms.txt`; add an MCP
  about/why-sell resource; **and** a dedicated human about page (`/acerca`).
- **Content — all four blocks:** why-sell + how-to-onboard · cost transparency · pricing/business
  model · founder + philosophy.
- **Authoring:** ship the surfaces + the **groundable** content now; **stub founder + pricing** with
  clearly-marked placeholders for Daniel to fill (founder's note + philosophy are Daniel-authored;
  domain/subdomain prices are TBD).

## Architecture spine — author once, render many
One **structured, bilingual content source** (e.g. `lib/about-content.ts` — no DB, no Medusa) holds
the sections (what-is-Miyagi · why-sell · how-onboarding-works · cost-transparency · pricing ·
founder · philosophy), each with `es`/`en`. Every surface renders *from it*: the `/acerca` page, the
`/agent` section, the manifest block, `/llms.txt`, and the MCP resource. One edit updates all five —
no drift. This is the core reuse decision.

## Scope
**In v1:** the content source; `/acerca` human page (es/en, on #4 tokens + #6 section components);
supply-side section added to `/agent`; a `seller_onboarding`/`about` block in `/api/ucp/manifest`;
`/llms.txt` (+ `robots.ts` pointer); an MCP `about_miyagi` resource; founder/pricing **stubbed**;
sitemap + JSON-LD `Organization` so the page is discoverable; a soft "empieza gratis" CTA → `/sell`.
**Out of v1:** the full **Onboarding 0** agent-setup loop (separate spawned ask — this surface only
*describes* + links to onboarding, doesn't build the JSON/MCP setup flow); the **outreach campaign**
creative (separate); final founder/pricing copy (Daniel-authored fill); any commerce/pricing
*enforcement* (no gates exist yet); English variants of the `/vende` funnel (unchanged).

## What already exists (reuse, don't rebuild)
- `app/agent/page.tsx` + `ucp-use-cases.json` + `lib/ucp/capabilities.ts` (`UCP_ENDPOINTS`,
  `MCP_BUYER_TOOLS`/`MCP_SELLER_TOOLS`) — extend, don't rebuild.
- `app/api/ucp/manifest/route.ts` — add a seller-onboarding/about block alongside the buyer endpoints.
- `app/api/ucp/mcp/route.ts` — add the about resource/tool next to the existing tools.
- `app/robots.ts` — point at `/llms.txt` + the manifest.
- The shipped **#6 `/vende` pages + reusable section system** (`lib/seller-acquisition.ts` +
  components) + **#4 tokens** — `/acerca` reuses these; cross-link funnel ↔ about.
- **`seeds/agent-native-gtm/README.md`** — the source material for the why-sell / cost / business-model
  / founder content sections.
- `locales/en.json` + `locales/es.json` — bilingual strings (AGENTS rule 5).
- **AGENTS five rules:** rule 1 N/A (no commerce), rule 2 N/A (no DB — content in-repo), **rule 3
  satisfied (extends UCP/MCP — agent-first)**, rule 4 untouched (public/anonymous), rule 5 (the
  `/acerca` page is fully bilingual; `/llms.txt` English-primary with an es summary; manifest keeps
  `locale: es-MX`).

## Proposed slicing (for sign-off) — 2 lean sprints, both low-risk
### Sprint 1 — Content source + `/acerca` human page
- **US-1.** *As a prospective seller (or their agent), I want one page that explains what Miyagi is,
  why sell here, how to start, what it costs, and who's behind it.* **Acceptance:** `/acerca` renders
  es + en from `lib/about-content.ts`, on #4 tokens + #6 components; sections = what-is / why-sell /
  how-to-start / cost-transparency / pricing (honest, domain·subdomain TBD) / founder (stub) /
  philosophy (stub); soft CTA → `/sell`; cross-linked with `/vende`; semantic HTML (agent-fetchable);
  in `sitemap.xml` + JSON-LD `Organization`. **QA:** anonymous browser smoke (es+en render, CTA nav);
  agent-fetch check (real text, not image-baked). Risk: **low**.

### Sprint 2 — Expose to agents (manifest · /agent · llms.txt · MCP)
- **US-2.** *As an AI agent, I want the why-sell/about story from the machine surfaces, so I answer
  "should I sell here?" grounded.* **Acceptance:** `/api/ucp/manifest` gains a `seller_onboarding`/
  `about` block (read from the source); `/agent` gains a supply-side "Para vender / why sell" section;
  `/llms.txt` is generated from the source (English-primary + es summary) and `robots.ts` points at
  it; an MCP `about_miyagi` resource/tool returns the structured content. **QA:** `api` spec asserts
  the manifest block + `/llms.txt` are present and non-empty; an MCP call returns the resource; fetch
  the live URLs. Risk: **low** (additive, public, no commerce — reviewer may auto-merge on green CI).

## Open risks / research
- **`llms.txt` reality (researched 2026-06-08):** a community convention (llmstxt.org, 2024), ~10%
  adoption; **Claude (Desktop/.ai) and Perplexity publicly respect it** for the direct "ask the AI"
  flow — exactly our campaign — but **search crawlers (ClaudeBot/GPTBot) often skip it and read HTML
  directly, and Google doesn't support it.** → ship llms.txt **and** keep the HTML (`/acerca`,
  `/agent`) + manifest strong; don't rely on llms.txt alone. *(Sources in the groom thread.)*
- **Founder/pricing content is owed by Daniel** — surfaces ship with visible placeholders; no fake
  founder claims, no invented prices. The page states pricing honestly (free + 0% commission, funded
  by print ads; premium addressing priced later).
- **Macro-section:** proposed **07 · Agentic & Federated Commerce** (extends UCP/MCP + `/agent`).
  Alternative: 08 · Growth (supply acquisition, beside #6). *Confirm at sign-off.*
- **Don't overstate.** Onboarding 0 isn't built — the about content may *describe* the agent-setup
  vision but must not claim a paste-JSON flow that doesn't exist yet; keep it to what ships today
  (signup → `/sell` onboarding + bulk import).

## Definition of Ready
- [x] Outcome + Daniel-testable signal stated.
- [x] Stage-2.5 bucket named (light-enhancement + new content), validated against `main`.
- [x] v1 in/out boundary; decisions from 2026-06-08 captured.
- [x] Reuse list produced (Medusa-first reframe — no commerce, no DB; extends UCP/MCP per rule 3).
- [x] Present-day fact researched + cited (llms.txt adoption/behavior).
- [x] Stories sliced + risk-tiered (both low); QA named per sprint.
- [ ] **Daniel approves this scope** ← the gate. *(Confirm macro-section 07 vs 08 here.)*
