# Sprint 2 — Copy + es-MX implementation  ·  status: ⬜ not started

> Land the approved S1 copy. Almost entirely edits to **one file**: `apps/miyagisanchez/locales/es.json
> → sellerAcquisition`. Plus the `mundial` page's inline strings (it's bespoke, not on the shared system).
> Depends on Sprint 1 sign-off.

## Goal
Every `/vende*` page reads as intentional, fully-accented es-MX copy written for its persona; the
distrust framing is gone; the CTA copies the directive prompt.

## Stories
### US-2 — Replace placeholder copy with approved es-MX strings ⬜
**As** supply traffic, **I want** every `/vende*` page to read as intentional, accented es-MX copy
written for my persona, **so that** it persuades instead of reading like placeholder.
**Acceptance:**
- all approved strings from `COPY-BRIEF.md` land in `locales/es.json → sellerAcquisition`;
- `shared.trustPrompt` is the **directive prompt** (per-page URL if S1 decided so); `TrustPromptCopy`
  copies it verbatim;
- **`"No pedimos fe"` removed everywhere** (`*.agentTitle`/`agentBody` re-voiced to the self-eval invite);
- internal jargon removed from user-facing copy (router `routerLead`, proof `proofLead`);
- accents/ñ/¿¡ correct across the whole `sellerAcquisition` block, **including `mundial`** (light-touch:
  correctness + de-distrust only, no deep rewrite — window closes Jul 19);
- OG/SEO `metadata` + `opengraph-image` copy updated to match new headlines where they diverge.
Risk: low.

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` green.
- **Specs:** anonymous browser smoke per page (renders; CTA button copies the new directive prompt —
  assert clipboard text contains the ML/Shopify comparison instruction). A cheap pure-logic/`api` spec
  or grep assertion that **no un-accented offender** (e.g. `comision`, `publicacion`, `Que tipo`) and
  **no "No pedimos fe"** string remains in `sellerAcquisition`.
- Confirm no raw hex / token regressions introduced.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: PR Vercel preview pre-merge; `https://miyagisanchez.com` after deploy.

1. Open `{BASE_URL}/vende`.
   → Hero, proof, router, FAQ, closing all read as accented es-MX (á/é/í/ó/ú, ñ, ¿/¡), no placeholder feel.
2. Find the "ask your agent" block on every page.
   → It is **not** titled "No pedimos fe"; it invites you to verify it yourself.
3. Click the copy-prompt button.
   → Clipboard contains the directive prompt (reads miyagisanchez.com/vende, evaluate for my business,
     compare cost vs Mercado Libre & Shopify, what could I sell + how to start).
4. Paste that prompt into Claude/Gemini/ChatGPT.
   → The agent returns a tailored fit-assessment **and** a ML/Shopify cost comparison (sanity check the CTA works).
5. Open `/vende/creadores`, `/vende/negocios`, `/vende/servicios`.
   → Each reads as its persona's pitch (value prop × job-to-be-done), fully accented, no jargon leak.
6. Open `/vende/mundial`.
   → Renders, accents fixed, no "No pedimos fe"; CTA still → `/sell?type=service&from=mundial`.

If any step fails, note the step number + what you saw — that's the bug report.
