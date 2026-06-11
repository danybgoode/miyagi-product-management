# Marketplace positioning — Sprint 1: Rewrite public metadata, OG card & add meta spec

**Status:** ⬜ not started

> All copy is **es-MX** (these surfaces are not on the bilingual allow-list). Final wording below is
> Daniel's, signed off 2026-06-10.

## Stories

### Story 1.1 — Rewrite public metadata in `app/layout.tsx`
**As a** first-time visitor / search engine / someone who receives a shared link, **I want** the page
title and description to say Miyagi is a marketplace to buy, sell and open your own shop, **so that** I
instantly understand what it is instead of reading "Infraestructura de comercio."
**Changes** (`export const metadata`, ~L38–73):
- `title.default`: `'Miyagi Sánchez — Abre tu tienda, compra y vende'`
- `title.template`: `'%s | Miyagi Sánchez'` *(unchanged)*
- `description`: `'El nuevo punto de encuentro para comprar y vender de todo en México. Encuentra cosas de segunda mano, eventos, productos o servicios, abre tu propia tienda y vende sin comisiones.'`
- `keywords`: `['marketplace México', 'segundamano', 'comprar y vender', 'vender sin comisiones', 'abrir tienda online', 'eventos', 'México']`
- `openGraph.title` + `twitter.title`: `'Miyagi Sánchez — Abre tu tienda, compra y vende'`
- `openGraph.description` + `twitter.description`: the new description (twitter may trim to ≤200 chars)
- `appleWebApp.title`: `'Miyagi Sánchez'` *(unchanged)*
**Acceptance:** view-source of `/` shows the new `<title>`, `meta[name=description]`, `og:title`,
`og:description`, `twitter:title`; no "Infraestructura de comercio" in the head.
**Risk:** low

### Story 1.2 — Rewrite the OG share card in `app/opengraph-image.tsx`
**As a** person who shares a Miyagi link on WhatsApp/Twitter, **I want** the preview image to read as a
marketplace, **so that** the recipient sees what it is at a glance.
**Changes:**
- `alt` (L3): `'Miyagi Sánchez — Abre tu tienda, compra y vende'`
- tagline (L97): `'Compra y vende de todo en México · Sin comisiones'`
- pill badges (L102): `['Marketplace', 'Segundamano', 'Tu propia tienda', '0% comisión']`
**Acceptance:** `GET /opengraph-image` renders the new tagline + pills; no "API agentic" / "Dominio
propio" / "Infraestructura".
**Risk:** low

### Story 1.3 — Add the metadata `api` spec + sweep the suite
**As a** future agent changing this surface, **I want** a spec that pins the new copy, **so that** a
regression (or a reverted byte) fails CI.
**Changes:**
- Add `e2e/marketplace-positioning.spec.ts` (api project): `request.get('/', { headers: { Accept:
  'text/html' } })` → assert the body **contains** the new title + a distinctive description fragment
  (e.g. `punto de encuentro`) and **does NOT contain** `Infraestructura de comercio`.
- **Per LEARNINGS (robots/casing, 2026-06-09):** `grep -rn "Infraestructura de comercio"` and any
  homepage-title/OG assertion across `e2e/` and update/remove stale ones in the same PR. (This groom
  found none, but re-check against the full checkout — the mounted tree here omitted `e2e/`.)
**Acceptance:** `npm run test:e2e` green locally and in CI vs the preview.
**Risk:** low

## Sprint QA
- **api spec(s):** Story 1.3 → `e2e/marketplace-positioning.spec.ts` (covers 1.1's head copy directly;
  1.2's image is asserted via the route returning 200 + the `alt`/title bytes where reachable, else a
  manual card-render check below).
- **browser smoke owed:** **none to Daniel** — no money/auth/checkout path. Fully agent-smokeable.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open `https://miyagisanchez.com` and use the browser's **View Source** (⌥⌘U).
   → The `<title>` reads **"Miyagi Sánchez — Abre tu tienda, compra y vende"**, and
   `<meta name="description">` contains **"El nuevo punto de encuentro para comprar y vender de todo en México…"**.
2. In the same source, search the page for **"Infraestructura de comercio"**.
   → Zero matches (it no longer appears anywhere in the head).
3. Open `https://miyagisanchez.com/opengraph-image` directly.
   → The card renders with the tagline **"Compra y vende de todo en México · Sin comisiones"** and the
   pills **Marketplace · Segundamano · Tu propia tienda · 0% comisión** — no "API agentic" / "Dominio propio".
4. Paste `https://miyagisanchez.com` into a link-preview tester (e.g. opengraph.xyz) or a WhatsApp draft.
   → Title, description and image all read as the marketplace, not "infraestructura."

No step here touches money or auth — the agent can run all four against the preview; none are owed to Daniel.

If any step fails, note the step number + what you saw — that's the bug report.
