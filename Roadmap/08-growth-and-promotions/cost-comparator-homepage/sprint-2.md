# Comparador de costos — Sprint 2: Report + consultant mode + agent surface

**Status:** ⬜ not started

## Stories

### Story 2.1 — Report export via smalldocs
**As a** consultant (or the merchant themself), **I want** the comparison exported as a clean, styled
report, **so that** the pitch survives the conversation.
**Acceptance:** an "Exportar reporte" action generates a styled markdown report (current spend →
Miyagi equivalent → suggested next step / migration-effort note) with YAML style front-matter and a
chart fenced-block for the cost bars, and opens it on smalldocs.org — entirely client-side (document
travels in the URL hash; zero backend). From smalldocs the merchant can save PDF/docx or mint an
encrypted short link. es-MX report copy. Unit spec on the md generator (fixed input → exact md).
**Risk:** low

### Story 2.2 — Consultant prefill link + promoter leave-behind
**As a** promoter/consultant, **I want** a prefillable `/comparador` link, **so that** I can hand the
merchant a comparison already loaded with their numbers.
**Acceptance:** the full calculator state serializes into the URL (query/hash); opening a prefilled
link on any phone, anonymous, restores the exact comparison; the promoter sell-sheet/handbook
(`/vende/promotor/sell-sheet`) links the comparator with a one-line "úsalo en la visita" note. api
spec: prefill URL round-trips a known state.
**Risk:** low

### Story 2.3 — Agent surface: `/agent` data + MCP `compare_costs`
**As a** merchant's own AI agent, **I want** to run the same comparison over UCP/MCP, **so that** the
answer a merchant gets from their assistant matches the page (AGENTS rule #3).
**Acceptance:** the comparator dataset + methodology are readable on `/agent` (+ UCP manifest
pointer); an MCP `compare_costs` tool accepts platform/volume/AOV/apps and returns the stacked
comparison computed by the **identical** `lib/cost-comparator.ts` (no drift — the rental_quote
precedent); api spec asserts tool output equals the lib's for a fixed input; responses carry the
dataset's verified date + sources.
**Risk:** low

## Sprint QA
- **api spec(s):** md-generator unit spec (2.1); prefill round-trip spec (2.2);
  `compare_costs`-vs-lib parity spec + `/agent` content spec (2.3).
- **browser smoke owed:** yes, to Daniel — phone, anonymous: export → smalldocs link opens + renders
  (external-site step an automated smoke can't own).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. On your phone, run a comparison at https://miyagisanchez.com/comparador (Shopify Básico, 100
   ventas/mes, AOV $500, one premium app toggled).
   → Bars render as in Sprint 1.
2. Tap "Exportar reporte".
   → smalldocs.org opens with a styled es-MX report: your spend, the Miyagi equivalent, the cost
     chart, and the dataset's verified date. No account needed.
3. In smalldocs, export PDF.
   → A clean PDF downloads with the same content.
4. Back on `/comparador`, copy the "compartir/prefill" link, open it in a private window.
   → The exact same comparison loads, anonymous.
5. Open https://miyagisanchez.com/vende/promotor/sell-sheet.
   → The comparator is linked as the in-visit tool.
6. Ask an MCP-connected agent to compare costs (e.g. "compara Shopify Básico, 100 ventas de $500").
   → The numbers match step 1 exactly, with sources + date.

If any step fails, note the step number + what you saw — that's the bug report.
