# UI refresh before launch — Sprint 2: Polish passes — buyer core + marketing

**Status:** ⬜ not started

## Stories

### Story 2.1 — Polish pass: buyer core (home, /l, PDP)
**As** a buyer, **I want** the launch-visible surfaces to carry the new feel beyond what tokens alone
express — spacing rhythm, card hierarchy, motion on interactions, calm content-first reading on PDP,
**so that** the first impression is top-shelf.
Token re-skin constraint holds: component polish, no structural rewrites. Extend the design-token
guard's `enforcedSweptPaths` with each file touched (LEARNINGS: enforce exactly what you swept).
**Acceptance:** Daniel preview-approves each surface; guards + perf budget green; browser smoke specs
for the key interactions stay green.
**Risk:** low

### Story 2.2 — Polish pass: marketing pages (/vende, /acerca, /agent)
**As** a seller prospect (or their AI), **I want** the campaign pages polished to the same standard,
**so that** the ad-driven first touch matches the product.
Keep agent-readability intact — the `agent-readability.spec.ts` guard (epic
`agent-readability-marketing-surface`) must stay green; content/DOM stays fetch-parseable.
**Acceptance:** Daniel preview-approves; agent-readability spec green; es-MX copy untouched (rule #5).
**Risk:** low

## Sprint QA
- **api spec(s):** agent-readability spec + token guards + perf budget (all existing)
- **browser smoke owed:** yes, to Daniel — preview pass per surface
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: branch preview, then production · https://miyagisanchez.com

1. Home → browse → PDP on your phone.
   → Consistent rhythm and hierarchy; PDP reads calm and content-first; interactions feel intentional.
2. Open /vende and /acerca.
   → Same design language as the product; prompts/copy unchanged.
3. Ask your AI to read miyagisanchez.com/acerca.
   → Still fully readable (the CI spec guards this, but confirm once by hand).

If any step fails, note the step number + what you saw — that's the bug report.
