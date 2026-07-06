# Admin content & announcements — Sprint 3: Announcements — seller strip + homepage card

**Status:** ⬜ not started

> One primitive, two placements: `platform_announcements` (audience: seller|buyer, copy + optional CTA,
> starts/ends, active; one active per audience). Seller = slim dismissable strip atop the seller shell.
> Buyer = understated dismissable card *inside* the homepage flow («catálogo limpio» — no viewport bar,
> no motion, no layout shift). Dismissal is client-side per campaign (localStorage). Buyer placement is
> homepage-only in v1; the placement enum is designed to extend (catalog/PDP slots later).
> Gated by the same `content.overrides_enabled` kill-switch (OFF ⇒ no banners).

## Stories

### Story 3.1 — Announcement CRUD in admin
**As** the platform admin, **I want** to create/edit announcements in `/admin/contenido` — audience
(vendedores/compradores), text + optional CTA label/link, schedule (starts/ends), active toggle, with
one-active-per-audience enforced — **so that** I can run platform comms (feature launches, flash sales,
promoted stores) without a deploy.
**Acceptance:** create → appears listed with status (programado/activo/expirado); activating a second
campaign for the same audience prompts to replace the current one; schedule boundaries respected.
**Risk:** low

### Story 3.2 — Seller strip
**As a** seller, **I want** a slim, quiet, dismissable strip at the top of the seller shell
(`/shop/manage`) while a seller campaign is active, **so that** platform news reaches me in context
without nagging — dismissed stays dismissed for that campaign.
**Acceptance:** activate a seller campaign → strip renders atop /shop/manage (dark-bar styling, one
line, dismiss ×); dismiss → gone for that campaign across reloads (localStorage, per campaign id);
expire/deactivate → gone for everyone; CTA link works.
**Risk:** low

### Story 3.3 — Buyer homepage card
**As a** buyer, **I want** an understated, dismissable announcement card inside the homepage flow while
a buyer campaign is active — beautiful, non-intrusive, matching the «catálogo limpio» direction —
**so that** the platform can speak to me without cheapening the storefront.
**Acceptance:** activate a buyer campaign → the card renders in its slot on `/` within the ISR window;
no layout shift (slot reserved or below-fold placement per design); dismiss persists per campaign;
`next build` route table shows `/` still `○`; flag OFF ⇒ no card.
**Risk:** low

## Sprint QA
- **api spec(s):** announcement schedule/one-active resolver unit specs (pure lib); `api` spec on the
  admin CRUD route; `api` spec asserting the active campaign appears in the rendered homepage HTML.
- **browser smoke owed:** yes, to Daniel — dismiss-persistence on a real device (seller strip + buyer
  card) and the aesthetic sign-off on the buyer card.
- **deterministic gate:** `tsc --noEmit` + `npm run build` (route-table `/` = `○` asserted) + Playwright
  `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. In https://miyagisanchez.com/admin/contenido → Anuncios, create a seller campaign (text + CTA), active now.
   → It lists as «activo».
2. Open https://miyagisanchez.com/shop/manage as a seller.
   → The slim strip renders at the top with your text; click the CTA → it navigates; click × → gone, and stays gone after reload.
3. Create a buyer campaign; wait ~1 min; open https://miyagisanchez.com in a private window.
   → The understated card renders in its homepage slot; no layout shift; dismiss works and persists.
4. Set the buyer campaign's end date in the past.
   → Card disappears for a fresh visitor within ~1 min.
5. Flip `content.overrides_enabled` OFF.
   → Both placements render nothing; pages are otherwise unchanged. Flip back ON.

If any step fails, note the step number + what you saw — that's the bug report.
