# Sprint 5 · Close-flow completeness — listings, locations, coverage, ad design, receipt, rate card

> Epic: [Promoter Funnel v2](README.md) · Risk: MED (no new money paths) · Status: 📋 planned
> Surfaces: `/promotor/cerrar`, merchant panel, email, `/vende/promotor/sell-sheet`.

## US-5.1 — Photos + real listings in the close workspace *(MED)*
**As** a promoter standing up a shop, **I want** to add photos and at least one real listing (title,
price, category, photo) during setup, **so that** the merchant's shop looks real before I leave.
**Build note:** reuse the listing create/edit APIs + R2 upload the seller portal and MCP tools
already use; extend `PromoterCloseClient`. Unclaimed-shop rules stay (contact-only PDP).
**Acceptance:** a promoter-created shop shows a populated listing with photo at `/s/<slug>` and in
marketplace search — indistinguishable from self-serve.

## US-5.2 — Predefined location lists *(LOW)*
**As** a promoter, **I want** estado/municipio selects (the marketplace's canonical lists) instead
of the free-text "Ubicación (opcional)", **so that** the shop's location is real data.
**Build note:** `lib/mx-locations.ts` (ESTADOS + codes); municipio via the CP-first/envia patterns
already in checkout. Free text goes away.
**Acceptance:** location saved as structured estado/municipio; existing shops unaffected.

## US-5.3 — Zine coverage honesty *(LOW)*
**As** a promoter selling a printed ad, **I want** the close flow to compare the shop's location
against the active edition's `coverage_zones` and tell me — before the sale — when the zine doesn't
circulate there ("sirve como branding; cubrimos puntos estratégicos"), **so that** merchants are
never surprised.
**Build note:** editions already carry `coverage_zones: string[]`; v1 matches at the granularity
those strings + estado/municipio allow (pure matcher in `lib/`); fuzzy/unknown ⇒ show the notice.
Notice is informative, never blocking (branding sales are legitimate).
**Acceptance:** in-coverage shop → no notice; out-of-coverage → explicit es-MX notice in the close
flow before the print SKU is added; `api` spec on the matcher.

## US-5.4 — Ad design in the close flow *(MED)*
**As** a promoter, **I want** to design the merchant's ad right there (reuse the self-serve ad
builder) or hand it off ("el comerciante lo diseña después"), **so that** the printed ad's value is
delivered, not promised — and **as** the merchant, **I want** to review/edit my ad later from my own
panel.
**Build note:** wire the existing ad builder + editorial queue into the close flow (promoter-driven,
attributed to the merchant's shop); the merchant's panel surfaces their ad(s) + status post-claim.
**Acceptance:** a close can produce a designed, queued ad; after claiming, the merchant sees + can
edit it from their panel (re-entering review per existing rules).

## US-5.5 — Merchant receipt after a promoter close *(LOW)*
**As** a merchant, **I want** OUR branded receipt email after the close (beyond Stripe's): what I
bought, what I paid, what happens next — especially the printed ad (edition dates, design status,
coverage note) — plus the claim-link recap, **so that** I have something in writing from the
platform itself.
**Build note:** `lib/email.ts` branded patterns; send on close completion for every payment path
(Stripe, promoter-card, transfer-approved — the S4 approval triggers it for transfers). es-MX.
**Acceptance:** every close path produces exactly one receipt email listing items, amounts, next
steps, claim link; spec on the pure receipt-content builder.

## US-5.6 — Downloadable zine ad-rate template *(LOW/MED)*
**As** a promoter, **I want** a print-ready PDF of the zine with ad-slot placeholders and live tier
pricing (rate card), **so that** I can show merchants exactly what they're buying and where.
**Build note:** baseline `references/el-barrio-issue-03-oficio-color-sinbordes-print.pdf` (+
`references/zine/data/editions/el-barrio-issue-03.json`); generate via the existing layout/export
infra (`lib/print-export.ts`, `lib/print-layout*.ts`) with placeholder ad slots per tier
(full/half/quarter/card) + prices from config. Linked from the Manual del promotor (S1.5).
**Acceptance:** the handbook links a downloadable PDF showing each ad size in place with its price;
regenerating after a price change updates the PDF (or renders prices at request time).

## Sprint QA
- Deterministic gate green; specs: coverage matcher, receipt builder, listing-create route reuse.
- **Owed to Daniel:** authed browser smoke of a full in-store close (photos → listing → coverage
  notice → ad design → receipt) on a real device.

## Sprint 5 — Smoke walkthrough (do these in order)
*(placeholder — fill with real URLs at build time)*
Env: production · https://miyagisanchez.com

1. As an enrolled promoter open https://miyagisanchez.com/promotor/cerrar → create a test shop.
   → Estado/municipio are selects (no free text); add a listing with a photo.
2. Open https://miyagisanchez.com/s/<slug> in a private window.
   → The listing renders with photo/price/category like any self-serve shop.
3. Set the shop's location outside the active edition's coverage → add a printed ad.
   → The coverage notice appears before the sale; proceeding still works.
4. Design the ad in the close flow → complete the close.
   → Ad lands in the editorial queue; the merchant receipt email arrives (items, amounts, edition
   dates, claim link).
5. Claim the shop via the WhatsApp link → open the merchant panel.
   → The ad is visible + editable there.
6. From the Manual del promotor, download the rate-card PDF.
   → Ad slots + current prices render print-ready.

If any step fails, note the step number + what you saw — that's the bug report.
