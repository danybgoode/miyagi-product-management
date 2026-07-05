---
status: scaffolded
slug: cars-vertical-tratocar-parity
---

# Epic: Cars vertical — tratocar-grade browse & trust

> **Area:** 01 · Discovery & Shopping · **Risk:** MED (frontend-heavy; no money path in v1) · **Archetype:** Grower · **Scope doc:** [`00-ideas/2. readyforscope/cars-vertical-tratocar-parity.md`](../../00-ideas/2.%20readyforscope/cars-vertical-tratocar-parity.md)

**Tagline:** *Busca por marca, año y precio; decide con ficha, inspección y mensualidad a la vista.*

## Why
Seller-acquisition play: pitch **tratocar.com** (consignment used-car platform, GDL) to publish
their inspected catalog on Miyagi as an extra channel — they keep their own process. Most of their
buyer experience already exists here (autos PDP specs block + REPUVE cue, anonymous chat + offers,
Citas test-drive booking, bulk import, trust signals, own-brand subdomain). v1 closes the three real
gaps: **facet browse** (marca/modelo/año/precio/km), **"$/mes" financing display** (informative-only
+ disclaimer), and **inspection-report + warranty PDP surfaces** — for tratocar and every car seller.
Apartado (refundable deposit) is deliberately routed to `seeds/spike-compra-protegida.md`; real
financing rails are out.

## Context
| | |
|---|---|
| **Role** | Buyer (facet browse, decide, book test drive), car seller (fields + import), seller's agent (MCP publish), Daniel/BD (outreach) |
| **Macro-section** | 01 · Discovery & Shopping |
| **Risk** | MED — browse/query surface + PDP fields; no money path |
| **Flag** | none — additive; absent fields render today's PDP |
| **Decisions** | 2026-07-05 w/ Daniel: v1 = facets + $/mes + inspection/warranty · apartado → Compra Protegida spike · real financing OUT |
| **Research** | [tratocar.com](https://tratocar.com) fetched 2026-07-05: 230-pt inspection + report, ≤2yr warranty, $/mes on cards, anonymous chat, $1,500 apartado, paperwork handled. Their weakness: JS-only catalog (no SSR/SEO), single city — our SSR + sitemaps beat it |
| **Bilingual** | es-MX only |

## Medusa-first note
Facets derive from existing **specs metadata on Medusa products** (autos category) via a pure
server-side deriver + query params on the existing listings route — no new tables, no search
infra (Postgres filtering is fine at current scale; note a future search-engine seed if listings
×10). New PDP fields (financing hint, inspection report, warranty) are **product metadata**,
flowing through bulk import, agent setup, and UCP automatically. Inspection PDF rides existing R2
upload. Rules #3/#5 hold.

## What already exists (reuse, don't rebuild)
- Autos PDP decision block (REPUVE + per-category specs table) — PDP redesign epic.
- `/l` browse + category filters + mobile apply-gated bottom-sheet with live count.
- Bulk import / supply pipeline + agent-native setup (tratocar's catalog ingest, day one).
- Citas (Cal.com) test-drive booking; messaging + offers with deadlines.
- R2 uploads; `lib/mx-locations.ts` normalization precedent (for marca/modelo canonical lists).
- Catalog-management epic (their 60-car catalog's home) · OSPP presets (demo shop dressing).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Facet deriver (marca/modelo/año/km/precio) from specs metadata + server filter params, honest counts | MED |
| 1 | 1.2 Browse UI: facet rail (desktop) + existing mobile sheet; SEO-crawlable filter URLs; año/marca sorts | MED |
| 1 | 1.3 UCP catalog accepts the same facet params | LOW |
| 2 | 2.1 Seller fields: financing hint (monto/meses → $/mes + mandatory disclaimer), inspection report (PDF/URL), warranty | LOW |
| 2 | 2.2 PDP renders them: $/mes beside price, "Inspeccionado — ver reporte", warranty chip; $/mes chip on cards | LOW-MED |
| 2 | 2.3 Import mapping: bulk-import/agent-setup accept + normalize the new fields | LOW |
| 3 | 3.1 Dry-run: 10-car demo catalog via the agent path; fix friction; dress the demo shop | LOW |
| 3 | 3.2 BD one-pager for tratocar (es-MX), `/vende` funnel patterns; Daniel sends it | LOW (ops) |

## Deploy order
S1 → S2 → S3 (S3 is ops-heavy). No flags; additive. Keep `/l` performance (no static-shell regression).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; sprints ticked with commit refs
- [ ] `RETROSPECTIVE.md` written · poster updated · memory updated · learnings promoted
- [ ] $/mes disclaimer copy read + approved by Daniel pre-merge (legal sensitivity)
- [ ] Feature branch deleted; frontmatter `status: shipped` (run `node scripts/build-order.mjs`)
