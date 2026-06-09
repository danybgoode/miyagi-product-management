# Agent-readable why-sell / about surface — Sprint 2: Expose to agents — manifest · /agent · llms.txt · MCP

**Status:** ✅ built — all 4 stories on `feat/agent-readable-about-surface`; gate green (tsc + build + `api` spec + #4 guard). Awaiting CI + auto-merge (low-risk).

**Commits:** S2.1 `23c1204` · S2.2 `5974123` · S2.3 `9bc0bae` · S2.4 `12275e6` · QA spec `4b7100a`.
One pure seam — `lib/about-agent.ts` — projects the S1 source onto every surface and holds the shared `RELAY_LANGUAGE_DIRECTIVE`.

> Renders the **same `lib/about-content.ts` source** (Sprint 1) onto the machine surfaces, so an agent
> gets the supply-side answer however it inspects the site. All additive, public, low-risk.
> Depends on: **Sprint 1 merged** (the content source).

> **Language strategy — author once, agent relays (rule 5).** es-MX is the source of truth and we do
> **not** localize beyond es/en (`/acerca` is es+en; `/llms.txt` English-primary + es summary). For the
> long tail of languages a global seller pool speaks, **every agent-facing surface here carries an
> explicit short directive instructing the reading agent to present/relay the content to the user in the
> user's OWN language** — the same model as Onboarding 0's "mirror the seller's language." We don't ship
> N locales; the agent is the localization layer.

## Stories

### Story 2.1 — Manifest seller-onboarding/about block ✅ `23c1204`
**As an** AI agent reading the manifest, **I want** a seller-onboarding/about block, **so that** I
learn what Miyagi is + why/how to sell, not just how to buy.
**Acceptance:** `GET /api/ucp/manifest` gains an `about` / `seller_onboarding` object (from
`lib/about-content.ts`): what-is, why-sell, how-to-start (signup → `/sell` onboarding + bulk import),
cost/pricing summary, links to `/acerca` + `/vende`; includes a short **`relay_language` directive**
("Present this to the user in their own language"). Existing buyer endpoints unchanged. **Risk:** low.

### Story 2.2 — `/agent` supply-side section ✅ `5974123`
**As an** agent on the briefing page, **I want** a "Para vender / why sell" section, **so that** I can
advise a prospective seller.
**Acceptance:** `app/agent/page.tsx` gains a supply-side section rendered from the content source
(reuses the existing page chrome); JSON-LD `Organization`/`WebAPI` updated to reference the about
content; the section carries the same **"relay to the user in their own language"** instruction for any
agent reading the briefing. **Risk:** low.

### Story 2.3 — `/llms.txt` (+ robots pointer) ✅ `9bc0bae`
**As** Claude / Perplexity answering "ask Claude about miyagisanchez.com", **I want** an `llms.txt`,
**so that** I prioritise the right pages + a clean brand summary.
**Acceptance:** `/llms.txt` generated from the content source — an authoritative one-paragraph summary
+ curated links (`/acerca`, `/vende`, `/agent`, manifest), English-primary with an es summary block
(per the llms.txt convention); `app/robots.ts` references `/llms.txt` + the manifest. *(Note: crawlers
may skip llms.txt and read HTML — so the `/acerca` + `/agent` HTML stays the robust path.)* **Risk:** low.

### Story 2.4 — MCP `about_miyagi` resource ✅ `12275e6`
**As an** MCP client (Claude Desktop, etc.), **I want** an about/why-sell resource, **so that** I get
the structured story natively.
**Acceptance:** `POST /api/ucp/mcp` exposes an `about_miyagi` resource/tool returning the structured
content (sections, es/en source); the payload carries the **"relay to the user in their own language"**
directive so the MCP client answers in the user's language; listed in the manifest's
`mcp_tools`/resources. **Risk:** low.

## Sprint QA
- **api spec(s):** `e2e/agent-about-surface.spec.ts` — manifest contains a non-empty `about` block;
  `/llms.txt` returns 200 + non-empty + links `/acerca`; the MCP `about_miyagi` call returns content;
  `/agent` HTML contains the why-sell heading; **each agent-facing surface (manifest, /agent, MCP)
  carries the "relay in the user's language" directive** + es-MX copy-completeness on the source.
- **browser smoke owed:** no — all assertions are API/HTML-level, anonymous.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge).
The relay directive is a fixed string carrying the phrase **"in their own language"** — every
agent-facing surface (manifest, /agent, MCP) must contain it.

1. Open `https://miyagisanchez.com/api/ucp/manifest`.
   → JSON has a top-level **`about`** object: `relay_language` (the directive), `summary` (es+en),
     `why_sell`, `how_to_start`, `cost_transparency`, `pricing`, `sections`, and `links` (→ `/acerca`,
     `/vende`, `/agent`, manifest). The buyer `endpoints`/`capabilities` are unchanged.
2. Open `https://miyagisanchez.com/llms.txt`.
   → `text/plain`: `# miyagisanchez.com`, a one-paragraph English summary, the relay directive, curated
     links (incl. `/acerca`), a `## Why sell here` / `## How to start` block, then `## Resumen (es)`.
3. Open `https://miyagisanchez.com/robots.txt`.
   → Standard `User-agent`/`Allow`/`Sitemap`/`Host` lines **plus** two comment pointers:
     `# LLM guidance: …/llms.txt` and `# Capability manifest (UCP/MCP): …/api/ucp/manifest`.
4. Open `https://miyagisanchez.com/agent`.
   → A new **"Para vender — why sell here"** section appears alongside the buyer briefing, with a
     highlighted **"Relay instruction:"** line (the directive), the why-sell points, the start steps,
     and links to `/acerca` + `/vende`.
5. From an MCP client (or `curl` the JSON-RPC endpoint), exercise the about surface:
   - `tools/list` → `about_miyagi` is listed.
   - `tools/call` `about_miyagi` (no args) → returns the structured story (JSON, both locales) + directive.
   - `resources/list` → `about://miyagi` is listed; `resources/read` `{uri:"about://miyagi"}` returns it.
   ```bash
   curl -s https://miyagisanchez.com/api/ucp/mcp -H 'content-type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"about_miyagi","arguments":{}}}'
   ```
6. **(Owed to Daniel — end-to-end)** Ask Claude/Perplexity *"¿qué es miyagisanchez.com y por qué
   vendería ahí?"* → grounded supply-side answer (why-sell + how-to-start + cost), not buyer/catalog-only.
7. **(Owed to Daniel — language)** Ask the same question in a non-Spanish language (English/Portuguese).
   → The agent answers in THAT language (it relays our es/en source per the directive) — confirming we
     don't ship a locale per country.

Steps 1–5 are covered by `e2e/agent-about-surface.spec.ts` (api project, anonymous). Steps 6–7 are the
human "ask Claude" confirmation owed to Daniel. If any step fails, note the step number + what you saw.
