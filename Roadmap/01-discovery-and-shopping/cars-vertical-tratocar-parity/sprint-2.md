# Cars vertical — Sprint 2: PDP trust + $/mes

**Status:** 🟡 BUILT, PR open — deterministic gate green, real-device browser smoke + disclaimer copy
sign-off owed to Daniel before merge (per this sprint's own QA plan below).

> **Confirmed with Daniel during planning:** enganche is captured as a **percentage of price** (not
> a flat MXN amount) — matches this doc's own "20% enganche" smoke example.

## Stories

### Story 2.1 — Seller fields: financing hint · inspection report · warranty ✅
**As a** car seller, **I want** per-listing fields for a financing hint (enganche %/meses → derived $/mes), an inspection report (PDF upload or URL), and warranty (text + months), **so that** my listing carries the trust tratocar's site carries.
**Acceptance:** product-metadata fields on the autos listing editor; $/mes derivation is a pure unit-tested formatter; **disclaimer is mandatory and auto-rendered** ("informativo, no es oferta de crédito" — final copy owed a Daniel read pre-merge); report upload rides R2 with format/size validation.
**Risk:** LOW
**Built:** `AUTOS_TRUST_GROUP` (`lib/listing-attributes.ts`) — a dedicated capture panel mirroring the existing `RENTAL_FIELDS` precedent (pricing/decision data, excluded from the generic specs table). Pure formatters in the new `lib/auto-financing.ts` (`financingDisplay`, `warrantyDisplay`, `inspectionDisplay`, `FINANCING_DISCLAIMER`). Inspection report captured via a new bespoke `InspectionReportField.tsx` (PDF upload through a new public-bucket route `app/api/sell/inspection-upload/route.ts`, or a pasted URL — either writes the same `attrs.inspection_report_url`). Wired into the shared `AttrsSection.tsx`, so it's editable on both create *and* edit — unlike REPUVE, no creation-only gap. Unit tests: `e2e/auto-financing.spec.ts` (13 cases).

### Story 2.2 — PDP + card rendering ✅
**As a** buyer, **I want** "$X/mes" beside the price (with the disclaimer), "Inspeccionado — ver reporte" (viewer/download), and a warranty chip on the autos PDP block — and the $/mes chip on listing cards, **so that** I can decide like on tratocar.
**Acceptance:** renders only when fields present (absent = today's PDP); report opens in a viewer/download without leaving dead ends; card chip matches tratocar's pattern (price bold, $/mes muted); all channels incl. white-label; Iconoir only.
**Risk:** LOW-MED
**Built:** `AutoHero.tsx` renders the financing block (first element, immediately under the shared Price block `page.tsx` already renders above it), the inspection-report link (`iconoir-page-search`, opens the PDF in a new tab — no in-page viewer, no dead end) + warranty chip (`iconoir-shield-check`) — every element independently conditional on the pure projections, so a listing with none of the S2.1 fields set renders byte-for-byte the pre-S2.2 hero. `/l` card grid gets a muted `$/mes` chip under the bold price via a new `financingChip()` delegator in `lib/listings.ts`. No disclaimer text on the card (space-constrained tile; the full disclaimer lives on the PDP next to the actual derivation) — **flagged for Daniel's sign-off alongside the disclaimer copy itself.**

### Story 2.3 — Import + agent mapping ✅
**As a** car seller's agent, **I want** bulk import and agent-native setup to accept the new fields with marca/modelo normalization, **so that** a 60-car catalog lands complete in one pass.
**Acceptance:** import mapping documented in the setup spec; marca normalized against a canonical list (mx-locations precedent); UCP catalog exposes the fields.
**Risk:** LOW
**Built:** `lib/catalog-import.ts` gains autos vehicle-spec columns (`make`/`model`/`year`/`km`/`fuel_type`/`transmission`/`color` — previously **unsupported by import at all**, a pre-existing gap this closes) plus the S2.1 financing/warranty/inspection columns, assembled into `row.attrs` at stage time (`make` canonicalized via `lib/car-brands.ts`'s `canonicalBrand()`; unknown enum values and malformed URLs degrade to a non-blocking warning rather than failing the row). This is the one place `lib/setup-spec.ts` composes verbatim, so bulk import, agent-native setup, and the published `/api/ucp/setup-spec` all pick it up automatically — no separate doc to maintain. `app/api/sell/import/route.ts` forwards `attrs` only when non-empty (merge-safe — confirmed the backend's `attrs` update is a shallow merge, so omitting the key never wipes a manually-set field). `lib/ucp/schema.ts` adds `auto_trust` (`monthly_payment`/`warranty`/`inspection_report_url`) to the catalog response, reusing the same `lib/auto-financing.ts` projections as the PDP and card — zero new math. Unit tests: `e2e/catalog-import-attrs.spec.ts` (12 cases).

## Sprint QA
- **api spec(s):** ✅ `e2e/auto-financing.spec.ts` (13 cases — $/mes formatter + disclaimer-presence + warranty/inspection projections) · `e2e/catalog-import-attrs.spec.ts` (12 cases — field validation + import-mapping + brand canonicalization + merge-safety)
- **deterministic gate:** ✅ `tsc --noEmit` + `npm run build` + Playwright `api` green (1576/1583 — the 7 non-green specs hit live `https://miyagisanchez.com` launchpad/promoter/404-middleware routes untouched by this sprint; reproduced as pre-existing flakiness, not a regression)
- **browser smoke owed:** yes, to Daniel — PDP with all three fields on a real phone; disclaimer copy approval. **Not done by the build agent this sprint** — creating live test data against the shared dev/prod-adjacent backend was correctly blocked by the auto-mode safety classifier (ambiguous whether local `apps/backend` points at an isolated DB), and Daniel chose to skip it and rely on the spec suite + this walkthrough rather than have the agent probe further.

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
