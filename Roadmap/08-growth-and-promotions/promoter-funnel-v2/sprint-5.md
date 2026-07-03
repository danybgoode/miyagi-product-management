# Sprint 5 · Close-flow completeness — listings, locations, coverage, ad design, receipt, rate card

> Epic: [Promoter Funnel v2](README.md) · Risk: MED (no new money paths) · Status: ✅ built, PR [#168](https://github.com/danybgoode/miyagisanchezcommerce/pull/168) open (draft, MED risk)
> Surfaces: `/promotor/cerrar`, merchant panel, email, `/vende/promotor/sell-sheet`.

## Build notes
All six stories built in one session on `feat/promoter-funnel-v2-s5` (branched off `main` after
fast-forwarding past the Sprint 4 merge, `f81a41a`). Two decisions confirmed with Daniel at planning:
(1) a promoter-created listing on an unclaimed shop force-publishes (skips the delivery/payment
`listingActivationBlock` gate) since `isShopClaimed()` already blocks checkout regardless of publish
status; (2) the rate-card PDF (US-5.6) generates fresh via the existing layout/Puppeteer pipeline
rather than reading the untracked baseline artwork file (which also turned out to live in a separate,
un-deployed repo — `apps/zine` — unreachable from the render service).

Gate: `tsc --noEmit` clean, `next build` clean, `npm run test:e2e` (api project) green — CI confirms
green against the real preview (`Type-check + build` + `Playwright vs preview` both ✅ on PR #168).
Two pre-existing, unrelated flakes reconfirmed in isolation (not this diff): `not-found-shape.spec.ts`
(WAF 403-vs-404, prod-only) and `promoter-applications.spec.ts` (429 rate-limit, self-inflicted by
repeated local suite runs against live prod). New specs: `e2e/promoter-coverage.spec.ts`,
`e2e/promoter-close-receipt.spec.ts`, plus route-guard additions in `promoter-close.spec.ts`.

**Review:** cross-agent (Codex) advisory pass found 2 real bugs (fixed: an unescaped promoter-typed
shop name in the receipt email's HTML; silent photo-upload failures in `ListingStep`/`PrintAdStep`)
and 2 false positives (declined: custom-listing-route-vs-Medusa and missing-UCP-exposure, both match
established precedent — the shipped MCP `create_listing` tool and every other promoter `close/*`
route respectively). A fresh reviewer subagent independently re-derived and confirmed all four calls,
and found one additional non-blocking gap: 4 of the 6 merchant-receipt call sites have no Stripe-
webhook-retry dedup (a rare redelivery could double-send the receipt) — accepted as a known follow-up
rather than fixed now, since it extends a pre-existing, already-accepted retry-tolerance gap in the
same webhook (the Telegram alerts on the same code paths already double-fire on retry today).

**Owed to Daniel:** the full authed browser smoke below (money-adjacent steps flagged), and merging
this MED-risk PR.

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
Env: **PR #168 preview** (SSO-gated — sign in as yourself first):
`https://miyagisanchez-21t2op5hg-danybgoodes-projects.vercel.app` — re-derive the current preview URL
from the PR's Vercel check if this one has rotated (a new push regenerates it). Re-run against
**production** (`https://miyagisanchez.com`) once merged.

1. As an enrolled promoter open `/promotor/cerrar` → bind your PRM- code → fill in the shop name +
   a postal code, click "Buscar" → optionally enter a merchant email → "Crear tienda".
   → Estado/municipio/colonia auto-fill from the CP lookup (no more free-text location); the shop is
   created.
2. In step 2 ("Agregar un anuncio"), add a title, price, category, and 1–2 photos → "Publicar anuncio".
   → Confirmation shows; open `/s/<slug>` in a private window — the listing renders with
   photo/price/category, indistinguishable from a self-serve shop.
3. In step 3 ("Cobrar y pagar"), pick a SKU and close it (transfer or Stripe test card).
   **[money-adjacent — owed to Daniel]**
   → On completion, the merchant receipt email arrives at the captured merchant email (or your own
   promoter inbox if you left it blank) — items, amounts, claim link.
4. In step 4 ("Anuncio impreso"), pick an edition/tier. If the shop's location is outside that
   edition's `coverage_zones`, the honesty notice appears — informative only, the flow still proceeds.
   Toggle "Diseñar ahora", fill headline/photos, choose a payment method → "Cerrar anuncio impreso".
   **[money-adjacent — owed to Daniel]**
   → Ad submission is created (admin `/admin/print` shows it queued); the merchant receipt email
   arrives with edition/distribution-date + "diseño pendiente de revisión" note.
5. In step 5 ("Entregar por WhatsApp"), generate + open the claim link, sign in as the "merchant" in
   a private window. **[auth-adjacent — owed to Daniel, real Clerk session]**
   → The shop transfers to that account; `/account/print-ads` shows the ad from step 4, editable.
6. From `/vende/promotor/sell-sheet`, click "📄 Descargar tarifario (anuncios impresos)".
   → A PDF downloads showing one page per ad tier (full/half/quarter/card) with the active edition's
   live prices.

If any step fails, note the step number + what you saw — that's the bug report.
