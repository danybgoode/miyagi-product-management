---
status: readyforscope
slug: cars-vertical-tratocar-parity
macro: 01-discovery-and-shopping
class: feature
archetype: Grower
risk: MED — frontend-heavy (facets + PDP surfaces); no money-path in v1 (apartado excluded)
---

# Cars vertical — tratocar-grade browse & trust (seller-acquisition play)

> Scoped 2026-07-05 from Daniel's raw ask. Seller-acquisition motion: pitch **tratocar.com**
> (consignment used-car platform, GDL) to publish their inspected catalog on Miyagi as an extra
> channel — they keep managing their own process. v1 gives any car seller (tratocar, lots,
> particulares) a browse + PDP experience at parity with tratocar's own site, minus their
> operational services.

**Tagline:** *Busca por marca, año y precio; decide con ficha, inspección y mensualidad a la vista — como en el sitio del lote, pero en el marketplace.*

## Actors & actions
| Actor | Actions |
|---|---|
| **Buyer** | Facet-browse autos (marca/modelo/año/precio/km) · compare specs · see "$X/mes" hint · read inspection report/warranty · chat anonymously + offer · schedule test drive (Citas) |
| **Car seller (tratocar / lot / particular)** | Bulk-import catalog (existing) · set specs + financing hint + inspection report + warranty per listing · manage via catalog table (catalog-management epic) · run own process off-platform |
| **Seller's agent** | Publish/maintain the car catalog over MCP (existing listing tools) |
| **Daniel/BD** | The tratocar outreach itself (ops, not code) |

## Stage-2.5 bucket

- **Already possible today (the pitch is real now):** bulk import + agent-native setup (their
  catalog lands in minutes); autos PDP decision block (REPUVE cue + per-category specs table);
  anonymous buyer–seller chat + offers with deadlines (their "chat anónimo"); Citas/Cal.com =
  test-drive booking; trust signals + verified badge; own subdomain/domain channel for their brand;
  arranged delivery/pickup.
- **Genuinely new (the gaps):** vertical **facet browse**; **"$/mes" financing display**;
  **inspection-report + warranty PDP surfaces**.
- **Explicitly out → parked elsewhere:** apartado (refundable reservation deposit) → becomes the
  first concrete case of `seeds/spike-compra-protegida.md` (escrow/deposit spike); real financing
  rails (credit partner) → out entirely (compliance surface).

## Decisions (resolved with Daniel, 2026-07-05)
1. **v1 = facet browse + $/mes display + inspection/warranty trust surfaces.** No money-path.
2. **Apartado excluded** — routed to the Compra Protegida spike (deposit-to-reserve is its
   sharpest use case; note added there at scaffold time).
3. **Real financing integration out** — "$X/mes" is a seller-configured, informative-only hint
   with an honest disclaimer (months + rate source stated), never a credit offer.

## Research (2026-07-05 — [tratocar.com](https://tratocar.com))
Their differentiators: 230-point inspection + published report; ≤2-yr warranty; financing with
**$/mes on every card**; anonymous chat; $1,500 refundable apartado + test-drive; paperwork handled;
consignment (~12% more for sellers / 14% less for buyers vs agencies, their study). Catalog page:
sort by recency/price/año/marca/modelo. Their listing cards: photo, marca+modelo, año, price, $/mes.
**Pitfall to avoid (their weakness, our chance):** their catalog is JS-only (no SSR — bad SEO for
listings) and single-city; our listing pages are SSR with per-host sitemaps.

## What already exists (reuse, don't rebuild)
- **Specs metadata + per-category spec table** (PDP redesign) — facet source; autos block w/ REPUVE.
- **Browse** — `/l` search + category filters + mobile filter sheet (facets extend this, same
  apply-gated pattern with live count).
- **Bulk import / supply pipeline + agent-native setup** — tratocar's catalog ingest.
- **Citas (Cal.com)** — test-drive scheduling; scheme-less scheduling links on PDP.
- **Messaging + offers** — anonymous negotiation with deadlines.
- **CPP file-upload field type** (S3, in flight) — inspection-report PDF attachment reuses the
  file infra (seller-side upload already exists via listing photos/R2).
- **Catalog-management epic** — the table their 60-car catalog is managed in.

## v1 scope boundary
**In:** autos facet browse (marca/modelo/año/precio range/km range; derived server-side from specs
metadata; SEO-friendly URLs `/l?categoria=autos&marca=…`; sort parity incl. año/marca); listing-card
"$/mes" chip when configured; PDP autos block additions: financing hint (months/CAT-source
disclaimer), inspection report (PDF/URL attach + "Inspeccionado" badge), warranty field (free text +
months); facets + fields flow to UCP catalog (agents filter by marca/año too); es-MX.
**Out:** apartado/deposit (→ spike), real financing, tratocar-specific custom features, vehicle
history API integrations (REPUVE stays a buyer cue), multi-city showroom logic, vertical landing
pages (`/autos` marketing page = light follow-up if outreach lands).

## Slices
### Sprint 1 — Facet browse for autos — MED
| # | Story | Risk |
|---|---|---|
| 1.1 | Facet extraction: pure deriver from autos specs metadata (marca/modelo/año/km) + price; server-side filter params on the listings query; honest counts. | MED |
| 1.2 | Browse UI: facet rail (desktop) + the existing apply-gated bottom-sheet (mobile) with live "Ver X resultados"; SEO-crawlable filter URLs; sort by año/marca added. | MED |
| 1.3 | UCP: catalog accepts the same facet params (agents filter autos). | LOW |

### Sprint 2 — PDP trust + $/mes — LOW-MED
| # | Story | Risk |
|---|---|---|
| 2.1 | Seller fields on autos listings: financing hint (monto/meses → $/mes, disclaimer obligatorio), inspection report (PDF/URL), warranty (texto + meses). | LOW |
| 2.2 | PDP autos block renders them: $/mes beside price (with disclaimer), "Inspeccionado — ver reporte" (viewer/download), warranty chip; listing cards show the $/mes chip. | LOW-MED |
| 2.3 | Import mapping: bulk-import/agent-setup accept the new fields (tratocar's catalog carries them in one pass). | LOW |

### Sprint 3 — Outreach readiness (ops-heavy) — LOW
| # | Story | Risk |
|---|---|---|
| 3.1 | Dry-run: import a 10-car demo catalog via the agent path; fix friction found; demo shop dressed (OSPP presets). | LOW |
| 3.2 | BD one-pager for tratocar (es-MX): what they get (extra channel, 0% commission, own subdomain, agent-managed), built on the `/vende` funnel patterns. Ops: Daniel sends it. | LOW (ops) |

## QA / smoke commitments
Pure facet-deriver + $/mes-formatter + disclaimer-presence specs; browse browser smoke (mobile
sheet) owed to Daniel; import dry-run IS the S3 smoke. Real-URL walkthrough per sprint.

## Open risks
- Facet quality depends on specs-metadata consistency of imported catalogs → import mapping (2.3)
  must normalize marca/modelo (canonical list, `lib/mx-locations.ts` precedent).
- $/mes legal sensitivity: informative-only wording reviewed against CONDUSEF-adjacent norms —
  disclaimer copy owed a Daniel read before merge.
- Facet URLs × ISR/static-shell interplay (keep `/l` dynamic path performant; no homepage regression).
