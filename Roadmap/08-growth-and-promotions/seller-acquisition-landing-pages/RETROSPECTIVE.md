# Seller-Acquisition Landing Pages (#6) — Retrospective

_Build shipped: 2026-06-07 · Doc close-out: 2026-06-10 (reconciled during the Navigation & Settings Reorg groom)._

## What shipped
A greenfield supply-side recruitment funnel — landing pages that pitch *selling on Miyagi* and route into
the existing `/sell` onboarding, riding the 2026 FIFA World Cup tailwind. Frontend-only (Vercel), zero
backend/commerce/DB.
- **S1 — Strategy & creative lock** (docs): personas, positioning, IA, per-persona es-MX copy, metrics/attribution.
- **S2 — World-Cup wedge** `/vende/mundial` on existing tokens, CTA → `/sell?type=service`, Clarity + UTM —
  PR #42 (`fd0f2df`).
- **S3 — Anchor + Creator system** — reusable section system on #4 design tokens, anchor `/vende` + persona
  router, Creator page `/vende/creadores` — PR #44 (`ea1ae07`; US-3 `6bfa484`, US-4 `8e0fce1`, US-5 `911b359`).
- **S4 — More personas + SEO/OG + A/B** — `/vende/negocios`, `/vende/servicios`, per-persona SEO/OG, A/B
  hooks (`SellerAcquisitionVariantTag`) — PR #45 (`cfe04ef`).

Live surface: `app/vende/` (`page.tsx` anchor via `buildAnchorPageConfig`, `creadores`/`negocios`/`servicios`,
`mundial`, `opengraph-image.tsx`, `_components/SellerAcquisitionSections.tsx`).

## What went well
- **Two-track split (wedge first, durable system second) shipped value before the Jun 11 tailwind** without
  blocking the durable build on #4 tokens — the WC wedge rode the tokens that already existed.
- **Frontend-only, low-risk throughout** — pure presentation pages routing to existing onboarding, so each
  page merged independently on a green CI gate with no money/auth exposure.
- **Agent-fetchable from day one** (semantic HTML + real text + structured metadata), so the "ask Claude"
  pillar worked the day the pages shipped.

## What we learned
- **The build outran the docs — and nobody closed the epic.** All four sprints merged 2026-06-07 with PR refs
  recorded *in the sprint files*, but the epic README still read "S3 ⬜ next / S4 ⬜ planned", there was no
  RETROSPECTIVE, no poster line, and `BUILD-ORDER.md` showed it 🏗️. It surfaced only when a later groom
  (Navigation & Settings Reorg) hit `/vende` and had to validate whether #6 was unfinished or just undocumented.
  → **Durable learning (promoted to LEARNINGS.md):** the epic close-out (README ✅ + RETROSPECTIVE + poster +
  LEARNINGS + BUILD-ORDER + seed frontmatter) is a *distinct step from merging the last PR* — if it's skipped,
  the docs silently lie and the next groom pays a validation tax. Close the epic in the same session the last
  sprint merges.

## Gaps / follow-ups
- **Live conversion read** (Clarity funnel `/vende/* → /sell → publish`) is owed to Daniel — the pages are
  instrumented (UTM + Clarity) but the post-launch performance review wasn't recorded here.
- Spawned, out of this epic (already tracked elsewhere): agent-readable why-sell/about surface ✅, Onboarding 0 ✅,
  pricing/business-model + founder/philosophy content (still stubs).
- This retro is a **late reconstruction** (2026-06-10) from the sprint docs + shipped code, not a fresh
  post-merge write-up — treat the "what went well" as inferred from the artifacts.
