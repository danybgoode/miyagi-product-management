# Agent-readable why-sell / about surface — Sprint 2: Expose to agents — manifest · /agent · llms.txt · MCP

**Status:** ⬜ not started

> Renders the **same `lib/about-content.ts` source** (Sprint 1) onto the machine surfaces, so an agent
> gets the supply-side answer however it inspects the site. All additive, public, low-risk.
> Depends on: **Sprint 1 merged** (the content source).

## Stories

### Story 2.1 — Manifest seller-onboarding/about block
**As an** AI agent reading the manifest, **I want** a seller-onboarding/about block, **so that** I
learn what Miyagi is + why/how to sell, not just how to buy.
**Acceptance:** `GET /api/ucp/manifest` gains an `about` / `seller_onboarding` object (from
`lib/about-content.ts`): what-is, why-sell, how-to-start (signup → `/sell` onboarding + bulk import),
cost/pricing summary, links to `/acerca` + `/vende`. Existing buyer endpoints unchanged. **Risk:** low.

### Story 2.2 — `/agent` supply-side section
**As an** agent on the briefing page, **I want** a "Para vender / why sell" section, **so that** I can
advise a prospective seller.
**Acceptance:** `app/agent/page.tsx` gains a supply-side section rendered from the content source
(reuses the existing page chrome); JSON-LD `Organization`/`WebAPI` updated to reference the about
content. **Risk:** low.

### Story 2.3 — `/llms.txt` (+ robots pointer)
**As** Claude / Perplexity answering "ask Claude about miyagisanchez.com", **I want** an `llms.txt`,
**so that** I prioritise the right pages + a clean brand summary.
**Acceptance:** `/llms.txt` generated from the content source — an authoritative one-paragraph summary
+ curated links (`/acerca`, `/vende`, `/agent`, manifest), English-primary with an es summary block
(per the llms.txt convention); `app/robots.ts` references `/llms.txt` + the manifest. *(Note: crawlers
may skip llms.txt and read HTML — so the `/acerca` + `/agent` HTML stays the robust path.)* **Risk:** low.

### Story 2.4 — MCP `about_miyagi` resource
**As an** MCP client (Claude Desktop, etc.), **I want** an about/why-sell resource, **so that** I get
the structured story natively.
**Acceptance:** `POST /api/ucp/mcp` exposes an `about_miyagi` resource/tool returning the structured
content (sections, bilingual); listed in the manifest's `mcp_tools`/resources. **Risk:** low.

## Sprint QA
- **api spec(s):** `e2e/agent-about-surface.spec.ts` — manifest contains a non-empty `about` block;
  `/llms.txt` returns 200 + non-empty + links `/acerca`; the MCP `about_miyagi` call returns content;
  `/agent` HTML contains the why-sell heading.
- **browser smoke owed:** no — all assertions are API/HTML-level, anonymous.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open `https://miyagisanchez.com/api/ucp/manifest`.
   → JSON includes an `about` / `seller_onboarding` block with why-sell + how-to-start + links.
2. Open `https://miyagisanchez.com/llms.txt`.
   → A brand summary + curated links (incl. `/acerca`) render; English-primary with an es summary.
3. Open `https://miyagisanchez.com/agent`.
   → A new "Para vender / why sell" section appears alongside the buyer briefing.
4. From an MCP client (or `curl` the JSON-RPC endpoint), call the `about_miyagi` resource.
   → It returns the structured about/why-sell content.
5. (End-to-end) Ask Claude/Perplexity *"¿qué es miyagisanchez.com y por qué vendería ahí?"*
   → The answer is grounded supply-side (why-sell + how-to-start + cost), not buyer/catalog-only.

If any step fails, note the step number + what you saw — that's the bug report.
