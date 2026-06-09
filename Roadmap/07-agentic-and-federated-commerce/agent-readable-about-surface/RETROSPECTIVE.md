# Agent-readable why-sell / about surface — Retrospective

_Closed: 2026-06-09_

**Area:** 07 · Agentic & Federated Commerce · **Risk:** low · 2 sprints. Frontend-only (Vercel); no
backend, no migration. **PRs:** S1 #57 (`0f71ff5`) · S2 #59 (`c12c969`).

## What shipped
The unlock for the "No nos creas, pregúntale a Claude" campaign: when a prospective seller asks their
own AI *"¿qué es miyagisanchez.com y por qué vendería ahí?"*, every machine surface now answers
supply-side (what Miyagi is · why sell · how to start · what it costs), not just buyer/catalog.

- **S1 — content source + `/acerca`** (`0f71ff5`). One structured bilingual source
  `lib/about-content.ts` (es/en, 7 sections; founder + pricing as explicit `stub: true` placeholders —
  no invented claims/prices), rendered to the human `/acerca` page (the one deliberate bilingual human
  page on the allow-list).
- **S2 — expose to agents** (`c12c969`). A pure `next`-free seam `lib/about-agent.ts` projects that
  source onto four agent surfaces + holds one shared `RELAY_LANGUAGE_DIRECTIVE`:
  - manifest `about` block (`GET /api/ucp/manifest`) — summary/why-sell/how-to-start/cost/pricing/links;
  - `/agent` "Para vender — why sell here" section + directive in the WebAPI JSON-LD;
  - `GET /llms.txt` (English-primary + es `Resumen`) and `robots.ts` → `robots.txt/route.ts` carrying
    `# LLM guidance` + `# Capability manifest` comment pointers;
  - MCP `about_miyagi` **tool** (`tools/call`) + **resource** (`about://miyagi`, `resources/list`/`read`).
  - QA: `e2e/agent-about-surface.spec.ts` (`4b7100a`) — each agent surface carries content **and** the directive.

## What went well
- **Author-once / render-many held perfectly.** One content edit updates `/acerca` + all four agent
  surfaces because they all import the same source. A pure seam (`lib/about-agent.ts`, no `next/*`)
  let the Playwright `api` runner unit-test every surface's payload directly.
- **Medusa-first, zero blast radius.** No commerce/DB/Medusa/auth touched — additive, public, anonymous.
  The MCP resource slotted beside existing tools (advertise `resources:{}` at `initialize`, handle
  `resources/list`/`read`); buyer endpoints stayed byte-for-byte.

## What we learned
- **Replacing a framework-generated artifact with a hand-rolled one can break a spec on exact format.**
  `robots.ts` (typed `MetadataRoute.Robots`) → `robots.txt/route.ts` changed the serializer's
  `User-Agent: *` to a hand-written `User-agent`, tripping `own-shop-seo.spec.ts`. The local gate passed
  (my spec didn't assert that casing); **CI caught it against the preview.** When you swap a generated
  surface for a hand-rolled one, diff the *exact bytes* the old one emitted and grep the suite for any
  spec asserting it. → promoted to `LEARNINGS.md`.
- **One short relay directive beats N locales for a global-audience surface.** es-MX canonical + en
  lingua-franca + "present this in the user's own language" makes the *reading agent* the localization
  layer. Keep the directive's assertion phrase apostrophe-free ("in their own language") so it survives
  HTML escaping and stays a robust test target. → promoted to `LEARNINGS.md`.

## Gaps / follow-ups
- **Content fill owed by Daniel:** founder's note + anonymized profile + philosophy + final premium
  pricing replace the `stub: true` sections (they render "próximamente" today).
- **Live smoke owed to Daniel:** the end-to-end human "ask Claude in another language → it relays in
  that language" confirmation (sprint-2 steps 6–7). Steps 1–5 are covered by the api spec, anonymous.
