# Agent-readability & marketing-surface hardening — Sprint 1: Fix, unify, guard

**Status:** ✅ shipped + live 2026-07-16 — PR [#270](https://github.com/danybgoode/miyagisanchezcommerce/pull/270) (`5a120bd`). 1.1 premise not reproducible (root cause in PR); 1.2+1.3 live, guard spec 16/16 vs prod. Owed: Daniel WhatsApp/Telegram preview smoke.

## Stories

### Story 1.1 — Fix `/acerca` empty body to fetch agents (P0)
**As** an AI agent following llms.txt, **I want** bare `/acerca` to return full HTML, **so that**
"what is miyagisanchez?" gets answered instead of an empty page.
Reproduction (2026-07-14, 3×): `GET /acerca` → empty body, no metadata; `GET /acerca?lang=en` → full
page. Prime suspect: bad/empty response cached at the Cloudflare edge (or Cloud Run static/ISR layer)
for the parameterless path since the Vercel→Cloud Run cutover (2026-07-10).
**Acceptance:** bare `/acerca` returns full HTML to a plain no-JS fetch; root cause written in the PR;
covered permanently by Story 1.3's spec.
**Risk:** low

### Story 1.2 — OG sweep: shared template, per-page headline
**As** Daniel posting marketing URLs, **I want** `/` and `/vende` to share one branded OG visual frame
with page-appropriate headlines, **so that** previews are recognizably ours wherever either URL lands.
Also fixes found inconsistencies: `/acerca` has no OG image; `/agent` lacks canonical and its `og:url`
points at `/`; `/terminos` `og:url` points at `/`.
**Acceptance:** posting `/` and `/vende` shows the same visual frame ( `/` general pitch, `/vende`
"0% comisión"); every key page has canonical + correct `og:url` + an OG image.
**Risk:** low (shared `head` surface — announce the PR)

### Story 1.3 — Agent-readability CI spec
**As** the team, **I want** a Playwright `api` spec fetching `/`, `/vende`, `/acerca`, `/agent`,
`/llms.txt`, `/robots.txt`, `/api/ucp/manifest` without JS and asserting substantive content + expected
OG/canonical tags, **so that** the campaign surface can't silently regress again.
**Acceptance:** spec observed red against the pre-fix `/acerca` behavior (observed-red rule), green
after 1.1; runs in the deterministic gate.
**Risk:** low

## Sprint QA
- **api spec(s):** Story 1.3 → `e2e/agent-readability.spec.ts` (covers 1.1 + 1.2 assertions)
- **browser smoke owed:** yes, to Daniel — paste `miyagisanchez.com` and `miyagisanchez.com/vende` into WhatsApp + Telegram, confirm previews
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Ask Claude (or Gemini): "¿qué es miyagisanchez.com y por qué vendería ahí?"
   → The agent reads llms.txt//acerca and answers with the 0%-commission story — no "page was empty" fallback.
2. Fetch https://miyagisanchez.com/acerca with a no-JS client (or `curl` from your terminal).
   → Full HTML including the founder section.
3. Paste https://miyagisanchez.com and https://miyagisanchez.com/vende into WhatsApp and Telegram.
   → Same branded visual frame; `/` shows the general pitch headline, `/vende` shows the seller "0% comisión" headline.
4. Share https://miyagisanchez.com/agent in Telegram.
   → Preview shows an OG image and its link metadata points at /agent (not /).

If any step fails, note the step number + what you saw — that's the bug report.
