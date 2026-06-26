---
status: scaffolded
slug: seller-acquisition-landing-content-overhaul
---

# Seller-Acquisition Landing Pages — Content Strategy + es-MX + Mobile Overhaul (v2)

> **Epic — content-led re-polish of the shipped seller funnel.** The original epic
> (`seller-acquisition-landing-pages`, shipped 2026-06-07) built the *structure*; this epic puts real,
> intentional **es-MX content** inside it, fixes the broken "ask your agent" CTA, adds a truthful
> **price benchmark** + an **AI-channel** value prop, and does a full **mobile-responsive sweep**.
> **Scope doc (approved 2026-06-25):**
> `../../00-ideas/2. readyforscope/seller-acquisition-landing-content-overhaul.md`.
>
> **Status: in progress.** S1 ✅ (COPY-BRIEF approved 2026-06-25) · S2 ✅ shipped 2026-06-25
> (PR #125 squash `af690ad`) · S3 🏗️ built 2026-06-25 (PR #127 — US-3 `c943349`, US-4 `0fb9543`;
> anchor benchmark table + AI-channel section) · S4 ⬜ mobile sweep. Build order: S1
> copy brief (no code) → S2 copy + es-MX → S3 benchmark + AI-channel → S4 mobile sweep.

## Why
The landing pages exist but the copy is placeholder: no depth, no intentionality, written in Spanish
**without accents/ñ/¿¡**, leaning on a distrust framing ("No pedimos fe"), leaking internal jargon
("conserva la atribución" to users), and shipping a CTA that copies the weak string
`"que es miyagisanchez.com?"` — which makes a visitor's agent return a generic definition, not the
tailored, cost-compared evaluation we want. The pages also overflow on mobile. This epic makes the
funnel actually persuade: persona copy mapped to value props × jobs-to-be-done, a working
self-evaluation prompt, a truthful Miyagi vs Mercado Libre vs Shopify benchmark, the sell-through-AI
channel communicated honestly, and a clean mobile build.

## Context
| | |
|---|---|
| **Class** | Feature (content-led growth) on a shipped surface, with an embedded mobile bug-fix track |
| **Macro-section** | 08 · Growth & Promotions |
| **Risk** | **Low** across all stories — marketing pages, no payments/checkout/fulfillment/auth/DB/money. *Caveat:* any mobile fix that reaches `globals.css` or `(shell)/layout.tsx` must be announced (LEARNINGS). Work is contained to `locales/es.json` + `app/(shell)/vende/**`. |
| **Relates to** | Re-polish of `08-growth-and-promotions/seller-acquisition-landing-pages` (shipped). |
| **Spawns (not here)** | retire/repurpose `/vende/mundial` after Jul 19 · agent-readable "why-sell/about" surface (fed by this epic's copy). |
| **Decisions (2026-06-25)** | directive copy-paste prompt · benchmark table anchor-only · `/vende/mundial` light-touch · AI-channel framed via UCP/MCP. |

## Medusa-first reframe
**Zero Medusa, zero commerce, zero backend, zero new data model.** All copy lives in one JSON block
(`locales/es.json → sellerAcquisition`); pages render from a shared section system. AGENTS five rules
satisfied trivially (public pages, es-MX, no commerce, Clerk untouched).

## What already exists (reuse, don't rebuild) — verified 2026-06-25
- **All landing copy, single source** — `apps/miyagisanchez/locales/es.json → sellerAcquisition`
  (`shared`, `anchor`, `creadores`, `negocios`, `servicios`, `mundial`). The copy + accent sweep is edits here.
- **Shared section renderer** — `app/(shell)/vende/_components/SellerAcquisitionSections.tsx` (hero ·
  proof · persona router · steps · social · FAQ · closing). Mobile fixes land once → all config pages benefit.
- **Per-page config builder** — `_components/page-config.ts` (`buildAnchorPageConfig`, …). Where the new
  benchmark / AI-channel blocks wire into the anchor config.
- **Copy-paste CTA** — `_components/TrustPromptCopy.tsx` (clipboard wiring already works). Feed it the new prompt.
- **Standalone WC page** — `mundial/page.tsx` (bespoke, *not* on the shared system). Light copy fix +
  separate mobile fix — every cross-cutting change must be re-applied here.
- **Routing/variant/UTM logic** — `lib/seller-acquisition.ts` (tested pure seam). Unchanged.
- **Design tokens** — `globals.css` (`.btn`, `.card-tile`, `.badge`, `.t-*`, `--s-*`, `--r-*`). Build the table/sections from these.
- **Agent rails (grounds the AI-channel claim)** — `/agent`, `GET /api/ucp/manifest`, `POST /api/ucp/mcp`, `.well-known/ucp`.
- **SEO/OG** — `*/opengraph-image.tsx` + per-page `metadata`. Update OG copy to match new headlines.
- **Microsoft Clarity** (connected) — measure the effect; no new analytics build.

## Scope (stories)
| Sprint | Story | Risk | Owner |
|---|---|---|---|
| **1 — Copy & content brief** (no code) | US-1 full per-persona es-MX copy deck + final prompt(s) + benchmark copy + AI-channel copy, locked in writing | low (docs) | **Cowork + Daniel sign-off** |
| **2 — Copy + es-MX implementation** | US-2 land all approved strings in `es.json`; kill "No pedimos fe"; directive prompt in CTA; accents/ñ/¿¡ correct everywhere (incl. mundial light) | low | Claude Code |
| **3 — Benchmark + AI-channel** | US-3 anchor Miyagi vs ML vs Shopify table (sourced, dated) · US-4 AI-channel value-prop section (UCP/MCP framing) | low | Claude Code |
| **4 — Mobile-responsive sweep** | US-5 no overflow at 360/390/414px across all `/vende*` pages | low (announce if shared layout/`globals.css`) | Claude Code |

## Deploy order
Frontend-only (Vercel). No backend, no migration. **S1 (brief, no code) → S2 (copy) → S3 (sections) →
S4 (mobile).** Each sprint independently shippable; merge per sprint. All low-risk → reviewer may
auto-merge on green CI **except** any story touching `globals.css`/`(shell)/layout.tsx` (announce +
higher-care). *Note:* US-5 (mobile) is copy-independent and may run first if Daniel wants a quick
correctness win before content lands.

## Epic Definition of Done
- [ ] All sprints' stories merged to `main` and smoke-tested (gaps stated).
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough (real prod URLs once deployed).
- [ ] No "No pedimos fe" / un-accented offenders remain in `sellerAcquisition` (grep clean).
- [ ] Benchmark table is sourced + date-stamped; figures re-verified at publish.
- [ ] This `README.md` marked ✅; every `sprint-N.md` ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written; durable learnings promoted to `Roadmap/LEARNINGS.md`.
- [ ] Product poster (`Roadmap/README.md`) updated; team memory updated.
- [ ] Branch deleted; PR(s) merged.
