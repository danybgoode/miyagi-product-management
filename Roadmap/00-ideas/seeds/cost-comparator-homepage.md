---
title: "Comparador de costos — the stacking-costs sales tool on the homepage"
slug: cost-comparator-homepage
status: scaffolded
area: "08"
type: feature
archetype: grower
priority: wave-3
risk: low
epic: "08-growth-and-promotions/cost-comparator-homepage"
build_order: null
updated: 2026-07-09
---

# Comparador de costos — the stacking-costs sales tool on the homepage

**As a** merchant curious about switching (or a consultant/promoter pitching one in person), **I want**
to enter my current platform, volume, and paid apps and see my real stacked cost next to Miyagi's —
exportable as a clean report — **so that** the decision (and the pitch) is grounded in my own numbers.

*Naming note:* the shipped seller-side **Profit Analyzer** (`/shop/manage/profit`, per-SKU margins) is a
different product for a different persona. This one is **«Comparador de costos»** — do not reuse
"profit analyzer" anywhere user-facing.

**Archetype: Grower** — acceptance ties to a success signal (comparisons run, reports exported/handed
over — Clarity events + UTM attribution, same rig as `/vende`), not merely "the calculator works."

## Stage-2.5 bucket: genuinely new, frontend-heavy with strong reuse
The comparison *data* and framing already exist (the sourced + date-stamped `/vende` benchmark); the
interactive calculator, premium-apps line items, export, consultant mode, and agent surface are new.
No lighter path delivers "my own numbers, on a phone, exportable."

## Groomed decisions (Daniel, 2026-07-09 — structured Q&A)
1. **Dataset lives in the content-overrides layer:** versioned baseline JSON in-repo (source + date on
   every figure, CI-guarded) merged under the shipped `platform_copy_overrides` pattern
   (`applyCopyOverrides` shape) — admin-editable at runtime, **fail-open to the baseline**.
   ⚠️ Dependency note: the live Supabase is missing the `platform_copy_overrides` table (admin-content
   S1 migration merged but never applied — flagged 2026-07-09, owed to Daniel). Fail-open means the
   comparator works off the baseline regardless; runtime editing lights up when the migration lands.
2. **S3 URL analyzer is a conditional sprint:** build only if platform-migrations US-1.2 (parity-score
   module) has landed by build time (it's Wave 2, this is Wave 3, so it should). Otherwise skip → fast-follow.
3. **Agent surface stays in S2** (AGENTS rule #3): comparator data on `/agent` + MCP `compare_costs`.
4. **Promoter leave-behind is a light S2 story:** a prefillable `/comparador` link from the promoter
   sell-sheet/handbook. No close-flow changes; cuttable.

## Shape
- **Route:** `/comparador`, linked from a homepage teaser card. **Not embedded live on `/`** — the
  homepage is a static CDN asset (LEARNINGS: don't un-static `/`); a client-side calculator route keeps
  `/` untouched and gives consultants a clean URL to open on a phone. Anonymous — no login, ever (v1 hard rule).
- **Calculator:** pick platform(s) (Shopify plan tiers, ML commission bands, WooCommerce hosting,
  Tiendanube, "marketplace + own site" combos), enter monthly sales volume + AOV, toggle **premium
  apps** (reviews, subscriptions, bundles, upsell — each with its typical price and the Miyagi
  equivalent marked *incluido*). Output: stacked monthly/annual cost bars vs Miyagi (SKU costs only,
  0% commission), fully editable — every cost field user-overridable, nothing hardcoded-opaque.
- **Cost dataset:** per decision 1 above. Date-stamp shown in the UI; the `/vende` benchmark's sourcing
  discipline applies (source + date on every figure — the existing table's `verified` field
  `sellerAcquisition.anchor.benchmark.verified` = "25 de junio de 2026" is the pattern).
- **Report export (consultant mode):** styled markdown report (current spend → Miyagi equivalent →
  suggested migration effort) via **smalldocs** — *verified live 2026-07-09*
  ([github.com/espressoplease/smalldocs](https://github.com/espressoplease/smalldocs)): URL-hash
  documents (server never sees content), encrypted short links, PDF/docx export, charts from fenced
  code blocks, styles via YAML front matter, CLI optional. Integration v1 = generate the md (with style
  front-matter + a chart fenced-block for the cost bars) and open on smalldocs.org — **client-side,
  zero backend**. License is Elastic 2.0: linking out is fine; revisit self-hosting only if we outgrow
  it (may not offer it as a managed service — fine, we wouldn't be).
- **URL analysis (S3, conditional):** enter a shop URL → detect platform + rough section inventory →
  prefill the calculator + estimated migration effort. Rides the migrations epic's parity-score module
  (shared module — built there, rendered here). Rate-limited (external fetch + token cost).
- **All copy es-MX** (AGENTS rule #5 — not on the bilingual allow-list).

## What already exists (reuse, don't rebuild) — code-verified at grooming
- **`/vende` benchmark** — `app/(shell)/vende/_components/SellerAcquisitionSections.tsx`
  (`BenchmarkSection`) + `locales/es.json` `sellerAcquisition.anchor.benchmark.*` (sourced,
  date-stamped, es-MX voice, already runtime-overridable). Seed data + tone + sourcing discipline.
- **Content-overrides pattern** — `applyCopyOverrides`/`getOverriddenDictionary` merge seam +
  `/admin/contenido` editor (admin-content epic, shipped 2026-07-09). The dataset rides this.
- **Clarity/UTM attribution** on `/vende` pages — the Grower signal rig.
- **Promoter sell-sheet + ad-rate PDF rails** (`/vende/promotor/sell-sheet`) — the "consultant hands
  the merchant a document" pattern; S2 adds the prefillable link there.
- **Agent fan-out shape** — `/agent`, UCP manifest, `/llms.txt`, MCP `about_miyagi` (one source, many
  surfaces); `compare_costs` follows it. LEARNINGS precedent (rental_quote): the MCP tool must compute
  via the **identical pure lib** the web UI uses, so an agent's number can never drift from the page's.
- **Migrations parity-score module** (platform-migrations US-1.2, scaffolded 2026-07-09) — S3's dependency.

## Scope boundary
**In (v1):** `/comparador` calculator + editable dataset (baseline JSON + overrides) + homepage teaser +
report export (smalldocs md) + consultant prefill link (incl. sell-sheet link) + agent surface
(`/agent` data + MCP `compare_costs`).
**Out (v1):** URL analyzer unless the parity module has landed (then conditional S3; else fast-follow);
lead capture / CRM; login requirement (must work anonymous, in person, on a phone); self-hosting smalldocs.

## Sprint slicing (stories, risk, QA)
### S1 — calculator + dataset + teaser (all LOW)
- **US-1.1 Pure cost model** — `lib/cost-comparator.ts` (next-free seam): platform tiers, commission
  bands, app line-items, monthly/annual stacking, user overrides. *QA: unit specs (free coverage).*
- **US-1.2 Dataset** — baseline versioned JSON (source + date per figure) + content-overrides merge +
  UI date-stamp; CI guard against unsourced figures (the `/vende` overhaul precedent) if practical.
  *QA: unit spec on the merge; guard script.* Figures researched + cited at build time (present-day
  pricing — web-verify, don't trust memory).
- **US-1.3 `/comparador` UI** — pickers, volume/AOV inputs, premium-app toggles (*incluido* markers),
  stacked bars, everything overridable; anonymous, mobile-first, es-MX. *QA: api spec (route renders,
  key figures present); browser smoke owed to Daniel.*
- **US-1.4 Homepage teaser + attribution** — static teaser card on `/` linking `/comparador` (`/` stays
  static — additive card, no dynamic API); Clarity events + UTM like `/vende`. *QA: api spec asserts `/`
  still prerenders static + card present.*

### S2 — report + consultant mode + agent surface (all LOW)
- **US-2.1 Report export** — styled md (spend → Miyagi equivalent → migration-effort note) + chart
  block, opened on smalldocs with style front-matter; client-side only. *QA: unit spec on the md
  generator; export smoke owed to Daniel (phone).*
- **US-2.2 Consultant prefill + promoter leave-behind** — calculator state serialized in the URL
  (prefillable link, anonymous); sell-sheet/handbook links a prefillable `/comparador`. *QA: api spec
  (prefill URL round-trip).*
- **US-2.3 Agent surface** — dataset + methodology on `/agent` (+ UCP manifest pointer) and MCP
  `compare_costs` computing via the same `lib/cost-comparator.ts` (no drift). *QA: api spec calling the
  MCP tool and asserting parity with the lib for a fixed input.*

### S3 (conditional) — URL analyzer (MED)
- **US-3.1** — shop-URL → platform detection + rough inventory → prefill + migration-effort estimate,
  rendering the migrations parity module; rate-limited. *Condition: migrations US-1.2 landed. QA: api
  spec with a fixture URL; rate-limit spec.*

## Kill-switch decision (Stage 6b)
Risk **LOW** → no flag. Carve-out reasoning: an additive, statically-linked frontend route with no
money path; removal = delete the teaser card. The real risk is **copy accuracy** — every competitor
figure sourced + dated, CI guard against unsourced numbers.

## Smoke walkthrough owner
**Daniel** (phone, anonymous): open `/comparador` from the homepage teaser → run a Shopify-plan
comparison → override a price → export the report → the smalldocs link opens and renders. Full numbered
walkthrough written into each `sprint-N.md` at sprint close (Stage 8b format).
