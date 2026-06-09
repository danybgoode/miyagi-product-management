# Agent-readable why-sell / about surface — Sprint 1: Content source + /acerca human page

**Status:** ✅ built on `feat/agent-readable-about-surface` — S1.1 `8a23dc7`, S1.2 `be36a41`. Gate
green (tsc + `npm run build` + Playwright `api` 300-pass incl. the new `about-content` spec; the
`design-token-foundation` raw-color guard stays green; the anonymous `about-acerca` browser smoke
passes). Awaiting PR → merge.

> Builds the **single bilingual content source** + the human-facing `/acerca` page that renders from
> it. Sprint 2 renders the same source to the agent surfaces. Reuses #4 tokens + #6 section components.

## Stories

### Story 1.1 — Structured bilingual content source ✅ `8a23dc7`
**As a** maintainer, **I want** the supply-side/about story in one structured bilingual source, **so
that** every surface (human + agent) renders from one place without drift.
**Acceptance:** `lib/about-content.ts` (no DB) exports sections — `what_is` · `why_sell` ·
`how_to_start` · `cost_transparency` · `pricing` · `founder` · `philosophy` — each with `es` + `en`.
Groundable sections written from shipped facts (0% comisión, multi-channel, AI-native, bulk import →
`/sell`); **`founder` + `pricing` are explicit, clearly-labelled stubs** (placeholder text, no
invented founder claims or prices). A pure unit test asserts every section has both locales.
**Risk:** low.

### Story 1.2 — `/acerca` human page (es/en) ✅ `be36a41`
**As a** prospective seller (or their agent), **I want** one page that explains what Miyagi is, why
sell here, how to start, what it costs, and who's behind it, **so that** I can decide and begin.
**Acceptance:** `/acerca` renders all sections from `lib/about-content.ts` in **es and en** (locale
per AGENTS rule 5), on **#4 tokens** + **#6 section components**; **semantic HTML** (real text, not
image-baked — agent-fetchable); a soft CTA *"empieza gratis"* → `/sell?from=acerca`; cross-linked
with `/vende`; added to `sitemap.xml`; JSON-LD `Organization` present; stubs render as visible
"próximamente" placeholders, never as fake content.
**Risk:** low.

## Sprint QA
- **api spec(s) ✅:** `e2e/about-content.spec.ts` (pure) — every section has `es`+`en`, the two stubs
  are flagged `stub:true` and the five grounded sections are not, the seven ids are covered, CTA →
  `/sell?from=acerca`. (200/why-sell-heading/sitemap-`/acerca` are asserted by the browser smoke +
  the local curl smoke below; the sitemap entry is in `app/sitemap.ts`.)
- **browser smoke owed:** no — anonymous (`e2e/about-acerca.browser.spec.ts` ✅: es+en render, the
  founder/pricing stubs show the badge, CTA navigates to `/sell?from=acerca`). Not owed to Daniel
  (no auth/money). Verified locally against `next start` (es+en+sitemap+JSON-LD via curl, both
  browser tests pass).
- **deterministic gate ✅:** `tsc --noEmit` clean + `npm run build` passes (`/acerca` route emitted) +
  Playwright `api` 300-pass; the #4 `design-token-foundation` raw-color guard stays green.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open `https://miyagisanchez.com/acerca`.
   → The about/why-sell page renders: what Miyagi is, why sell, how to start, cost, pricing, founder.
2. Switch language to English (locale toggle / `?lang=en`).
   → The same sections render in English (no missing strings).
3. Find the founder + pricing sections.
   → They show clearly-marked "próximamente / coming soon" placeholders — **no invented claims/prices**.
4. Click *"Empieza gratis"*.
   → You land on `/sell?from=acerca`.
5. Open `https://miyagisanchez.com/sitemap.xml`.
   → `/acerca` is listed.
6. (Agent check) Ask Claude/Perplexity: *"¿qué es miyagisanchez.com/acerca?"*
   → The agent fetches + summarizes the why-sell story from the page's real text.

If any step fails, note the step number + what you saw — that's the bug report.
