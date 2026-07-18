# Comparador de costos — Sprint 2: Report + consultant mode + agent surface

**Status:** 🟡 built, PR open — [PR #278](https://github.com/danybgoode/miyagisanchezcommerce/pull/278)
(`feat/cost-comparator-s2`, 7 commits). Deterministic gate green (tsc + build + Playwright `api`,
homepage stays static). A cross-agent review round (codex + a second-opinion pass) found 3
blocking + 3 should-fix + 1 nit, all addressed: honest override citations in the exported report
(a hand-edited figure no longer cites the original dataset source as if it verified the edit),
a tier-param bleed between Shopify/Tiendanube share links, line overrides now included in the
share-link codec, `window.open` popup-blocking hardening, stricter MCP enum validation, and an
es-MX copy sweep on `/agent`. See the PR's review-round comment for the full list. Not merged —
owed: Daniel's phone smoke (walkthrough below), then merge.

## Stories

### Story 2.1 — Report export via smalldocs ✅ built
**As a** consultant (or the merchant themself), **I want** the comparison exported as a clean, styled
report, **so that** the pitch survives the conversation.
**Acceptance:** an "Exportar reporte" action generates a styled markdown report (current spend →
Miyagi equivalent → suggested next step / migration-effort note) with YAML style front-matter and a
chart fenced-block for the cost bars, and opens it on smalldocs.org — entirely client-side (document
travels in the URL hash; zero backend). From smalldocs the merchant can save PDF/docx or mint an
encrypted short link. es-MX report copy. Unit spec on the md generator (fixed input → exact md).
**Risk:** low
**Built:** `lib/cost-comparator-report.ts` (md generator) + `lib/smalldocs.ts` (URL encoder — uses
smalldocs' own documented `deflate-raw` FALLBACK path, not brotli, to avoid bundling their ~1MB WASM
for a v1 export button; verified round-trips against smalldocs' own decoder contract). smalldocs.org's
own PDF/docx render is external — that's Daniel's smoke below, not an automated spec.

### Story 2.2 — Consultant prefill link + promoter leave-behind ✅ built
**As a** promoter/consultant, **I want** a prefillable `/comparador` link, **so that** I can hand the
merchant a comparison already loaded with their numbers.
**Acceptance:** the full calculator state serializes into the URL (query/hash); opening a prefilled
link on any phone, anonymous, restores the exact comparison; the promoter sell-sheet/handbook
(`/vende/promotor/sell-sheet`) links the comparator with a one-line "úsalo en la visita" note. api
spec: prefill URL round-trips a known state.
**Risk:** low
**Built:** `lib/cost-comparator-url.ts` (one codec, used by SSR prefill + the new "Copiar enlace"
button). Scope note: line overrides (Sprint 1's inline per-figure edits) are NOT in the URL — see the
file's header. Sell-sheet leave-behind is a generic `/comparador` link (a static printable page has no
per-visit data to prefill from); the live "Copiar enlace" button is the actual hand-off mechanism.

### Story 2.3 — Agent surface: `/agent` data + MCP `compare_costs` ✅ built
**As a** merchant's own AI agent, **I want** to run the same comparison over UCP/MCP, **so that** the
answer a merchant gets from their assistant matches the page (AGENTS rule #3).
**Acceptance:** the comparator dataset + methodology are readable on `/agent` (+ UCP manifest
pointer); an MCP `compare_costs` tool accepts platform/volume/AOV/apps and returns the stacked
comparison computed by the **identical** `lib/cost-comparator.ts` (no drift — the rental_quote
precedent); api spec asserts tool output equals the lib's for a fixed input; responses carry the
dataset's verified date + sources.
**Risk:** low
**Built:** MCP tool `compare_costs` in `app/api/ucp/mcp/route.ts`, registered in `MCP_BUYER_TOOLS`
(no auth). **Flag decision: no `mcp.*.enabled` gate, no migration file** — checked the newest MCP
tools' convention (`configure_listing_options`/`delete_listing`/`apply_price`/config blocks are all
flagged, but every one is a SELLER WRITE tool); `compare_costs` is read-only/stateless like the
already-unflagged `about_miyagi`/`get_checkout_options`, so it follows THAT precedent instead.

## Sprint QA
- **api spec(s):** md-generator unit spec (2.1, `e2e/cost-comparator-report.spec.ts` — fixed input →
  exact md, byte for byte) + encoder round-trip (`e2e/smalldocs-url.spec.ts`); prefill round-trip spec
  (2.2, `e2e/cost-comparator-url.spec.ts` pure codec + `e2e/comparador-prefill.spec.ts` HTTP-level);
  `compare_costs`-vs-lib parity spec + discovery (2.3, `e2e/mcp-compare-costs.spec.ts`) + `/agent`
  content section. All green locally (`next start` + `PLAYWRIGHT_BASE_URL=http://localhost:3099`) —
  every new spec observed RED once first: the three pure-lib specs via a temporarily-removed lib file
  (`Cannot find module`), the two HTTP-level specs via `git stash` reverting the wiring commits +
  rebuild + restart (6/7 sub-tests failed as expected), then restored + rebuilt + reran green.
- **browser smoke owed:** yes, to Daniel — phone, anonymous: export → smalldocs link opens + renders
  (external-site step an automated smoke can't own).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge — ✅
  all three, on `feat/cost-comparator-s2` merged with `origin/main` (PR #278).

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
