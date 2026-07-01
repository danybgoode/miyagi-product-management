# Promoter funnel fixes — `{url}` prompt, `/promotor/cerrar` 404, promoter-aware "Agente IA" sheet

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **08 · Growth & Promotions** (Promoter program follow-up; epic slug `promoter-funnel-fixes`).
Class: **Bug** (`{url}` placeholder + the 404 dead-end) + a small **Feature/light enhancement** (promoter/seller
context for the navbar agent sheet). Kept in one small epic — all three are promoter-funnel polish on the same
recruit → close path, all frontend/copy + one flag check, no commerce/money code.

> One ask, three parts. These share the promoter funnel surface and ship together cheaply; resisted merging with
> the setup-token and SEO asks (their own scope docs).

## Mirror-back
> On the promoter funnel you want: (1) the copy-paste "ask your AI" prompt on `/vende/promotor` to show a **real
> URL** instead of the literal `{url}`; (2) `/vende/promotor` → `/promotor/cerrar` to **stop 404-ing**; and
> (3) the top-navbar **"Agente IA"** bottom-sheet, when a promoter/seller is on these pages, to offer a
> **promoter-onboarding** prompt instead of the generic buyer one. Right?

## Stage 2.5 — can we already do this? **Mostly a fix, plus one light enhancement.**
- `{url}` bug → **fix** (one wiring line). Already-built substitution helper just isn't called here.
- `/promotor/cerrar` 404 → **config/validation first, fix second.** The route works; it 404s only when the
  `promoter.enabled` flag evaluates false. Likely an ops flag state, not a build — confirm before coding.
- Promoter-aware sheet → **light enhancement** to one pure function (`resolveAgentContext`) that the shipped
  `contextual-agent-handoff` epic already established. A new context branch, not a new component.

## Root cause (read against code + live prod, 2026-07-01)

**Bug 1 — `{url}` renders literally on `/vende/promotor`.** Confirmed live: the page shows
*"Hola, ¿puedes abrir **{url}**, ver qué es y qué ofrece…"*. `buildPromoterPageConfig`
(`app/(shell)/vende/_components/page-config.ts`) sets `trustPrompt: copy.shared.trustPrompt` — the **raw**
template string, which contains the `{url}` placeholder. Every persona page instead runs the template through
`sellerTrustPrompt(personaId, copy.shared.trustPrompt)` (`lib/seller-acquisition.ts`), which does
`template.replaceAll('{url}', url)`. The promoter builder bypasses that helper. The visible prompt appears in
**two** places on the page (hero PromptBlock + the "Compruébalo tú mismo" aside) — both read the same
`trustPrompt`, so one fix covers both.

**Bug 2 — `/promotor/cerrar` 404.** `app/(shell)/promotor/cerrar/page.tsx` calls `notFound()` **iff**
`isEnabled('promoter.enabled')` is false; otherwise it `redirect('/sign-in')` for logged-out users and renders
for authed ones. An unauthed prod fetch returned a blank body (consistent with either a 404 **or** a
redirect to the client-rendered Clerk sign-in). Since Daniel (admin) reports a hard **404**, the leading
hypothesis is the **`promoter.enabled` flag evaluating false in prod** — even though the poster/ LEARNINGS say
it's ON. This must be confirmed (Flagsmith) **before** any code: if the flag is simply off, the "fix" is an ops
flag flip, not a build. Independently, the public `/vende/promotor` CTA "Abrir mi panel para cerrar" should
**never dead-end in a 404** for a recruit — a logged-out click should land on sign-in (then the close
workspace), and a flag-off state should show a graceful "coming soon"/hidden CTA, not a 404.

**Enhancement 3 — the "Agente IA" sheet is buyer-only on promoter/seller pages.** `AIAgentButton.tsx` opens a
sheet whose prompt comes from `buildAgentPrompt(resolveAgentContext(pathname, …))` (`lib/agent-prompt.ts`).
`resolveAgentContext` maps only `/l`, `/l/[id]`, `/s/[slug]`, `/account/*`; **everything else — including
`/vende`, `/vende/promotor`, `/promotor/*`, `/sell` — falls to `generic`**, i.e. the buyer prompt
"¿Qué estás buscando hoy?". So a promoter (or prospective seller) reading the pitch gets a *buyer* hand-off,
which is contextually wrong.

## What already exists (reuse, don't rebuild)
- `sellerTrustPrompt(id, template)` — the `{url}` substitution helper. **Reuse** for Bug 1 (or inline the same
  `replaceAll` in `buildPromoterPageConfig` with the promoter page's own URL).
- `buildPromoterPageConfig` / `SellerAcquisitionPage` / `PromptBlock` — the promoter page + its prompt UI. No
  UI change needed for Bug 1, only the value passed in.
- `lib/flags.ts` `isEnabled('promoter.enabled')` — the existing gate; Bug 2 is about its **value** + the
  degrade path, not new gating.
- `lib/agent-prompt.ts` (`AgentPromptContext` discriminated union, `resolveAgentContext`, `buildAgentPrompt`,
  `PREAMBLE`) — the shipped `contextual-agent-handoff` seam. Enhancement 3 adds a new `kind` + `ask()` branch.
- `AIAgentButton.tsx` — the sheet UI, copy + `claude.ai/new?q=` deep-link, 3 variants. Unchanged; it just
  renders whatever prompt the builder returns.

## Medusa-first reframe (AGENTS five-rule check)
- **Rule 1 (Medusa commerce):** untouched — no products/orders/payments.
- **Rule 2 (Supabase):** untouched — no tables.
- **Rule 3 (UCP/MCP first-class):** reinforced — the promoter/seller prompt hands the agent the canonical
  `/vende/promotor` (or `/vende`) URL it already resolves; no manifest/endpoint change.
- **Rule 4 (Clerk):** untouched — the 404 path already uses Clerk `currentUser`/`redirect('/sign-in')`.
- **Rule 5 (es-MX + bilingual allow-list):** all copy is es-MX; the agent prompt is **not** on the bilingual
  allow-list and stays es-MX only.

## In scope (v1)
- Substitute the real URL into the `/vende/promotor` copy-paste prompt (both render sites).
- Confirm the `promoter.enabled` prod flag state; make the public promoter CTA degrade gracefully so it never
  serves a 404 (sign-in when logged out; hidden/"pronto" when the flag is off).
- Add a **promoter** (and by extension **seller/`vende`**) context to `resolveAgentContext` + a matching es-MX
  onboarding `ask()` in `buildAgentPrompt`, so the navbar sheet on `/vende*`, `/promotor/*`, `/sell*` offers a
  seller/promoter-onboarding prompt.

## Out of scope (v1)
- Any change to the promoter commission ledger, close workspace logic, or the gem-claim handoff.
- Re-theming or redesigning the "Agente IA" sheet, or adding ChatGPT/Gemini deep-links.
- Adding the agent prompt to the bilingual allow-list.
- The broader SEO/indexing work and the setup-token work (separate scope docs).

## UX heuristics
- **No dead ends:** a recruit clicking the promoter CTA always reaches a useful next step, never a 404.
- **Context-true hand-off:** on a seller/promoter page the sheet pitches *selling/recruiting*, not buying.
- **Copy-ready everywhere:** the prompt is always a real, pasteable string — never a template with `{url}`.

### Prompt phrasing to validate (promoter/seller context) — confirm in smoke
Recommended es-MX (promoter):
> "Quiero ser promotor de Miyagi Sánchez y ganar comisión montando tiendas en persona. Abre
> https://miyagisanchez.com/vende/promotor, dime cómo funciona el programa, cuánto puedo ganar y cómo empiezo."

Recommended es-MX (seller on `/vende*`):
> "Estoy pensando en vender en Miyagi Sánchez. Abre https://miyagisanchez.com/vende, dime qué es, cuánto
> pagaría vs. Mercado Libre y Shopify, qué puedo vender y cómo abro mi tienda."

## Acceptance criteria (Daniel-testable)
- `/vende/promotor` shows a real URL in both prompt blocks — no literal `{url}` anywhere on the page.
- Clicking "Abrir mi panel para cerrar" from `/vende/promotor` **never 404s**: signed-out → sign-in →
  close workspace; signed-in promoter → the workspace; flag-off → a graceful hidden/"pronto" state (agreed at S1).
- On `/vende`, `/vende/promotor`, and `/sell`, opening the "Agente IA" sheet shows a **seller/promoter**
  onboarding prompt (not "¿Qué estás buscando hoy?"); copy + "Abrir en Claude" still work.
- Buyer pages (`/l`, `/s/[slug]`, `/account/*`, home) are unchanged.

## Slices → sprints (epic `08-growth-and-promotions/promoter-funnel-fixes`)

### Sprint 1 — Quick fixes + flag confirmation (skateboard, ships alone)
| # | Story | Risk | QA |
|---|---|---|---|
| 1 | **As a** promoter recruit, **I want** the copy-paste prompt on `/vende/promotor` to contain a real URL, **so that** my agent can actually open it. (wire `sellerTrustPrompt`/`replaceAll` into `buildPromoterPageConfig`) | Low | `api` spec: `/vende/promotor` SSR HTML contains `https://…/vende/promotor` and **no** `{url}` |
| 2 | **As a** promoter recruit, **I want** the "cerrar" CTA to never 404, **so that** I can reach the close flow. (confirm `promoter.enabled` prod value; degrade the public CTA: sign-in when logged out, hidden/"pronto" when flag off) | Low (copy/guard) · flag check is ops | `api` spec asserting `[200,401/redirect,404-only-when-flag-off]` per the flag→auth ordering (LEARNINGS); Daniel confirms flag in Flagsmith |
| 3 | **As a** prospective seller/promoter, **I want** the navbar agent sheet to match the page, **so that** it pitches selling/recruiting. (add `seller`/`promoter` kind to `resolveAgentContext` + es-MX `ask()`) | Low | Unit/`api` spec: path → expected prompt for `/vende`, `/vende/promotor`, `/sell`, and unchanged buyer paths |

**No Sprint 2** unless S1.2's flag check reveals a real routing bug (then a small follow-up story to fix the
route, still Low unless it touches auth).

## QA stage
- **Deterministic gate (every story):** `tsc --noEmit` + `npm run build` + Playwright `api` suite.
- **Free coverage seam:** `lib/agent-prompt.ts` is pure → unit/`api` spec covers Story 3; the `{url}` fix is an
  SSR-HTML `api` assertion (no browser).
- **Owed to Daniel:** confirm the live `promoter.enabled` flag state (Flagsmith) for Story 2; one browser click
  of the copy→paste→agent round-trip for Story 1/3 (an automated smoke can render-assert but can't judge the
  agent's reply).

## Risk tiers
All three stories **Low** (frontend copy + one pure function + a public-CTA guard; no money/checkout/auth
mutation). Story 2's flag confirmation is an **ops** step (Daniel). No kill-switch needed.

## Open questions for Daniel
1. **`/promotor/cerrar` flag:** is `promoter.enabled` meant to be ON in prod right now? (If yes and it's off →
   ops flip; if intentionally off → we hide the public CTA behind the same flag so it can't 404.)
2. **Flag-off degrade copy:** when promoter is off, should the `/vende/promotor` CTA read "Próximamente" or be
   hidden entirely? Default: hidden.
3. **Seller vs promoter prompt on `/vende` anchor:** the anchor `/vende` already has its own on-page
   copy-paste seller prompt. Do you want the navbar sheet there to duplicate the seller pitch, or only add the
   dedicated **promoter** prompt on `/vende/promotor` + `/promotor/*` and leave `/vende` generic? Default:
   seller prompt on `/vende*`, promoter prompt on `/promotor*`.
