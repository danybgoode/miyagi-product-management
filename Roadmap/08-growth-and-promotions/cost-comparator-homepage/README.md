---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: cost-comparator-homepage
archetype: Grower
---

# Epic: Comparador de costos — the stacking-costs sales tool on the homepage

> **Area:** 08-growth-and-promotions · **Risk:** LOW · **Class:** Feature · **Archetype:** Grower · **Scope seed:**
> [`00-ideas/seeds/cost-comparator-homepage.md`](../../00-ideas/seeds/cost-comparator-homepage.md)
> (approved by Daniel 2026-07-09).

**Tagline:** *Compara lo que pagas hoy contra Miyagi — con tus propios números.*

*Naming note:* the shipped seller-side **Profit Analyzer** (`/shop/manage/profit`) is a different
product for a different persona. This is **«Comparador de costos»** — never "profit analyzer" user-facing.

## Why
The `/vende` benchmark proves the 0%-commission story with one static worked example. This epic makes
the argument *personal*: a public, anonymous `/comparador` route where a merchant (or a consultant/
promoter standing next to one, phone in hand) enters their platform, volume, AOV, and paid apps and
sees their real stacked monthly/annual cost next to Miyagi's — every figure overridable, every
competitor number sourced + dated — then exports a clean report to keep. **Grower success signal:**
comparisons run and reports exported/handed over (Clarity events + UTM, same rig as `/vende`), not
merely "the calculator renders."

## Medusa-first note (AGENTS rules)
No commerce model at all — nothing to model in Medusa (rule #1 n/a by inspection). The editable
dataset is non-commerce runtime content → it rides the shipped Supabase `platform_copy_overrides`
pattern, no new table (rule #2). Agent parity in-scope: dataset + methodology on `/agent` and an MCP
`compare_costs` tool computing via the identical pure lib (rule #3 — the rental_quote no-drift
precedent). Clerk untouched — the route is anonymous by design (rule #4). All copy es-MX, not on the
bilingual allow-list (rule #5).

## What already exists (reuse, don't rebuild) — code-verified at grooming
- **`/vende` benchmark** — `app/(shell)/vende/_components/SellerAcquisitionSections.tsx`
  (`BenchmarkSection`) + `locales/es.json` `sellerAcquisition.anchor.benchmark.*` (sourced,
  date-stamped "25 de junio de 2026", runtime-overridable): seed data, tone, sourcing discipline.
- **Content-overrides layer** — `applyCopyOverrides`/`getOverriddenDictionary` merge seam +
  `/admin/contenido` editor (admin-content epic, 2026-07-09). Dataset = versioned baseline JSON
  in-repo, merged under this, fail-open to baseline. ⚠️ The live `platform_copy_overrides` table is
  missing in prod (admin-content S1 migration never applied — owed to Daniel); fail-open means the
  comparator works regardless, runtime editing lights up when it lands.
- **Clarity/UTM attribution rig** on `/vende` pages — the Grower signal.
- **Promoter sell-sheet + handbook** (`/vende/promotor/sell-sheet`) — S2 adds a prefillable
  `/comparador` link there (the personalized leave-behind).
- **Agent fan-out shape** — `/agent`, UCP manifest, `/llms.txt`, MCP `about_miyagi` (one source, many
  surfaces) — `compare_costs` follows it.
- **smalldocs** (external, verified live 2026-07-09 —
  [github.com/espressoplease/smalldocs](https://github.com/espressoplease/smalldocs)): URL-hash md
  docs (server never sees content), encrypted short links, PDF/docx export, chart fenced-blocks, YAML
  style front-matter. v1 export = generate md + open on smalldocs.org, client-side, zero backend.
  Elastic 2.0 — linking out fine; no self-hosting in v1.
- **Migrations parity-score module** (platform-migrations US-1.2, Wave 2, scaffolded) — Sprint 3's
  hard dependency.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1.1 Pure cost model — `lib/cost-comparator.ts`, unit-tested | low |
| 1 | US-1.2 Dataset — baseline JSON (source+date per figure) + overrides merge + CI guard | low |
| 1 | US-1.3 `/comparador` UI — pickers, volume/AOV, app toggles, stacked bars, all overridable | low |
| 1 | US-1.4 Homepage teaser card (static `/` untouched) + Clarity/UTM | low |
| 2 | US-2.1 Report export — styled md + chart block → smalldocs (client-side) | low |
| 2 | US-2.2 Consultant prefill link + promoter sell-sheet leave-behind | low |
| 2 | US-2.3 Agent surface — `/agent` data + MCP `compare_costs` (same pure lib) | low |
| 3 | US-3.1 URL analyzer — platform detect + prefill + migration effort (**conditional**) | med |

## Deploy order
Frontend-only throughout (S1–S2); no backend change, no flag (LOW — carve-out: additive statically-
linked route; removal = delete the teaser card). S1 before S2 (the lib + dataset are S2's inputs).
**S3 is conditional:** build only if platform-migrations US-1.2 (parity module) has landed by then;
otherwise skip and fast-follow — do not stub it. All LOW → reviewer may auto-merge on green CI; the
real risk is copy accuracy (sourced + dated figures, CI guard against unsourced numbers). Competitor
pricing is researched + cited **at build time** (web-verify, never training memory).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Kill-switch: **none planned at grooming** (LOW; carve-out recorded in the seed) — nothing to verify
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — run `node scripts/build-order.mjs`)

## Sprints
- [sprint-1.md](sprint-1.md) — Calculator + dataset + teaser.
- [sprint-2.md](sprint-2.md) — Report + consultant mode + agent surface. 🟡 Built, [PR #278](https://github.com/danybgoode/miyagisanchezcommerce/pull/278) open (not merged) — owed Daniel's phone smoke.
- [sprint-3.md](sprint-3.md) — URL analyzer (conditional — rides migrations parity module). 🟡
  Built, [PR #280](https://github.com/danybgoode/miyagisanchezcommerce/pull/280) open (not
  merged) — condition confirmed met, owed Daniel's live-URL browser smoke.
