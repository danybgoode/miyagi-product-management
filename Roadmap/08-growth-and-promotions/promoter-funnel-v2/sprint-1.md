# Sprint 1 · Landing v2 — say the true offer

> Epic: [Promoter Funnel v2](README.md) · Risk: LOW (frontend copy + pure lib) · Status: ✅ **MERGED**
> [PR #162](https://github.com/danybgoode/miyagisanchezcommerce/pull/162) squash-merged to `main` as
> `8513fee` on 2026-07-02 — full gate green (tsc + build + Playwright api vs preview); browser
> mobile-overflow spec green (7/7); cross-agent review (a fresh Claude reviewer agent) came back
> mergeable, no rule violations, one real numeric bug caught and fixed pre-merge (see below). The
> `scripts/cross-review.mjs` advisory pass couldn't run this time — codex was quota-exhausted, and
> antigravity's pinned-CLI-version guard tripped (1.0.12 vs pinned 1.0.10) — both non-blocking, since
> that pass is advisory-only per WAYS-OF-WORKING.
> Surfaces: `/vende/promotor`, `/vende/promotor/sell-sheet`, the "Agente IA" sheet. Frontend-only.

| Story | Status | Commit |
|---|---|---|
| US-1.1 — Hero prompt = the promoter agent prompt (single source) | ✅ | `cde9b74` |
| US-1.2 — Context-aware agent-sheet preamble | ✅ | `0ad7678` |
| US-1.3 — CTA + wording sweep | ✅ | `d1fdea5` |
| US-1.4 — Real earnings + per-SKU price table | ✅ | `0480b26` |
| US-1.5 — Handbook: sell-sheet → "Manual del promotor" | ✅ | `4fd7c24` |
| Mobile-overflow browser spec (+ a real bug it caught + fixed) | ✅ | `535d3f1` |
| Post-review fix: commission preview must use the discounted price | ✅ | `5c8db13` |

**Post-merge note:** `computePromoterSkuEarnings` originally computed the displayed commission off the
*regular* (undiscounted) SKU price; a fresh reviewer agent caught that the real accrual path
(`markAttributionPaid` → `gross_amount_cents`) pays commission on the amount actually **charged**
(the promoter-discounted price) — and `getPromoterSettings()` already falls back to a non-zero
discount by default, so the divergence is live-reachable the moment Sprint 3 sets a real commission
rate. Fixed in `5c8db13` before merge (commission now computed off the discounted price); new spec
assertion added.

## US-1.1 — Hero copiable prompt = the promoter agent prompt
**As** a prospective promoter, **I want** the landing's copy-paste prompt to be the promoter ask
("Quiero ser promotor de Miyagi Sánchez y ganar comisión montando tiendas en persona…"), **so that**
my agent evaluates the *job*, not a generic seller pitch.
**Build note:** reuse `lib/agent-prompt.ts` `case 'promoter'` as the single source (export the ask or
call `buildAgentPrompt({kind:'promoter'})`); stop rendering the shared `trustPrompt` template via
`promoterTrustPrompt` in `buildPromoterPageConfig`. Sheet + hero must not be able to drift.
**Acceptance:** the hero copy button copies the promoter prompt (with the real
`https://miyagisanchez.com/vende/promotor` URL); one `api` spec asserts hero prompt === sheet prompt source.

## US-1.2 — Context-aware agent-sheet preamble
**As** a visitor on a recruiting page (promoter/seller), **I want** the sheet's prompt preamble to
frame the agent for that job instead of "Eres mi asistente de compras", **so that** the handoff makes
sense — while keeping the two sources (ficha `/agent` + https://ucp.dev) in every variant (the value
prop stays).
**Build note:** split `PREAMBLE` in `lib/agent-prompt.ts` into context-aware framings keyed off
`AgentPromptContext.kind` (shopping default; seller/promoter get an es-MX evaluate-this-opportunity
framing). Pure function change + spec update; no UI change (`AIAgentButton` renders what the builder returns).
**Acceptance:** on `/vende/promotor` and `/vende*` the copied sheet prompt no longer opens with the
shopping-assistant preamble but still cites `/agent` + ucp.dev; buyer surfaces unchanged; specs updated.

## US-1.3 — CTA + wording sweep
**As** a visitor, **I want** a clear path in ("Aplica para ser promotor") and copy that reads like
money ("empieza a ganar hoy"), **so that** I know what I get and how to start.
**Build note:** primary CTA for a visitor → the application flow (S2; until it lands, anchor to an
application-teaser section — never a dead link); an enrolled promoter still reaches "Abrir mi panel".
Fix stale copy: subdomain glossary "gratis para todos" → "$199/año — GRATIS el primer año con tu
código" (per the epic decision); reframe features benefit-first for merchants/promoters (sorteos,
eventos, punto de entrega, "que los agentes de IA encuentren la tienda" — what's possible, not tool
names). All es-MX; correct accents/¿¡ (CI-guarded).
**Acceptance:** no "Abrir mi panel para cerrar" as the visitor-facing primary CTA; no stale subdomain
claim; es-MX completeness passes.

## US-1.4 — Real earnings + per-SKU price comparison from admin config
**As** a prospective promoter, **I want** real numbers — my commission per product and what the
merchant pays regular vs with my code, plus an "if you close X shops/month" earnings example —
**so that** the empty `%` becomes a reason to apply.
**Build note:** replace the `'%'` heroStat in `buildPromoterPageConfig`; server-render figures from
the existing admin config (per-SKU commission % from `lib/promoter-commission.ts` settings + the
seller-discount settings in `lib/promoter.ts`). The bundle line appears when S3 lands — degrade
gracefully (hide, never show `$0`/placeholder) until the config exists.
**Acceptance:** Daniel changes a commission % in `/admin/promoter` → the landing changes without a
deploy; one `api` spec on the pure earnings/table computation.

## US-1.5 — Handbook: sell-sheet → "Manual del promotor"
**As** an active promoter, **I want** a day-to-day cheatsheet — the offer table, 30-second scripts
per product, the close checklist (montar → cobrar → diseñar anuncio → entregar por WhatsApp →
recibo), and how payments work (transfer what's owed, keep your commission) — **so that** I can run
a close start-to-finish without asking Daniel.
**Build note:** evolve `/vende/promotor/sell-sheet` (keep printable); link as the secondary CTA
("Manual del promotor"). Links the S5 rate-card PDF when it exists (degrade: hide the link).
**Acceptance:** a new promoter can execute a full close from this page alone (Daniel's read-through);
printable layout intact.

## Sprint QA
- Deterministic gate green (tsc + build + Playwright `api` vs preview).
- New/updated pure specs: agent-prompt preamble variants; hero-prompt single-source; earnings computation.
- Mobile overflow browser spec on the reworked landing (360/390/414px) — nightly project.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: **production** · https://miyagisanchez.com (live since the `main` merge, 2026-07-02).

1. Open https://miyagisanchez.com/vende/promotor (signed out) → hero shows `$499` (Dominio propio) and
   `$199` (Subdominio) — no lone `%` and no `Gratis` placeholder. Primary CTA reads **"Aplica para ser
   promotor"** (not "Abrir mi panel para cerrar") and jumps to the "La solicitud en línea llega
   pronto" section further down the page when tapped.
2. Tap the hero copy button ("Copiar prompt para mi IA") → paste it somewhere → it should read
   *"Quiero ser promotor de Miyagi Sánchez y ganar comisión montando tiendas en persona. Abre
   https://miyagisanchez.com/vende/promotor…"* — the same text the navbar sheet uses (step 3).
3. Open the navbar "Agente IA" sheet on the same page → the prompt opens with *"Eres mi asesor para
   evaluar esta oportunidad de negocio…"* (not "Eres mi asistente de compras"), still cites
   `miyagisanchez.com/agent` and `ucp.dev`, and is byte-identical to the hero prompt from step 2.
4. Open https://miyagisanchez.com/vende/promotor/sell-sheet → **"Manual del promotor"** renders with
   the glossary, the 5-step close checklist, 4 sales scripts, and the payments section (incl. one
   "Próximamente" line); ⌘P / print preview shows a clean printable layout (site chrome hidden).
5. Resize to a phone width (or open on a real phone) on both pages above → no sideways scroll.
6. **Deferred to Sprint 3 (admin commission config isn't built yet):** once `/admin/promoter` gets a
   commission-rate field, changing a SKU's % there and reloading `/vende/promotor` should update the
   heroStat + glossary price lines without a deploy — the pure computation
   (`lib/promoter-earnings.ts`) is unit-tested now (`e2e/promoter-earnings.spec.ts`), but there's no
   live admin UI to drive it end-to-end until then.

If any step fails, note the step number + what you saw — that's the bug report.

**Nothing here is money/auth-gated** — every step above is a public, unauthed content page, so there's
no smoke step that's structurally owed to Daniel; this walkthrough is a quick confirmation pass, not a
gap-fill.
