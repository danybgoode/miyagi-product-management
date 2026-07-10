---
title: "Comparador de costos — the stacking-costs sales tool on the homepage"
slug: cost-comparator-homepage
status: ready
area: "08"
type: feature
priority: wave-3
risk: low
epic: null
build_order: null
updated: 2026-07-09
---

# Comparador de costos — the stacking-costs sales tool on the homepage

**As a** merchant curious about switching (or a consultant pitching one in person), **I want** to enter
my current platform, volume, and paid apps and see my real stacked cost next to Miyagi's — exportable
as a clean report — **so that** the decision (and the consultant's pitch) is grounded in my own numbers.

*Naming note:* the shipped seller-side **Profit Analyzer** (`/shop/manage/profit`, per-SKU margins)
is a different product for a different persona — this one needs its own name. Working title:
**«Comparador de costos»**. Do not reuse "profit analyzer" anywhere user-facing.

## Stage-2.5 bucket: genuinely new, but frontend-heavy with strong reuse
The comparison *data* and framing already exist (the sourced + date-stamped Miyagi vs Mercado Libre vs
Shopify benchmark on `/vende`); the interactive calculator, premium-apps line items, export, and
consultant mode are new.

## Shape
- **Route:** `/comparador`, linked from a homepage teaser card. **Not embedded live on `/`** — the
  homepage is a static CDN asset (LEARNINGS: don't un-static `/`); a client-side calculator route keeps
  `/` untouched and gives consultants a clean URL to open on a phone.
- **Calculator:** pick platform(s) (Shopify plan tiers, ML commission bands, WooCommerce hosting,
  Tiendanube, "marketplace + own site" combos), enter monthly sales volume + AOV, toggle **premium
  apps** (reviews, subscriptions, bundles, upsell — each with its typical price and the Miyagi
  equivalent marked *incluido*). Output: stacked monthly/annual cost bars vs Miyagi (SKU costs only,
  0% commission), fully editable — every cost field is user-overridable, nothing hardcoded-opaque.
- **Cost dataset admin-editable:** prices change; reuse the runtime-copy pattern
  (`platform_copy_overrides` shape) or a versioned JSON config with a date-stamp shown in the UI —
  the `/vende` benchmark's sourcing discipline applies (source + date on every figure).
- **Report export (consultant mode):** generate a styled markdown report (current spend → Miyagi
  equivalent → suggested migration effort) and hand it to the merchant. **smalldocs fits**
  ([github](https://github.com/espressoplease/smalldocs)): styled md, PDF/docx export, encrypted short
  links the server can't read, no build step. Integration v1 = generate the md + open in smalldocs
  with style front-matter (client-side, zero backend); revisit self-hosting only if we outgrow that.
- **URL analysis (stretch, gated):** enter a shop URL → detect platform + rough section inventory →
  prefill the calculator + estimated migration effort (feeds the migrations epic's parity score —
  shared module, build once there, render here).
- **Other personas we're not yet speaking to (Daniel asked):** the report is also the *promoter*
  leave-behind (today they have the sell-sheet but nothing personalized to the merchant's numbers);
  and an agent-readable version (`/comparador` data on `/agent` + an MCP `compare_costs` tool) lets a
  merchant's own AI run the comparison — same primitive, big reach. Both sliced as stories, cuttable.

## What already exists (reuse, don't rebuild)
- `/vende` benchmark table (sourced, date-stamped, es-MX voice) — the seed data + tone.
- Promoter sell-sheet + ad-rate PDF rails — the "consultant hands the merchant a document" pattern.
- Content-overrides admin pattern for the editable dataset; Clarity/UTM attribution on `/vende` pages.
- Migrations epic's parity-score module (if sequenced after it) for the URL analyzer.

## Scope boundary
**In:** `/comparador` calculator + editable dataset + homepage teaser + report export (smalldocs md/
print) + consultant prefill mode + agent-readable surface. **Out (v1):** URL analyzer if migrations
hasn't landed the parity module yet (then it's a fast-follow); lead capture/CRM; login requirement
(it must work anonymous, in person, on a phone).

## Sprint slicing
1. **S1 — calculator + dataset + teaser.** Pure-logic cost model (unit-tested), editable inputs,
   stacked-bars UI, admin-editable dataset. Risk: LOW.
2. **S2 — report + consultant mode + agent surface.** Export via smalldocs, prefillable link, MCP
   `compare_costs`. Risk: LOW.
3. **S3 (conditional) — URL analyzer** riding the migrations parity module. Risk: MED (external
   fetch + token cost — rate-limit it).

## Kill-switch decision
Risk LOW → no flag. Copy accuracy is the real risk: every competitor figure sourced + dated, CI guard
against unsourced numbers if practical (the `/vende` overhaul precedent).

## Smoke walkthrough owner: Daniel (phone, anonymous: run a Shopify-plan comparison, override a price, export the report, open the smalldocs link).
