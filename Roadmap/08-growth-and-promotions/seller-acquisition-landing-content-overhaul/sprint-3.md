# Sprint 3 — Benchmark + AI-channel sections  ·  status: 🏗️ built 2026-06-25 (PR #127 — US-3 `c943349`, US-4 `0fb9543`)

> Two small new sections on the **anchor** (`/vende`), built from `globals.css` primitives and wired
> through `_components/page-config.ts` + `SellerAcquisitionSections.tsx`. Depends on Sprint 2 copy.
>
> **Built off `origin/main` (`af690ad`, S2 merged) — the local app checkout was stale at `740f967`.**
> Both sections are **anchor-only + config-driven** (`benchmark`/`aiChannel` undefined on persona
> builders → they don't render there). Copy verbatim from `COPY-BRIEF.md` §4/§5; `es.json` + `en.json`
> mirrored for type-parity. **Gate green locally:** `tsc` ✓, `npm run build` ✓, Playwright **api** ✓
> (34 specs incl. the two new ones + copy/SEO + design-token guard). **Owed Daniel:** the rendered
> browser + 360/390px mobile eyeball on the PR #127 preview (opt-in `seller-acquisition-anchor-s3.browser.spec.ts`
> covers it + runs nightly).

## Goal
The anchor shows a truthful Miyagi vs Mercado Libre vs Shopify benchmark and communicates the
sell-through-AI channel honestly.

## Stories
### US-3 — Anchor price/feature benchmark table ✅ (PR #127 `c943349`)
**As** a cost-sensitive seller, **I want** a clear Miyagi vs Mercado Libre vs Shopify comparison on
`/vende`, **so that** I see the savings without doing the math.
**Acceptance:** a **responsive** comparison-table section on `/vende` only (cost + key features),
populated from the S1 benchmark copy, **sourced + date-stamped**; uses the 0%-*platform*-commission
framing (not "0 costos"); persona pages keep their one-line cost hook (no full table). New section is
config-driven via `page-config.ts` so it lives in the anchor config. Risk: low.

### US-4 — AI-channel value-prop section ✅ (PR #127 `0fb9543`)
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
Env: **PR #127 Vercel preview** pre-merge; `https://miyagisanchez.com` after deploy.

> **Gate owned (done):** `tsc --noEmit` ✓, `next build` ✓, Playwright **api** project ✓ — new
> `seller-acquisition-benchmark.spec.ts` (structure · 0%-platform-commission framing · ranges ·
> date stamp) + `seller-acquisition-aichannel.spec.ts` (UCP/MCP framing · anti-vaporware guard),
> plus existing copy/SEO specs + the design-token guard (no raw hex). **Owed to Daniel:** the rendered
> browser walkthrough below (anonymous — no auth needed), especially the 360px table reflow which can't
> be fully asserted in the api gate. The opt-in `seller-acquisition-anchor-s3.browser.spec.ts` covers
> it and runs nightly via `browser-smoke.yml`.

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
