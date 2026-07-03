# Own-shop premium presentation — Sprint 1: Announcement bar + hero + theme presets

**Status:** ⬜ not started

## Stories

### Story 1.1 — Announcement bar
**As a** seller, **I want** a short announcement bar (text + optional link) configured in Diseño, **so that** my shop leads with my message ("Envío gratis desde $500 · Entrega urgente disponible") like StickerJunkie's top strip.
**Acceptance:** renders above the shop header on `/s/[slug]`, subdomain, and custom domain (not embed); absent key → no bar (today's storefront); length-capped, es-MX validation messages; link optional and http(s)-only.
**Risk:** LOW

### Story 1.2 — Hero / featured section
**As a** seller, **I want** to pin up to ~4 listings (or set a promo image + CTA) as a hero above the grid, **so that** my best work greets visitors instead of an unordered wall.
**Acceptance:** pin/unpin from the manage grid or Diseño; hero renders on all three channels; pinned listing removed/unpublished → drops out gracefully; field names must NOT collide with marketplace-level `featured`/`featured_rank` product metadata (shop-level keys, distinctly named).
**Risk:** LOW

### Story 1.3 — Curated theme presets
**As a** seller, **I want** to pick one of ~4–6 designed presets (font pairing + surface tones) on top of my accent + banner, **so that** my shop stops looking like every other shop.
**Acceptance:** preset applies across the storefront + PDP under that shop's channels; contrast guardrails enforced (reuse the seasonal-theme-engine checks); all colors via CSS variables (the raw-color CI guard bites new client islands); font loading strategy respects the static-shell perf work (system stacks or self-hosted, no CLS regression measured on the PDP); no preset key → today's look.
**Risk:** LOW-MED

### Story 1.4 — Config parity (Storefront-as-Code + MCP)
**As a** seller's agent, **I want** `announcement`, `hero`, and `theme_preset` keys accepted by the settings importer and `patch_store_configuration`, **so that** the premium look is one MCP call away.
**Acceptance:** schema + validation + audit-log entries; invalid preset id rejected with a clear message; `get_store_configuration` round-trips the keys.
**Risk:** LOW

## Sprint QA
- **api spec(s):** preset resolver spec (every preset passes contrast assertions) · announcement/hero config validation spec · MCP patch round-trip spec
- **browser smoke owed:** yes, to Daniel — theme-preset contrast eyeball on a real device (light + dark)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/shop/manage/settings/diseno (as miyagiprints).
   → New controls: Anuncio (bar), Destacados (hero), Tema (preset picker with previews).
2. Set the bar text "Envío gratis en pedidos +$500" + pick a preset + pin 3 listings; save.
   → Save confirms; no console errors.
3. Open https://miyagisanchez.com/s/miyagiprints in a private window.
   → Bar on top, hero with the 3 pinned listings, preset typography/tones applied; accent + banner intact.
4. Open https://miyagiprints.miyagisanchez.com.
   → Identical premium look, white-label.
5. Ask your connected seller agent: "cambia el tema de mi tienda al preset X".
   → MCP patch succeeds; storefront reflects it on reload; audit log shows the change.
6. Clear all three settings.
   → Storefront renders exactly as before this sprint (regression).

If any step fails, note the step number + what you saw — that's the bug report.
