# Contextual agent handoff — Sprint 1: Icon split + Spanish + URL-only contextual

**Status:** 🏗️ BUILT 2026-06-25 — draft [PR #128](https://github.com/danybgoode/miyagisanchezcommerce/pull/128) (risk LOW), awaiting CI-green + Daniel's visual smoke + merge.
- **S1.1** `5b79a3f` — theme toggle glyph `sparks`→`flask`; AI keeps `sparks`; grep-verified no regressions.
- **S1.2** `cbac94a`-prior — pure `lib/agent-prompt.ts buildAgentPrompt`; generic prompt now fully es-MX (English body + bilingual close dropped), off the bilingual allow-list; cold-agent preamble kept.
- **S1.3** `cbac94a` — `resolveAgentContext(pathname, searchParams)` + per-kind es-MX templates (PDP/catalog/shop/account + generic fallback); each carries the canonical URL.
- **Gate:** `tsc` ✅ · `npm run build` ✅ (homepage stays `○` static — used `usePathname` + post-mount `window.location.search`, **not** `useSearchParams`, to avoid de-opting static pages) · Playwright `api` ✅ (`e2e/agent-prompt.spec.ts`, 16 tests: generic + 5 route kinds + fallback + canonical-URL templates).

> The skateboard — ships on its own. Splits the AI/theme icons, makes the prompt Spanish, and makes it
> change by page using **only the URL** (pure client, via `usePathname`/`useSearchParams`). No backend, no
> rich page data yet (that's Sprint 2). All Low-risk.

## Stories

### Story 1.1 — Distinct icon for the theme feature
**As a** user, **I want** the seasonal/designer theme feature and the AI feature to use different icons,
**so that** I can tell them apart at a glance.
**Acceptance:**
- `PlatformThemeToggle.tsx` renders `iconoir-flask` (use `flask-solid` instead only if it's present in the
  pinned `@main` iconoir and reads better — builder confirms).
- The AI button (`AIAgentButton.tsx`, all 3 variants) still renders `iconoir-sparks`.
- No other sparks usage regressed: `grep -rn iconoir-sparks app` reviewed; only intended spots remain.
**Risk:** low. **QA:** visual smoke (Daniel) + the grep check.

### Story 1.2 — Spanish-only prompt + extract a pure builder
**As a** Spanish-speaking shopper, **I want** the agent prompt fully in Spanish, **so that** it reads
naturally and matches the es-MX app.
**Acceptance:**
- The card's prompt is fully **es-MX** (the English body + bilingual closing line are gone).
- Prompt construction is extracted to a pure function `lib/agent-prompt.ts`
  (`buildAgentPrompt(ctx) → string`) — the card calls it; the "generic/default" template lives here.
- Keeps the short "lee la ficha del marketplace (`/agent`) + UCP" preamble so a cold agent still works.
- Copy-to-clipboard and "Abrir en Claude" (`claude.ai/new?q=…`) still work.
- Prompt is **not** added to the bilingual allow-list (AGENTS rule 5).
**Risk:** low. **QA:** unit/`api` spec on `buildAgentPrompt` (generic case) — pure-logic, free coverage.

### Story 1.3 — Route-aware contextual prompt (URL-only)
**As a** shopper, **I want** the prompt to match the page I'm on, **so that** I can always copy something
specific to hand my agent.
**Acceptance:** the card derives page-type from `usePathname()`/`useSearchParams()` and `buildAgentPrompt`
returns the right es-MX template:
- `/l/[id]` (PDP) → prompt contains the canonical product URL + a "revisa este producto…" ask.
- `/l?...` (catalog/search) → prompt contains the active search terms / filters.
- `/s/[slug]` (shop) → prompt contains the shop URL + a "qué vende esta tienda…" ask.
- order/account routes → an order/account-help ask (order ref from the path if present).
- homepage / anything else → the generic template (never empty).
- Falls back to generic gracefully if the route is unknown.
**Risk:** low. **QA:** unit spec mapping `(path, searchParams)` → expected prompt; add one Playwright `api`
assertion where the rendered prompt is checkable.

## Sprint QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `npm run build` + Playwright `api`.
- **New coverage:** `e2e`/unit spec(s) on `lib/agent-prompt.ts` (generic + each route template).
- **Owed to Daniel (browser):** the visual icon check + one real copy→paste→Claude round-trip on a PDP to
  sanity-check the Spanish phrasing.

## Sprint 1 — Smoke walkthrough (do these in order)
_Env (preview, pre-merge): `https://miyagisanchez-git-feat-contextual-a-f74b70-danybgoodes-projects.vercel.app` — swap to https://miyagisanchez.com after merge. The preview is SSO-gated to danybgoodes-projects (Daniel's session opens it). Pick a real listing id for step 4 and a real shop slug for step 6._

1. Open `<preview-url>/` and open the account/theme controls where the theme toggle lives.
   → The theme toggle shows a **flask** icon (not sparks).
2. Look at the navbar AI affordance ("Agente IA" pill / AI icon).
   → It still shows the **sparks** icon.
3. Open the AI card from the navbar on the homepage and read the prompt.
   → The prompt is **in Spanish** and is the generic template.
4. Go to any product page `<preview-url>/l/<some-id>`, open the AI card, click **Copiar prompt**, paste into a notepad.
   → The pasted prompt is Spanish and **contains that product's URL** (`/l/<some-id>`).
5. Go to `<preview-url>/l?q=tenis` (or apply a filter), open the card.
   → The prompt **mentions the search** ("tenis" / the active filter).
6. Go to a shop `<preview-url>/s/<slug>`, open the card.
   → The prompt **contains the shop URL** (`/s/<slug>`).

If any step fails, note the step number + what you saw — that's the bug report.
