# Sprint 3 — Seller snippet generator + theming/bilingual

Goal: close the loop so a seller can actually *get* their widget — a copy-paste snippet from their settings,
matched to their brand and language. Without this the surfaces exist but no seller can self-serve them.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **US-6 + US-7 ✅ built (commit e0eeb25,
branch `feat/embeddable-widget-s3` → PR #7). Both LOW.**

---

## US-6 — "Pon tu tienda en cualquier web" settings section ✅  · Risk: LOW
**As a** seller, **I want** a copy-paste snippet with a live preview, **so that** I can add my widget to my
site without reading docs.
- [x] New settings section (`EmbedSnippetSection` child component) in the "Canal propio" group of
      `ShopSettings.tsx`, beside "Dominio propio".
- [x] Generates the three snippets (button / card / full-shop iframe) **prefilled** with the seller's slug +
      embed key (mint-or-reveal via `GET /api/sell/embed-key`), with a **live preview** (the iframe is truly
      live; button/card render the real custom elements once a listing id is entered).
- [x] One-click copy + a "rotar llave" control + a plain note that buying goes through our hosted checkout
      (no payment on the host page).

**Acceptance:** a seller opens settings, sees their key + three ready snippets, copies one, pastes it on a
test page, and it works.

---

## US-7 — Theming + bilingual tokens ✅  · Risk: LOW
**As a** seller, **I want** the widget to match my brand color and my visitors' language, **so that** it
doesn't look bolted-on.
- [x] `data-accent` tints the CTA (via `--mi-accent`) and `data-locale` (es-MX default; `en` optional) thread
      through the button + card; the snippet generator prefills accent from the shop theme + a locale toggle.
- [x] Bilingual strings ship inside the standalone loader's `STRINGS` dict (both es + en). **Deviation from
      the literal Rule 5 `locales/{es,en}.json`:** `embed.js` is a static third-party script that can't import
      the app i18n at runtime, so its bilingual copy correctly lives in the loader itself (both locales present,
      no English-only hardcoding).

**Acceptance:** changing the accent attribute restyles the button/card; `data-locale="en"` renders English
copy; default is Spanish.

---

### QA (this sprint)
- **Deterministic gate:** `tsc` + `build` + a Playwright spec that the settings section renders the snippet
  with the shop's real key, and that a surface respects `data-locale` (es default / en when set). Against the
  branch preview via the bypass token.
- **Live confirmation:** Daniel (browser) copies a snippet from a test shop's settings, pastes it on a scratch
  page, and confirms brand color + language render as configured.

---

## Epic close-out (do at the end of Sprint 3)
- [x] All sprints' stories merged + smoke-tested (gaps stated — Daniel owns the HIGH-risk US-3 browser smoke
      + the Clerk-gated settings-UI visual check).
- [x] This epic `README.md` flipped to ✅; every `sprint-N.md` ticked with commit refs.
- [x] `RETROSPECTIVE.md` written.
- [x] **Doc-drift corrected:** the Embeddable Widget line in `Roadmap/README.md` (poster) and both
      `07-…/README.md` files flipped from 🚧/📋 to ✅ shipped; *Recent highlights* entry added.
- [x] Team memory + `MEMORY.md` updated.
- [x] Feature branch (`feat/embeddable-widget-s3`) merged via PR #7 + deleted.
