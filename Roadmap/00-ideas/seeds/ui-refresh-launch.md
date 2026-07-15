---
title: "UI refresh before launch — material feel, Kindle-like calm"
slug: ui-refresh-launch
status: scaffolded
area: "09"
type: feature
priority: "#6"
risk: high
epic: "09-platform-infra/ui-refresh-launch"
build_order: "#6"
updated: 2026-07-14
---

# Seed — UI refresh before launch

**Captured in:** `Roadmap/00-ideas/audits/batch-groom-2026-07-14.md` (Ask 5). **Groomed 2026-07-14
(same-day session, Fable trial). Decisions (Daniel):** "material"/"Kindle" are inspiration, not spec —
apply *current* Material heuristics for a top-shelf feel, calm content-first on reading surfaces;
scope is **site-wide via the token layer** (why no per-page choice was needed), polish passes
sequenced by risk with **checkout last (HIGH, Daniel merges)**; **token re-skin only, no component
rewrites**. Still sequenced AFTER the perf epic (its budgets become acceptance constraints).
Epic: `09-platform-infra/ui-refresh-launch` (3 sprints).

**The ask (Daniel's words):** optimization-focused UI upgrade to a "material feel", "Kindle-like
experience", before launch.

**Open questions for the groom session:**
- "Material" (elevation/motion) and "Kindle-like" (calm, still, e-ink-ish reading) pull opposite
  directions — which wins where? Likely split: calm reading surfaces (PDP, /acerca, zine) vs
  material interaction surfaces (nav, seller portal)?
- Which surfaces are in v1 — buyer-facing (home, `/l`, PDP) vs seller portal (already has
  `seller-portal-rails-foundation`)?
- Constraint that decides the size: `design-token-foundation` shipped tokens + CI raw-color guards —
  this should be a **token re-skin, not a component rewrite**.
- Perf epic's budgets become acceptance constraints here (no regression past the new perf guard).
