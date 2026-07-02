# Sprint 1 · Landing v2 — say the true offer

> Epic: [Promoter Funnel v2](README.md) · Risk: LOW (frontend copy + pure lib) · Status: 📋 planned
> Surfaces: `/vende/promotor`, `/vende/promotor/sell-sheet`, the "Agente IA" sheet. Frontend-only.

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
*(placeholder — fill with real URLs at build time)*
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/vende/promotor → hero shows earnings numbers (no lone `%`), CTA
   reads "Aplica para ser promotor" (or the S2 teaser).
2. Tap the hero copy button → paste: the "Quiero ser promotor…" prompt with the real URL.
3. Open the navbar "Agente IA" sheet on the same page → prompt opens with the recruiting framing,
   still cites miyagisanchez.com/agent and ucp.dev.
4. Open https://miyagisanchez.com/vende/promotor/sell-sheet → the Manual del promotor renders +
   prints cleanly.
5. In /admin/promoter change a commission % → reload the landing → number updated.

If any step fails, note the step number + what you saw — that's the bug report.
