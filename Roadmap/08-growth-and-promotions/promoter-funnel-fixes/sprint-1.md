# Promoter funnel fixes — Sprint 1: `{url}` fix, no-404 CTA, promoter-aware sheet

**Status:** ✅ shipped 2026-07-02 — PR [#157](https://github.com/danybgoode/miyagisanchezcommerce/pull/157)
(squash `b3a9956`) merged to `main`; `promoter.enabled` confirmed **ON** in prod (Daniel). Branch
`feat/promoter-funnel-fixes` deleted.

> All copy is **es-MX** (not on the bilingual allow-list). Prompt phrasings below are recommendations to
> confirm in the smoke.

## Stories

### Story 1.1 — Real URL in the `/vende/promotor` copy-paste prompt
**As a** promoter recruit, **I want** the "ask your AI" prompt to contain a real URL, **so that** my agent can
actually open and evaluate the offer.
**Root cause:** `buildPromoterPageConfig` (`app/(shell)/vende/_components/page-config.ts`) sets
`trustPrompt: copy.shared.trustPrompt` — the raw template containing `{url}`. Persona pages instead run it
through `sellerTrustPrompt(personaId, copy.shared.trustPrompt)` (`lib/seller-acquisition.ts`,
`replaceAll('{url}', url)`). The prompt renders in **two** places on the page (hero PromptBlock + the
"Compruébalo tú mismo" aside) — both read this one value.
**Changes:** substitute the promoter page's own absolute URL (`https://miyagisanchez.com/vende/promotor`) into
`trustPrompt` — reuse `sellerTrustPrompt` (extend it to accept a plain path/URL) or inline the same
`replaceAll`. Do not change the shared template string.
**Acceptance:** `/vende/promotor` SSR HTML shows `…abrir https://miyagisanchez.com/vende/promotor…` in both
prompt blocks; the literal `{url}` appears nowhere on the page.
**Risk:** low · **QA:** `api` spec asserting the SSR HTML contains the real URL and **not** `{url}`.
**✅ Shipped via PR [#156](https://github.com/danybgoode/miyagisanchezcommerce/pull/156) (squash `c922e38`,
`feat/agent-discovery-and-indexing` S1.2, commit `e23482c`), merged to `main` 2026-07-02 — a different epic
found and fixed the identical root cause (`promoterTrustPrompt()` in `lib/seller-acquisition.ts` +
`buildPromoterPageConfig` wiring) before this sprint started building. No new code for this story in
`feat/promoter-funnel-fixes` — merged first so it's inherited, not duplicated. Verified live in this branch's
worktree: `promoterTrustPrompt` present, resolves to the real URL.**

### Story 1.2 — The public promoter CTA never 404s
**As a** promoter recruit, **I want** "Abrir mi panel para cerrar" to always reach a useful next step, **so
that** I never hit a dead 404.
**Root cause:** `app/(shell)/promotor/cerrar/page.tsx` `notFound()`s when `isEnabled('promoter.enabled')` is
false (else redirects logged-out users to `/sign-in`). Leading hypothesis: the flag evaluates **false in prod**
(confirm in Flagsmith — poster/LEARNINGS say ON).
**Changes:**
- **Ops (Daniel):** confirm `promoter.enabled` value in prod. If it should be on and is off → flip it (fixes
  the 404 outright).
- **Guard (code):** gate the public `/vende/promotor` CTA on the same flag so, when promoter is off, the CTA is
  hidden or reads "Próximamente" (default: hidden) rather than linking to a route that 404s. When the flag is
  on, logged-out click → `/sign-in` → close workspace (already the behavior).
**Acceptance:** with the flag **on**, the CTA reaches sign-in (logged out) or the workspace (authed promoter);
with the flag **off**, the CTA is hidden/"pronto" and no promoter path serves a raw 404.
**Risk:** low (copy/guard) + ops (flag) · **QA:** `api` spec agnostic to the live flag value
(`[200, 401/redirect, 404-only-when-flag-off]`) following the **flag → auth → config** ordering (LEARNINGS,
promoter-program S3/S4); Daniel confirms the flag in Flagsmith.
**🏗️ Built** (`e8467e1`): `buildPromoterPageConfig` now takes `opts.enabled` (read server-side via
`isEnabled('promoter.enabled')` in `app/(shell)/vende/promotor/page.tsx`) and returns `primaryCta: null` /
`closingCta: null` when off — `SellerAcquisitionPageConfig`'s CTA fields became nullable (mirrors the existing
optional `secondaryCta`), so the shared hero/closing sections just skip rendering them. **Default is hidden**,
not "Próximamente" copy (no new locale strings needed). New `api` specs in `e2e/promoter-close.spec.ts` assert
the CTA-presence ⇔ route-reachability invariant directly, agnostic to the live flag value.
**`promoter.enabled` confirmed ON in prod (Daniel, 2026-07-02)** — the CTA is live and reachable.

### Story 1.3 — Promoter/seller-aware "Agente IA" sheet
**As a** prospective seller/promoter, **I want** the navbar agent sheet to pitch selling/recruiting on
seller/promoter pages, **so that** the hand-off matches what I'm reading.
**Root cause:** `resolveAgentContext` (`lib/agent-prompt.ts`) maps only `/l`, `/l/[id]`, `/s/[slug]`,
`/account/*`; `/vende*`, `/promotor/*`, `/sell*` fall to `generic` → the buyer prompt.
**Changes:** add a `seller` and/or `promoter` `kind` to `AgentPromptContext`, detect `/vende*` (seller),
`/vende/promotor` + `/promotor/*` (promoter), and `/sell*` (seller) in `resolveAgentContext`, and add matching
es-MX `ask()` branches (keep the shared `PREAMBLE`). Buyer paths unchanged.
**Recommended phrasings (confirm in smoke):**
- Promoter: *"Quiero ser promotor de Miyagi Sánchez y ganar comisión montando tiendas en persona. Abre
  https://miyagisanchez.com/vende/promotor, dime cómo funciona, cuánto puedo ganar y cómo empiezo."*
- Seller (`/vende*`, `/sell*`): *"Estoy pensando en vender en Miyagi Sánchez. Abre https://miyagisanchez.com/vende,
  dime qué es, cuánto pagaría vs. Mercado Libre y Shopify, qué puedo vender y cómo abro mi tienda."*
**Acceptance:** opening the sheet on `/vende`, `/vende/promotor`, `/sell` shows the seller/promoter prompt
(not "¿Qué estás buscando hoy?"); buyer pages unchanged; copy + "Abrir en Claude" still work.
**Risk:** low · **QA:** unit/`api` spec: path → expected prompt for the new + unchanged paths (pure function).
**🏗️ Built** (`e45f2b5`): added `seller`/`promoter` kinds to `AgentPromptContext`. Detection order in
`resolveAgentContext` (most specific first): `/promotor/*` and `/vende/promotor` → `promoter`; any other
`/vende*` or `/sell*` → `seller`. Shipped the recommended phrasings below verbatim. 12 new `api` specs in
`e2e/agent-prompt.spec.ts` cover both new kinds + a buyer-path regression check.

**Cross-agent review (codex, PR #157, advisory):** no blocking findings. Applied both non-blocking items in
`7ff6ac8` — hardened the Story 1.2 CTA-invariant test to fetch both routes concurrently instead of sequentially
(closes an already-narrow race given `lib/flags.ts`'s 60s in-process flag cache), and deduped the two
identical flag-gated CTA shapes in `buildPromoterPageConfig` into one `closeWorkspaceCta()` helper.

## Sprint QA
- **api spec(s):** Story 1.1 (SSR URL), Story 1.2 (flag-agnostic status), Story 1.3 (path → prompt).
- **Free coverage seam:** `lib/agent-prompt.ts` is pure → unit/`api` covers Story 1.3 fully.
- **browser smoke owed to Daniel:** the copy→paste→agent round-trip (an automated smoke render-asserts the
  sheet but can't judge the agent's reply) + confirming the `promoter.enabled` flag in Flagsmith.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: **production** — `https://miyagisanchez.com` (merged 2026-07-02, `promoter.enabled` confirmed **ON**).

1. Open `https://miyagisanchez.com/vende/promotor` and find the "Copiar prompt para mi IA" block.
   → The prompt reads **"…abrir https://miyagisanchez.com/vende/promotor…"** — no literal `{url}` anywhere.
   *(Shipped via PR #156, confirmed live on this branch.)*
2. Scroll to "Compruébalo tú mismo" further down the same page.
   → The second prompt block also shows the real URL, not `{url}`.
3. Click **"Abrir mi panel para cerrar"** while **signed out**.
   → With the flag ON, you land on sign-in (then the close workspace) — **not** a 404.
4. In the top navbar, tap **"Agente IA"** while on `/vende/promotor`.
   → The bottom-sheet prompt reads *"Quiero ser promotor de Miyagi Sánchez y ganar comisión montando tiendas en
   persona…"* — not "¿Qué estás buscando hoy?". Tap **Copiar prompt** → it copies; **Abrir en Claude** opens
   Claude with the promoter prompt.
5. Tap **"Agente IA"** on `/vende` (the anchor seller page).
   → The prompt reads *"Estoy pensando en vender en Miyagi Sánchez…"* — the seller pitch, distinct from the
   promoter one in step 4.
6. Open `https://miyagisanchez.com/l/<any-listing>` and tap **"Agente IA"**.
   → The buyer prompt is unchanged (regression check) — still the generic marketplace hand-off, not a seller
   or promoter pitch.

If any step fails, note the step number + what you saw — that's the bug report.

**Owed to Daniel (not covered by this branch's automated gate):**
- ~~Confirm `promoter.enabled`'s live prod value~~ — **done, confirmed ON 2026-07-02.**
- The copy→paste→agent round-trip itself (an automated smoke can assert the sheet renders + copies the right
  text, but not judge how Claude/ChatGPT/Gemini actually responds to it) — still owed.
