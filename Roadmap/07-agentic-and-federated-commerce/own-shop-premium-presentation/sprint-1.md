# Own-shop premium presentation — Sprint 1: Announcement bar + hero + theme presets

**Status:** ✅ built — commits `0c135cb` (Stories 1.1–1.3), `885c843` (Story 1.4) on `feat/own-shop-premium-presentation`

## Stories

### Story 1.1 — Announcement bar ✅
**As a** seller, **I want** a short announcement bar (text + optional link) configured in Diseño, **so that** my shop leads with my message ("Envío gratis desde $500 · Entrega urgente disponible") like StickerJunkie's top strip.
**Acceptance:** renders above the shop header on `/s/[slug]`, subdomain, and custom domain (not embed); absent key → no bar (today's storefront); length-capped, es-MX validation messages; link optional and http(s)-only.
**Risk:** LOW

### Story 1.2 — Hero / featured section ✅
**As a** seller, **I want** to pin up to ~4 listings (or set a promo image + CTA) as a hero above the grid, **so that** my best work greets visitors instead of an unordered wall.
**Acceptance:** pin/unpin from the manage grid or Diseño; hero renders on all three channels; pinned listing removed/unpublished → drops out gracefully; field names must NOT collide with marketplace-level `featured`/`featured_rank` product metadata (shop-level keys, distinctly named).
**Risk:** LOW
**Scope note:** pin/unpin shipped **Diseño-only** for Sprint 1 (a listing picker reusing `getShopListings()`), not also wired into the separate manage grid — the acceptance's "or" is satisfied by one surface; the manage-grid entry point is a fast-follow if wanted.

### Story 1.3 — Curated theme presets ✅
**As a** seller, **I want** to pick one of ~4–6 designed presets (font pairing + surface tones) on top of my accent + banner, **so that** my shop stops looking like every other shop.
**Acceptance:** preset applies across the storefront + PDP under that shop's channels; contrast guardrails enforced (reuse the seasonal-theme-engine checks); all colors via CSS variables (the raw-color CI guard bites new client islands); font loading strategy respects the static-shell perf work (system stacks or self-hosted, no CLS regression measured on the PDP); no preset key → today's look.
**Risk:** LOW-MED
**Implementation note:** 4 presets (`papel`, `pizarra`, `lienzo`, `terracota`) + the `default` no-op — all system/self-hosted font stacks (no new webfont fetch, so zero CLS delta by construction, not just by measurement). Every preset's fg/fg-muted vs surface/surface-alt pairs are asserted ≥ 4.5:1 in `e2e/theme-preset-contrast.spec.ts`.

### Story 1.4 — Config parity (Storefront-as-Code + MCP) ✅
**As a** seller's agent, **I want** `announcement`, `hero`, and `theme_preset` keys accepted by the settings importer and `patch_store_configuration`, **so that** the premium look is one MCP call away.
**Acceptance:** schema + validation + audit-log entries; invalid preset id rejected with a clear message; `get_store_configuration` round-trips the keys.
**Risk:** LOW

## Sprint QA
- **api spec(s), all green:** `e2e/theme-preset-contrast.spec.ts` (every preset ≥ 4.5:1 fg/fg-muted vs
  surface/surface-alt + the unset/default no-op) · `e2e/announcement-hero-config.spec.ts` (announcement/hero
  field validation through `validateConfig`) · `e2e/mcp-store-config-presentation.spec.ts` (manifest →
  `validateConfig` → simulated persisted shop → `buildStoreConfigSnapshot` round-trip + invalid-preset
  rejection) · full `design-token-foundation.spec.ts` re-run clean (the generalized CSS-block parser didn't
  regress the existing raw-color/contrast guard).
- **deterministic gate:** `tsc --noEmit` ✅ · `npm run build` ✅ · `npm run test:e2e` (Playwright `api`) ✅ —
  1311 passed; the only reds (`not-found-shape.spec.ts`, 3× `promoter-applications.spec.ts`) are pre-existing
  local rate-limiter flakes, confirmed unrelated by re-running them against a clean `git stash` of `main`
  before this sprint's changes.
- **Live preview smoke — gap, stated explicitly:** this sprint's build session ran the Medusa backend
  (`npx medusa develop`, connected fine against the real DB) and the frontend dev server locally, and
  confirmed via `curl`/server logs that `/s/miyagiprints` and `/shop/manage/settings/diseno` both render
  `200` server-side with the new sections present. The **Claude Preview browser tool itself** could not
  complete a navigation in this sandbox (every request — including the bare `/` homepage — failed
  client-side with `net::ERR_ABORTED`/`chrome-error`, despite the server returning 200 and `curl` succeeding;
  confirmed after a fresh server restart and both `localhost`/`127.0.0.1`). This is a preview-tooling gap in
  this session, not a code defect — the code path was exercised server-side and by the pure-logic specs
  above, but a real rendered-pixel check did not happen this session.
- **Owed to Daniel:**
  1. The click-through smoke below (steps 1–6), since the automated browser check couldn't run this session.
  2. The theme-preset **contrast eyeball on a real device** (light + dark) — the automated check proves the
     WCAG math, not real-device legibility/vibe.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the PR's Vercel preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/shop/manage/settings/diseno (as miyagiprints).
   → Three new sections below Apariencia: **Anuncio** (text + optional link), **Destacados** (toggle:
   "Anuncios fijados" listing picker / "Imagen promocional"), **Tema** (5-preset picker: Clásico, Papel,
   Pizarra, Lienzo, Terracota).
2. Set the Anuncio text "Envío gratis en pedidos +$500", pick the "Papel" preset, switch Destacados to
   "Anuncios fijados" and pick 3 listings; save.
   → Toast "Cambios guardados correctamente."; no console errors.
3. Open https://miyagisanchez.com/s/miyagiprints in a private window.
   → Bar on top (in the shop's accent color); hero row with the 3 pinned listings below the shop header;
   warm paper surface tone + serif headings from the "Papel" preset; accent + banner unchanged.
4. Open https://miyagiprints.miyagisanchez.com and a listing's PDP (`/l/<id>`) from that shop.
   → Same premium look on both, white-label; the PDP also shows the "Papel" surface tone.
5. Ask your connected seller agent: "cambia el tema de mi tienda al preset pizarra".
   → MCP `patch_store_configuration` succeeds; `get_store_configuration` reflects `theme_preset: "pizarra"`;
   storefront reflects it on reload (cool slate surface, monospace headings).
6. Clear all three settings (Anuncio text empty, Destacados back to no pins, Tema back to "Clásico") and save.
   → Storefront renders exactly as before this sprint (regression) — no bar, no hero, default look.

If any step fails, note the step number + what you saw — that's the bug report.
