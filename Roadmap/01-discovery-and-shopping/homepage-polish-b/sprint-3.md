# Homepage Polish — Dirección B — Sprint 3: Chrome & community

**Status:** ⬜ not started · **Risk:** LOW *(S3.2 touches shared `layout.tsx` — announce per LEARNINGS)*

> The framing around the merchandise: orientation ribbon, seller-recruit CTAs, mobile footer, and the
> Vecindario live strip.

## Stories

### Story 3.1 — Value-prop ribbon (signed-out only)
**As a** signed-out buyer, **I want** a one-line orientation bar, **so that** I understand what this place
is without a heavy hero.
**Acceptance:** slim bar under the header (bg `--accent-soft`, border `--selva-100`, radius `--r-sm`),
`iconoir-shield-check` accent. Copy: `Compra y vende en México — gratis, protegido y con ofertas.` + link
`Cómo funciona` → **`/acerca`**. Hidden when signed-in.
**Risk:** LOW.

### Story 3.2 — Header: "Vende" pill + in-search agent sparks
**As a** visitor, **I want** an obvious labeled way to sell and to ask the AI from the mobile search bar,
**so that** the affordances aren't a bare cryptic icon.
**Acceptance:** signed-out bare `iconoir-plus-circle` → labeled **"Vende"** pill (`btn btn-primary btn-sm`,
→ `/vende`); add `iconoir-sparks` (color `--agent`) at the right edge of the mobile search input, opening the
same agent surface as desktop `AIAgentButton`.
**Risk:** LOW — but `layout.tsx` is shared; announce + merge latest `main` first.

### Story 3.3 — Terminal CTA + mobile footer + empty-marketplace CTAs
**As a** buyer at the bottom of the page (incl. mobile browser), **I want** a clear next action and the
footer links, **so that** I'm not dead-ended.
**Acceptance:** signed-out terminal CTA `Crear cuenta` (→`/sign-up`) + `Seguir explorando` (→`/l`); footer
links row visible on mobile (remove `hidden md:block` or add a compact mobile variant): Anuncios · Vecindario
· Vende gratis · Agent API · Términos. Empty-marketplace state keeps current copy + adds `Publica lo primero`
(→`/vende`) + `Pasea por el vecindario` (→`/vecindario`).
**Risk:** LOW.

### Story 3.4 — Vecindario live strip (enhance the existing entry)
**As a** buyer, **I want** the Vecindario section to show real local pulse, **so that** the marketplace feels
alive and worth returning to.
**Acceptance:** replace the static banner with 1–2 REAL approved/web-visible pulse items from the same source
as `/vecindario` (`isNeighborhoodPulseSocialItem`, `NEIGHBORHOOD_PULSE_COPY`): type label, 2-line snippet,
`submitter · colonia · timeAgo`, icons `iconoir-star` / `iconoir-bell`. Eyebrow `Pulso local` + `Ver
vecindario →` → `/vecindario`. **Keep `data-testid="vecindario-feed-entry"`.** Empty → current banner copy.
**Risk:** LOW (read-only reuse of a live source).

## Sprint QA
- **api spec(s):** extend `e2e/nav-entry-points.spec.ts` / a home spec — ribbon present in signed-out SSR &
  absent signed-in; footer links present in mobile-width SSR; `vecindario-feed-entry` still in the DOM.
- **browser smoke owed:** light, anonymous — "Vende" pill + search sparks render; **no money/auth step**.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL while pre-merge)

1. Open https://miyagisanchez.com signed-out.
   → A slim ribbon shows under the header; "Cómo funciona" goes to https://miyagisanchez.com/acerca.
2. On mobile width, look at the header.
   → A labeled "Vende" pill (→ `/vende`) and a sparks icon at the right of the search bar (opens the AI agent).
3. Scroll to the bottom on a mobile browser (not the PWA).
   → Footer links (Anuncios · Vecindario · Vende gratis · Agent API · Términos) + terminal CTA are visible.
4. Find the Vecindario section.
   → 1–2 real pulse items render with submitter · colonia · time; "Ver vecindario →" → `/vecindario`.

If any step fails, note the step number + what you saw — that's the bug report.
