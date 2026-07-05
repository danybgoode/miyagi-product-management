# Cars vertical — Sprint 2: PDP trust + $/mes

**Status:** ⬜ not started

## Stories

### Story 2.1 — Seller fields: financing hint · inspection report · warranty
**As a** car seller, **I want** per-listing fields for a financing hint (enganche/meses → derived $/mes), an inspection report (PDF upload or URL), and warranty (text + months), **so that** my listing carries the trust tratocar's site carries.
**Acceptance:** product-metadata fields on the autos listing editor; $/mes derivation is a pure unit-tested formatter; **disclaimer is mandatory and auto-rendered** ("informativo, no es oferta de crédito" — final copy owed a Daniel read pre-merge); report upload rides R2 with format/size validation.
**Risk:** LOW

### Story 2.2 — PDP + card rendering
**As a** buyer, **I want** "$X/mes" beside the price (with the disclaimer), "Inspeccionado — ver reporte" (viewer/download), and a warranty chip on the autos PDP block — and the $/mes chip on listing cards, **so that** I can decide like on tratocar.
**Acceptance:** renders only when fields present (absent = today's PDP); report opens in a viewer/download without leaving dead ends; card chip matches tratocar's pattern (price bold, $/mes muted); all channels incl. white-label; Iconoir only.
**Risk:** LOW-MED

### Story 2.3 — Import + agent mapping
**As a** car seller's agent, **I want** bulk import and agent-native setup to accept the new fields with marca/modelo normalization, **so that** a 60-car catalog lands complete in one pass.
**Acceptance:** import mapping documented in the setup spec; marca normalized against a canonical list (mx-locations precedent); UCP catalog exposes the fields.
**Risk:** LOW

## Sprint QA
- **api spec(s):** $/mes formatter + disclaimer-presence spec · field validation spec · import-mapping spec
- **browser smoke owed:** yes, to Daniel — PDP with all three fields on a real phone; disclaimer copy approval
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. On an autos listing edit screen, set financiamiento (20% enganche, 48 meses), upload an inspection PDF, set garantía "6 meses motor y transmisión".
   → All three save with clear validation.
2. Open the PDP.
   → "$X/mes" beside the price with the disclaimer underneath; "Inspeccionado — ver reporte" opens the PDF; warranty chip visible.
3. Check the listing card in `/l?categoria=autos`.
   → $/mes chip renders muted under the bold price.
4. Clear the three fields.
   → PDP renders exactly as before this sprint.
5. Re-import the demo catalog file with the new columns.
   → Fields land on all rows; marca values normalized.

If any step fails, note the step number + what you saw — that's the bug report.
