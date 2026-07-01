# Agent discovery & indexing — why nothing is indexed, `/agent` in es-MX, and `/vende` as the agent target

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **07 · Agentic & Federated Commerce** (agents discovering the offer; the `/vende` indexing angle
is **08 · Growth** flavored — cross-linked, flagged at approval). Epic slug `agent-discovery-and-indexing`.
Class: **Spike** (diagnose why the domain isn't indexed → a written decision + an action list) **+** a small
**copy chore** (`/agent` → es-MX). **No slicing of build work until the spike decision lands** (groom Stage 2).

> One ask, three questions. The headline ("agents can't find us") is an **indexing** problem, not a code bug —
> so this is a spike first. The `/agent` language and the `/vende`-vs-`/agent` target are decidable now.

## Mirror-back
> You want me to validate three things: (1) is `/vende` actually accessible to agents and **indexed**?
> (2) why is `/agent` in **English** with no marketing reason — should it be Spanish? (3) which URL should the
> promoted "ask your agent" prompt point to — `/vende` or `/agent` — and does that page have everything (cost
> comparison, personas)? Plus: fix the link **preview** and confirm OG/description/robots/indexing are sound.
> Right?

## What I validated (live prod, 2026-07-01)
- **`/vende` is technically perfect for agents.** A **raw** fetch (no JS — exactly what ChatGPT/Gemini do)
  returns the **entire** page: hero, the Miyagi-vs-Mercado-Libre-vs-Shopify **benchmark**, the worked $1,000
  example, the **persona router**, the UCP/MCP "AI channel" section, and the FAQ. Headers show
  `robots: index, follow`, `googlebot: index, follow, max-image-preview:large`, a canonical, full **OpenGraph
  + Twitter** tags, and a `/vende/opengraph-image`. So this is **not** an accessibility, OG, or robots bug.
- **`robots.txt` is permissive and correct:** `User-Agent: * / Allow: /`, advertises `sitemap.xml` + a `Host:`
  hint + `# LLM guidance: /llms.txt` + `# Capability manifest: /api/ucp/manifest`. `sitemap.ts` includes
  `/vende` (+ personas) at priority 0.9.
- **The real problem: the site is not in the search index.** `site:miyagisanchez.com/vende` → **0 results**,
  and `site:miyagisanchez.com` (whole domain) → **0 results**. That is why Gemini/ChatGPT say they "can't find
  the website" when they **search** — their grounding leans on a search index the domain isn't in. When handed
  the **direct URL** the same agents can read it fine (the raw fetch proves the content is served). So the
  promoted prompt's *"abre https://miyagisanchez.com/vende"* (a direct fetch) should already work; a *search*
  for Miyagi will not until the domain is indexed.
- **`/agent` body is entirely English** ("Agent Briefing", "What is this marketplace?", API endpoints, MCP
  tools, UCP use cases). Its `robots` is `index, follow`. It has **no** ML/Shopify benchmark and **no** persona
  router — those live only on `/vende`. (Its `<title>`/OG are a Spanish site default, but the visible copy is
  English.)

## Decisions locked with Daniel (2026-07-01)
- **Promoted agent target = keep `/vende`.** It's the richer page (cost comparison **and** personas,
  human+agent readable, es-MX). Fix indexing so search-grounded agents find it; don't redirect the prompt to
  `/agent` (which lacks both).
- **`/agent` → translate to es-MX.** No marketing reason for English (AGENTS rule #5 = es-MX default). Agents
  still relay to the user's language via the existing `RELAY_LANGUAGE_DIRECTIVE`, so a Spanish source costs
  agents nothing and stops a human landing on jarring English. **Not** added to the bilingual allow-list —
  es-MX only, like the rest of the seller surface.

## Stage 2.5 — can we already do this?
- **Indexing** → **investigation, likely mostly ops** (Search Console verification + sitemap submission +
  request-indexing + diagnosing zero coverage). Possibly a small code/config fix if the spike finds a
  crawl/canonical/`noindex`-to-Googlebot cause. **Not** a feature build until the spike says so.
- **`/agent` es-MX** → **light copy** (translate one page + its `about-content`/`ucp-use-cases` English strings;
  keep the machine-readable JSON-LD English keys intact).
- **`/vende` as target** → **already true** (the prompt already points there); the fix is *indexing*, plus
  making the promoted prompt consistent across surfaces.

## The spike — questions to answer, then a written decision (no build first)
1. **Is the domain verified in Google Search Console?** If not, that's step zero (verify, submit `sitemap.xml`,
   check Coverage/Pages for exclusions: "Discovered – not indexed", "Crawled – not indexed", `noindex`,
   canonical-elsewhere, soft-404s).
2. **Why zero coverage?** Candidate causes to rule in/out against the live site: (a) domain age / no inbound
   links / crawl-budget starvation on a new domain; (b) something serving `noindex`/`X-Robots-Tag` **to
   Googlebot specifically** (the public headers look clean — check the crawler-UA response); (c) canonical or
   host consolidation pointing crawlers away; (d) Vercel SSO/preview protection ever having shadowed prod; (e)
   a manual action / spam flag. The raw-fetch evidence already **excludes** "client-rendered/empty shell."
3. **Are ChatGPT/Gemini blocked at the crawler layer?** Confirm `robots.txt` doesn't need explicit `GPTBot` /
   `Google-Extended` / `OAI-SearchBot` / `PerplexityBot` allowances, and whether they honor the `# LLM
   guidance`/manifest pointers. (Allow-all covers them, but name them if we want explicit control.)
4. **Sitemap/`llms.txt`/manifest correctness at scale:** is `sitemap.xml` reachable + valid, does `llms.txt`
   point at the right surfaces, is the manifest current?
5. **Output:** a written decision listing the confirmed cause(s) + a prioritized action list (what's ops,
   what's a code/config fix, what's just "submit + wait"), written into the epic RETROSPECTIVE/decision doc.

## What already exists (reuse, don't rebuild)
- `app/robots.txt/route.ts`, `app/sitemap.ts`, `app/llms.txt`, `/api/ucp/manifest` — the machine-discovery
  surfaces (all present + correct-looking). The spike **audits** them; it doesn't rebuild them.
- `app/(shell)/vende/*` + `opengraph-image.tsx` — the seller landing + OG image (working). No change beyond
  keeping the promoted prompt pointed here.
- `app/(shell)/agent/page.tsx` + `lib/about-content.ts` (`getAboutSection(...).en`) + `ucp-use-cases.json` +
  `lib/about-agent.ts` — the `/agent` content sources; es-MX story translates the **rendered** copy (keeps
  JSON-LD/schema keys English).
- `lib/setup-spec.ts` `buildSetupPrompt()` renders on `/agent` too — if the seller-agent-connect epic rewrites
  it, `/agent` inherits the improvement (note the dependency; don't double-edit).
- `site-wide-analytics-gtm` scope doc + Microsoft Clarity — already-planned measurement that can confirm
  crawler/agent traffic post-fix.

## Medusa-first reframe (AGENTS five-rule check)
- **Rules 1/2/4 (Medusa/Supabase/Clerk):** untouched — this is content + crawl config, no commerce/data/auth.
- **Rule 3 (UCP/MCP first-class):** reinforced — the spike verifies the agent-discovery surfaces
  (`/agent`, `/llms.txt`, manifest, sitemap) are reachable and consistent.
- **Rule 5 (es-MX default):** the `/agent` translation brings a stray English surface into es-MX compliance;
  not added to the bilingual allow-list.

## In scope (v1)
- The **indexing spike**: diagnose zero coverage, produce a written decision + prioritized action list; execute
  the clearly-ops steps (Search Console verify + submit sitemap + request indexing) if Daniel authorizes.
- **`/agent` → es-MX** translation of the rendered copy (keep machine-readable JSON-LD keys English).
- Make the promoted "ask your agent" prompt consistently point at `/vende` across surfaces (coordinated with
  the promoter-funnel `{url}` fix).
- A quick **OG/preview** re-verify when sharing `/vende` (validate the OG image renders + unfurls; headers say
  it should — confirm the actual unfurl).

## Out of scope (v1)
- Any redesign of `/vende` or `/agent` content beyond translation.
- Adding the benchmark/personas to `/agent` (we keep `/vende` as the rich target instead).
- Off-page SEO / backlink building beyond "submit + request indexing" (a longer growth effort).
- The setup-prompt rewrite itself (owned by `seller-agent-connect-mcp-url`; `/agent` just inherits it).
- Adding `/agent` to the bilingual allow-list.

## Acceptance criteria (Daniel-testable)
- A **written decision** exists naming why the domain wasn't indexed + a prioritized action list; the ops
  actions (Search Console verify, sitemap submit, request-index for `/`, `/vende`, `/agent`) are done or
  explicitly owed to Daniel.
- Within the crawl window, `site:miyagisanchez.com` returns pages (or Search Console shows them Indexed) —
  stated as a **post-submit outcome**, not a merge gate (indexing is asynchronous).
- `/agent` renders in **es-MX**; the machine-readable JSON-LD/schema keys remain valid; agents still relay in
  the user's language.
- Sharing `https://miyagisanchez.com/vende` produces a correct link **preview** (title, description, OG image).
- The promoted prompt everywhere points to `https://miyagisanchez.com/vende`.

## Slices (epic `07-agentic-and-federated-commerce/agent-discovery-and-indexing`)

### Spike S0 — Indexing diagnosis → written decision (do FIRST, no build)
- Investigate the 5 questions above against Search Console + live crawler-UA responses. **Output:** the
  decision doc + action list. Gate: nothing in S2 builds until this lands. *(ops/investigation — Daniel holds
  Search Console access; agent can audit headers/robots/sitemap/`llms.txt`/manifest.)*

### Sprint 1 — es-MX `/agent` + prompt-target consistency + OG re-verify (Low, ships alone)
| # | Story | Risk | QA |
|---|---|---|---|
| 1 | **As a** Spanish-speaking visitor/agent, **I want** `/agent` in es-MX, **so that** it isn't jarringly English. (translate rendered copy in `agent/page.tsx` + the `.en` about sections it pulls; keep JSON-LD keys English) | Low | `api` spec: `/agent` SSR HTML contains es-MX headings + no stray English body; JSON-LD still valid |
| 2 | **As a** seller/agent, **I want** the promoted prompt to consistently open `/vende`, **so that** the richest page is evaluated. (align copy across surfaces; coordinate with promoter `{url}` fix) | Low | `api` spec: promoted prompt strings resolve to `…/vende` (or `/vende/promotor`) |
| 3 | **As a** sharer, **I want** `/vende` to unfurl correctly, **so that** links look right. (verify OG image + tags render/unfurl; fix only if broken) | Low | Manual unfurl check (Daniel) + OG-image `api`/render assert |

### Sprint 2 — Execute the spike's code/config fixes (only if S0 finds any)
- Conditional on S0. Could be Low (a canonical/`X-Robots-Tag` tweak, an explicit crawler allow-list in
  `robots.txt`) or ops-only (nothing to build). Risk tier decided when the cause is known.

## QA stage
- **Deterministic gate (code stories):** `tsc --noEmit` + `npm run build` + Playwright `api` suite; an `api`
  spec per translated/changed surface (LEARNINGS: when you touch a framework-generated surface — robots/
  sitemap/OG — diff exact bytes + grep specs asserting it).
- **Owed to Daniel:** Search Console verification + submission + the async "did it get indexed" read; the real
  link-unfurl check; judging whether ChatGPT/Gemini now find the site by search (post-index, out-of-band).

## Risk tiers
S0 spike + Sprint 1 **Low** (investigation + copy/config, no money/auth/commerce). Sprint 2 risk set by the
finding. No kill-switch (no live-commerce path).

## Open questions for Daniel
1. **Search Console access:** is `miyagisanchez.com` already a verified property? If yes, share Coverage; if no,
   I'll draft the verify + submit steps for you to run (DNS/HTML-tag verification).
2. **Explicit AI-crawler allow-list:** want named `GPTBot` / `Google-Extended` / `OAI-SearchBot` /
   `PerplexityBot` lines in `robots.txt` (explicit control), or keep the current allow-all? Default: keep
   allow-all; add named lines only if the spike shows a benefit.
3. **`/agent` placement:** confirm the es-MX `/agent` chore stays under **07** (cohesion) vs **09-Platform**.
   Default: 07.
