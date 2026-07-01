# Agent discovery & indexing — Sprint 1: es-MX `/agent`, prompt-target consistency, OG re-verify

**Status:** 📋 planned (approved 2026-07-01) · branch `feat/agent-discovery-and-indexing` off latest `main`
**Risk:** low (copy/config, no money/auth/commerce) — reviewer may auto-merge on a green gate.

> Runs after (or alongside) the **S0 spike** in the epic README. Sprint 1's stories don't depend on S0's
> outcome; S0 gates only the conditional Sprint 2.

## Story 1.1 — Translate `/agent` to es-MX
**As a** Spanish-speaking visitor/agent, **I want** `/agent` in es-MX, **so that** it isn't jarringly English.
**Root cause:** `app/(shell)/agent/page.tsx` renders entirely English body copy and pulls `getAboutSection(...)
.en` sections + English `ucp-use-cases.json` strings.
**Changes:** translate the **rendered** headings/prose/labels to es-MX (pull the `.es` about sections; provide
es-MX use-case copy). **Keep** the machine-readable JSON-LD/schema **keys** in English (they're API contract),
and keep brand/protocol names as-is (UCP, MCP, Stripe, MercadoPago). Do not add `/agent` to the bilingual
allow-list.
**Acceptance:** `/agent` SSR HTML shows es-MX headings/body (no stray English sentences in the visible copy);
the JSON-LD block still parses and carries the relay-language directive; agents still relay in the user's
language.
**Risk:** low · **QA:** `api` spec: `/agent` HTML contains es-MX markers + no known English body strings;
JSON-LD still valid. (Per LEARNINGS: when touching a framework-generated/asserted surface, grep the suite for
stale English assertions and update them in the same PR.)

## Story 1.2 — Promoted prompt consistently targets `/vende`
**As a** seller/agent, **I want** the promoted "ask your agent" prompt to open `/vende` everywhere, **so that**
the richest page (cost comparison + personas) is what gets evaluated.
**Changes:** audit the promoted prompt strings across surfaces (the `/vende` anchor, `/agent`'s buttons, the
navbar sheet preamble) so they resolve to `https://miyagisanchez.com/vende` (or `/vende/promotor` for the
promoter context — coordinated with the promoter-funnel `{url}` fix). No redirect of `/agent` itself.
**Acceptance:** the promoted prompt strings resolve to `…/vende` (or `/vende/promotor`); `/agent` still exists
as the machine briefing but isn't the promoted *evaluation* target.
**Risk:** low · **QA:** `api` spec asserting the promoted prompt URLs.

## Story 1.3 — Re-verify the `/vende` link unfurl
**As a** person sharing a Miyagi link, **I want** `/vende` to unfurl correctly, **so that** shared links look
right.
**Changes:** verify the OG image (`/vende/opengraph-image`) renders and the OG/Twitter tags unfurl; fix only if
broken (headers already look correct).
**Acceptance:** sharing `https://miyagisanchez.com/vende` shows the right title, description, and image.
**Risk:** low · **QA:** OG-image route 200 + render assert (`api`); manual unfurl check owed to Daniel.

## Sprint QA
- **api spec(s):** Story 1.1 (es-MX `/agent` + valid JSON-LD), Story 1.2 (prompt URLs), Story 1.3 (OG route).
- **owed to Daniel:** the real link-unfurl check; Search Console verification/submission + the async
  "did it get indexed" read (S0/epic-level); judging whether ChatGPT/Gemini now find the site by search.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the branch preview URL while testing pre-merge)

1. Open `https://miyagisanchez.com/agent`.
   → The visible copy is **Spanish** (headings, "¿Qué es este marketplace?", sections) — no English body text.
2. View source of `/agent` and find the JSON-LD `<script type="application/ld+json">`.
   → It still parses; keys stay English; the relay-language directive is present.
3. On `/vende` (and `/vende/promotor`) copy the "ask your agent" prompt.
   → It points at `https://miyagisanchez.com/vende` (resp. `/vende/promotor`) — consistent everywhere.
4. Paste `https://miyagisanchez.com/vende` into a link-preview tester (opengraph.xyz) or a WhatsApp draft.
   → Title, description, and OG image all render correctly. **[unfurl — owed to Daniel]**
5. (Epic-level, async) After Search Console submission, search `site:miyagisanchez.com`.
   → Pages begin to appear (or Search Console shows them Indexed). **[indexing — owed to Daniel, asynchronous]**

If any step fails, note the step number + what you saw — that's the bug report.
