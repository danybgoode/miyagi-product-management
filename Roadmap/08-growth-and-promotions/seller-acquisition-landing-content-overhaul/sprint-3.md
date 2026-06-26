# Sprint 3 — Benchmark + AI-channel sections  ·  status: ⬜ not started

> Two small new sections on the **anchor** (`/vende`), built from `globals.css` primitives and wired
> through `_components/page-config.ts` + `SellerAcquisitionSections.tsx`. Depends on Sprint 2 copy.

## Goal
The anchor shows a truthful Miyagi vs Mercado Libre vs Shopify benchmark and communicates the
sell-through-AI channel honestly.

## Stories
### US-3 — Anchor price/feature benchmark table ⬜
**As** a cost-sensitive seller, **I want** a clear Miyagi vs Mercado Libre vs Shopify comparison on
`/vende`, **so that** I see the savings without doing the math.
**Acceptance:** a **responsive** comparison-table section on `/vende` only (cost + key features),
populated from the S1 benchmark copy, **sourced + date-stamped**; uses the 0%-*platform*-commission
framing (not "0 costos"); persona pages keep their one-line cost hook (no full table). New section is
config-driven via `page-config.ts` so it lives in the anchor config. Risk: low.

### US-4 — AI-channel value-prop section ⬜
**As** a merchant, **I want** to understand selling through AI agents as a new channel, **so that** I
see Miyagi opens a sales surface other platforms don't.
**Acceptance:** an anchor section (+ one proof point reusable on persona pages) explaining — truthfully
via **UCP/MCP** framing — that AI agents (Claude/Gemini/ChatGPT et al.) can find, recommend and buy
from your store, with a one-line "cómo funciona." Copy passes the anti-vaporware guardrail (no named
"buy on ChatGPT" button claim unless verified). Risk: low.

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` green.
- **Specs:** anonymous browser smoke (anchor renders both new sections; table content present); mobile
  render check at 360/390px on the table specifically (tables are the #1 overflow risk).
- Copy review: benchmark figures match S1 sources + carry the date stamp; AI-channel copy is
  UCP/MCP-truthful.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: PR Vercel preview pre-merge; `https://miyagisanchez.com` after deploy.

1. Open `{BASE_URL}/vende` and scroll to the comparison section.
   → A Miyagi vs Mercado Libre vs Shopify table renders with cost + key features, a sources line, and a "verificado <fecha>" stamp.
2. Read the Miyagi cost cell.
   → It says 0% **comisión de plataforma** (not "0 costos"); competitor cells show ranges, not single numbers.
3. Resize to 360px width.
   → The table reflows/scrolls cleanly — no horizontal page overflow, no clipped columns.
4. Scroll to the AI-channel section.
   → It explains agents can find/recommend/buy via the open standard, with a one-line "cómo funciona," and makes no unverified named-assistant purchase claim.
5. Open `/vende/creadores`.
   → No full table; the one-line cost hook is present.

If any step fails, note the step number + what you saw — that's the bug report.
