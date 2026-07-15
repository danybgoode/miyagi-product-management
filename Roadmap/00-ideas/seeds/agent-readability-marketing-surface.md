---
title: "Agent-readability P0 — /acerca empty to fetch agents, OG template, CI guard spec"
slug: agent-readability-marketing-surface
status: scaffolded
area: "07"
type: bug
priority: "#2"
risk: low
epic: "07-agentic-and-federated-commerce/agent-readability-marketing-surface"
build_order: "#2"
updated: 2026-07-14
---

# Scope — Agent-readability & marketing-surface hardening

**Groomed in:** `Roadmap/00-ideas/audits/batch-groom-2026-07-14.md` (Ask 1). Approved 2026-07-14.
All findings validated live 2026-07-14 with a non-JS fetch agent.

**Goal:** the advertising phrase "pregúntale a tu IA por **miyagisanchez.com**" (bare domain — no
`/vende` needed) always works, and stays working via CI.

**What already works (reuse, don't rebuild):** `robots.txt` → `llms.txt` → route map; `/agent`
briefing; UCP manifest; `/vende` fully fetch-readable with canonical + own OG image; `/` server-rendered
with `/agent` in nav. Built by `agent-discovery-and-indexing`, `agent-readable-about-surface`,
`marketplace-positioning-meta`.

## Story 1 — Fix `/acerca` returning an empty body to non-JS fetchers (P0)
Reproduction (3× today): `GET /acerca` → empty body, no metadata. `GET /acerca?lang=en` → full page.
Code on `main` (`app/(shell)/acerca/page.tsx`) is a correct server component. Prime suspect: bad/empty
response cached at the Cloudflare edge (or Cloud Run static/ISR layer) for the parameterless path since
the Vercel→Cloud Run cutover (2026-07-10); the query string busts the cache.
**Acceptance:** bare `/acerca` returns full HTML to a plain fetch; root cause written in the PR;
regression spec added (Story 3 covers it permanently).

## Story 2 — OG/metadata sweep: shared template, per-page headline (Daniel's call, 2026-07-14)
One branded OG visual template; `/` keeps the general pitch, `/vende` keeps "0% comisión" seller copy.
Fix inconsistencies found: `/acerca` has no OG image; `/agent` lacks canonical and its `og:url` points
at `/`; `/terminos` `og:url` points at `/`.
**Acceptance:** posting `/` and `/vende` in WhatsApp/Telegram/X shows the same visual frame with
page-appropriate headlines; every key page has canonical + correct `og:url` + an OG image.

## Story 3 — Agent-readability CI spec (the guard)
Playwright `api`-project spec: fetch `/`, `/vende`, `/acerca`, `/agent`, `/llms.txt`, `/robots.txt`,
`/api/ucp/manifest` without JS; assert substantive content (not just 200) + expected OG/canonical tags.
**Acceptance:** spec red against today's prod `/acerca` behavior (observed-red rule), green after
Story 1; runs in the deterministic gate.

**Out of scope:** new agent routes; llms.txt content changes; SEO/brand-query work ("miyagisanchez"
without ".com" resolves via search — separate concern if ever needed).

**Risk:** low (no money paths; `head` metadata is shared surface → announce the PR).
**Smoke walkthrough owed:** paste both URLs into WhatsApp + Telegram, screenshot previews (Daniel).
