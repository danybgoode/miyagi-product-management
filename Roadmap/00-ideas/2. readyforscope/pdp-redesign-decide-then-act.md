# PDP redesign — "decide, then act" (intención del comprador)

**Status: awaiting Daniel approval — no code yet.**
Source: `handoff/PDP-Audit.dc.html` (UX/UI audit + per-type redesign, mobile-first). Reorders and polishes
the live PDP (`app/l/[id]/page.tsx`) so the buyer answers *"is this the right item?"* and *"can I trust the
seller?"* **before** being asked to buy — and adapts the same skeleton per listing type.

## Stage-2.5 bucket — mostly **light enhancement**, not net-new
The audit's own line holds up against the code: *"es reordenar y pulir, no reconstruir."* The PDP already
has the gallery, trust components, offer-state bar, per-type primitives, and structured autos/inmuebles
fields. The genuinely-new work is narrow (a structured-attributes primitive + a few signals); the rest is
re-ordering existing blocks by buyer intent and fixing one real layout bug. **One genuinely-new backend
slice** (the attributes primitive, Sprint 3) and **one carved-out HIGH-risk story** (#6, the login wall).

## JTBD & emotional arc the redesign serves
Identify (*is it the right item?*) → trust (*am I being scammed?*) → understand cost/delivery → act.
The PDP must resolve the doubt **before** it asks for the purchase. Current order asks for the purchase first.

## Audit findings (7) — anchored to heuristics
| # | Finding | Heuristic / JTBD | Severity | Effort | Status in code |
|---|---|---|---|---|---|
| 4 | Description buried + fixed bar covers it (the reported bug) | Visibility of state · "is it right?" | High | Low | **Confirmed bug** (see below) |
| 3 | Order inverts buyer intent (seller + payment above specs/description) | IA ↔ intent · hierarchy | High | Med | Partly addressed (SellerTrustCard lift), reorder still real |
| 2 | "Protected purchase" trust cue far from the price | Trust at decision · emotion | Med | Low | `<TrustSignals>` exists, reposition |
| 6 | "Inicia sesión para comprar" = a wall before value | Reduce friction · defer auth | Med | Low | **Carved out — HIGH risk (auth/checkout)** |
| 5 | Three equal-weight buttons, no clear primary | Minimalism · hierarchy | Med | Low | Real |
| 7 | Missing reputation, liveness & a scannable specs table | Social proof · FOMO · recognition | Med | Med | Specs = new primitive (Daniel's call); rating/liveness partial |
| 1 | Gallery has no back / share / counter | Control & freedom · P2P growth | Low | Low | Gallery shipped; **back/share/"1/6" remainder is new** |

### The confirmed bug (#4) — root cause
`app/l/[id]/page.tsx:288` hard-codes `pb-[120px]` on the page wrapper, while the mobile sticky bar at
`:686` is `position: fixed` with **variable** height (offer banners + 3 full-width buttons). When the bar is
taller than 120px it overlaps the description/tags. Fix = a spacer that matches the bar's **real** height +
`env(safe-area-inset-bottom)`, and stop *stacking* offer banners on top of the buy bar (the offer states
should **replace** the buy bar, not pile onto it).

## What already exists (reuse, don't rebuild) — verified against code 2026-06-13
| Capability | Where | Reuse for |
|---|---|---|
| Interactive gallery (swipe/dots/thumbnails/arrows/lightbox) | PDP, shipped PR #70 | Finding #1 — add only back/share/counter |
| `<TrustSignals>` (channel-aware) + slim trust capsule | extracted Epic C; poster §05 | Findings #2, #7 trust capsule |
| `SellerTrustCard` (already lifted above payment on mobile) | Discovery Polish #3c | Finding #3 reorder, #7 rating/ventas |
| Type-appropriate decision frame | Discovery Polish #3c | Per-type blocks (Sprints 4–5) |
| Offer states in the bar: `activeDeal` pending/countered/accepted_unpaid + countdown | PDP `:206–290`; poster §05 | Section 03 — hierarchy/anti-stack only |
| REPUVE badge | `listing.metadata.repuve`, PDP `:468` | Autos block (Sprint 5) |
| Cal.com `booking_url` | `shopSettings.calcom`, PDP `:76–100` | Services/autos/inmuebles scheduling |
| `readEventDetails` + ticketing/QR backend | per poster §10 | Events block (Sprint 5) |
| Unclaimed contact-only PDP (`isShopClaimed`) + claim nudge | shipped, poster §03 | "Sin reclamar" block (Sprint 5) |
| `SubscriptionSection`, digital inline buy | PDP files | Subscriptions/digital blocks (Sprint 4) |
| Structured filter fields: autos (brand/year/km/transmission/fuel), inmuebles (rooms/surface/property_type) | `lib/types.ts`, `lib/listings.ts:23` | Specs table seed for those categories |
| `lib/listing-query.ts` taxonomy seam, `lib/listings.ts` Store API reads | Discovery Polish | Helpers extend here (pure-logic specs = free coverage) |

## Medusa-first reframe (AGENTS rule #1)
- **Specs/attributes primitive → metadata-first.** Medusa v2 has **no native typed custom-attributes**; the
  two clean paths are product `metadata` (key-value — same pattern as the live `metadata.repuve`) or a custom
  module + module link + `additional_data` (typed/queryable). **Recommend metadata-driven per-category schema**
  (matches the repuve precedent and the LEARNINGS rule "personalized products → zero new tables"); escalate to a
  custom module only if we need to query/filter on the new attributes. Either way it lives in `apps/backend`
  (Medusa), read by the frontend via the Store API — never Supabase. *(Refs: Medusa v2 product/metadata docs +
  "personalized products" recipe — see citations.)*
- Trust, offers, fulfillment, payment all stay Medusa/existing-component reads. No new Supabase tables expected
  except where a non-commerce signal needs one (e.g. "X personas lo guardaron" reuses `marketplace_favorites`).
- **Reorder mobile↔desktop with the duplicate-render idiom** (`md:hidden` / `hidden md:block`), per LEARNINGS —
  not flex-order — same idiom the gallery + SellerTrustCard lift already use.
- Bilingual: PDP is **es-MX** (not on the bilingual allow-list); all new copy es-MX only, no `en` keys.
- Agent surface (rule #3): new structured attributes must surface in `GET /api/ucp/catalog` / the listing
  payload so agents see specs too — add to the UCP read when the primitive lands (Sprint 3).

## In scope (v1) — full base + per-type system
The base physical-product redesign (§02/§03) **and** the per-type system (§05): services · rentals · digital ·
subscriptions · autos · inmuebles · events/boletos · unclaimed. Daniel's call (2026-06-13).

## Out of scope (v1)
- **Finding #6 (remove login wall / defer auth to checkout)** — carved out as its own HIGH-risk, flag-gated
  story; Daniel decides whether/when to ship it (below).
- Desktop 2-column rework beyond what reorder needs, and PWA edge states (installed / offline / share-target) —
  audit's own "pendientes opcionales." Backlog.
- Recommendations / "más de esta tienda" algorithm changes — the existing bundle block is reused as-is.

## Slicing — skateboard → car (5 sprints + 1 carved story)
Branch `feat/pdp-redesign` per repo touched (backend first in Sprint 3). One Playwright api spec per testable
story; pure index/format logic on a `lib/` seam (free coverage). Money/auth/checkout smokes owed to Daniel.

### Sprint 1 — Base PDP: fix the bug, reorder by intent, one primary action  · **risk: LOW**
The skateboard — ships the reported bug fix and the §02/§03 reorder for the standard product, both auth states.
- **S1.1 — Bar/padding overlap fix (#4).** Spacer = real bar height + safe-area; offer-state banners **replace**
  the buy bar instead of stacking. *Acceptance:* on a listing with a pending offer, the bar never covers the
  description/tags on mobile; nothing is clipped behind it. *QA:* browser smoke (anonymous + pending-offer state).
- **S1.2 — Right-column reorder by intent (#3).** Order → gallery → title + price + protection cue → trust
  capsule → specs → description ("Ver más" collapsible) → payment/delivery → seller → bundle → tags. Duplicate-
  render idiom for mobile/desktop. *Acceptance:* description + specs appear above payment/seller on mobile.
  *QA:* browser smoke asserts render order; pure-logic spec if any ordering helper is extracted.
- **S1.3 — Two-action bar, one primary (#5).** "Comprar" primary, "Hacer oferta" secondary, "Preguntar" a light
  link; anchored price summary + safe-area. *Acceptance:* one visually-dominant primary CTA; bar height drops.
  *QA:* browser smoke.
- **S1.4 — Trust cue beside the price (#2).** "Compra protegida" + shipping/pickup hint directly under price
  (reuse `<TrustSignals>`). *Acceptance:* protection cue is adjacent to price, not buried in the methods grid.
  *QA:* browser smoke.

### Sprint 2 — Confidence, liveness & gallery growth (#7 signals, #1 remainder) · **risk: LOW**
- **S2.1 — Confidence capsule + seller rating.** verificado · responde en ~1 h · devoluciones; seller rating +
  ventas count on `SellerTrustCard`. *Acceptance:* capsule renders with real seller data; degrades when absent.
  *QA:* api/browser smoke. *Open:* confirm rating/response-time data source (below).
- **S2.2 — Liveness / FOMO.** "X personas lo guardaron" (from `marketplace_favorites`), <48h "Nuevo" badge
  gating. *Acceptance:* save-count shows when ≥ threshold, hidden otherwise. *QA:* pure-logic spec on the gate.
- **S2.3 — Gallery back + share + counter (#1).** Glass back button (top-left), share (native `navigator.share`)
  + favorite (top-right), "1/6" counter. *Acceptance:* counter tracks the active image; share opens the sheet.
  *QA:* anonymous browser smoke.

### Sprint 3 — Structured attributes primitive + scannable specs table (#7) · **risk: MED–HIGH (backend)**
Daniel's "add attributes primitive" call. Backend deploys first (Cloud Run, ~12 min, no preview).
- **S3.1 (BE, Medusa) — Per-category attribute schema (metadata-first).** Define the schema + expose on the
  Store API listing read; surface in the UCP catalog payload (rule #3). *Acceptance:* a product's structured
  attributes round-trip through the Store API + UCP. *Risk:* MED–HIGH (backend; migration only if a module is
  chosen over metadata — decide in plan mode). *QA:* api spec on the route; prod smoke post-merge (no preview).
- **S3.2 (FE) — Seller capture.** Listing create/edit captures the structured attributes per category.
  *Acceptance:* a seller can set talla/material/etc. and they persist. *QA:* api/browser smoke (seller session
  owed to Daniel).
- **S3.3 (FE) — Specs table on the PDP.** Scannable table from the new attributes (Vinted-style), just above the
  description. *Acceptance:* specs render for a listing that has them; absent gracefully. *QA:* browser smoke.

### Sprint 4 — Per-type blocks A: services · rentals · digital · subscriptions · **risk: LOW–MED**
Mostly reorder/polish on existing primitives; one block per type changes (the decision block + primary action).
- **S4.1 — Services:** schedule gallery ("próximas fechas" tappable, via existing Cal.com `booking_url`) replaces
  the methods grid as the hero block; "Qué incluye" + modalidad replace specs; single primary "Agendar cita."
- **S4.2 — Rentals:** check-in/out date selector + live availability + total = días × precio + **deposit** beside
  the price and in the bar total; primary "Reservar estas fechas."
- **S4.3 — Digital:** instant-delivery banner (file name + size) at top; specs reinterpreted (formato ·
  compatibilidad · incluye · licencia); single-action bar, no offer.
- **S4.4 — Subscriptions:** comparable tiers + "Más popular" highlight + mensual/anual toggle with annual saving;
  bar reflects the chosen plan; reuse `SubscriptionSection`.
- *Each:* signed-in completed state (cita elegida / fechas / comprado / suscrito). *QA:* browser smoke per type;
  any pricing math (rental total, annual saving) on a pure-logic `lib/` seam with a spec.

### Sprint 5 — Per-type blocks B: autos · inmuebles · events · unclaimed · **risk: LOW–MED**
- **S5.1 — Autos:** REPUVE verification anchored under the price (reuse `metadata.repuve`); vehicle specs (año ·
  km · transmisión · combustible) replace talla/condición; primary "Agendar prueba," WhatsApp direct secondary.
- **S5.2 — Inmuebles:** property specs as icons (rec · baños · m² · estac.); approximate-zone map (no exact
  address pre-visit); primary "Agendar visita," contact secondary.
- **S5.3 — Events/boletos:** event block leads (fecha · hora · lugar · dirección from `readEventDetails`); aforo
  scarcity + ticket tiers + quantity selector in the bar; signed-in → scannable QR ticket (reuse ticketing
  backend). *Money path — owed to Daniel.*
- **S5.4 — Unclaimed:** honest "aún no reclamada" notice (Buy/Offer/Cart already suppressed via `isShopClaimed`);
  contact-only (WhatsApp · llamar · email); source-of-listing line + "Reclama gratis" nudge; document the
  "claim awakens the PDP" upgrade (same skeleton as §02 once claimed — already wired by the gem-claim loop).
- *QA:* browser smoke per type; events checkout/QR smoke owed to Daniel.

### Carved story — **#6: "Comprar" for everyone (defer auth to checkout)** · **risk: HIGH (auth/checkout)** · *Daniel decides*
Signed-out primary stays "Comprar ahora"; login deferred to checkout (`signInHopHref` already exists). Touches
auth/checkout → **HIGH**, **flag-gated kill-switch** (`pdp_defer_auth`, default `false`, created disabled), **Daniel
merges**. Not in the sprint flow — pulled in only on Daniel's go-ahead. *Acceptance:* an anonymous user can begin
checkout from the PDP and is asked to sign in at the checkout step, not before. *QA:* auth/checkout smoke = Daniel.

## Risk tiers & kill-switch (WAYS-OF-WORKING §6 / groom Stage 6b)
- Sprints 1, 2, 4, 5 → **LOW** (frontend reorder/polish, no money/auth/DB) → reviewer may auto-merge on green CI.
- Sprint 3 → **MED–HIGH** (backend attributes; migration iff custom module) → Daniel merges the backend PR.
- Carved #6 → **HIGH** (auth/checkout) → Daniel merges; behind `pdp_defer_auth` kill-switch.
- **Recommended epic-level flag `pdp_redesign`** (kill-switch, default `true` once shipped) so the whole new
  layout can be reverted instantly if the live PDP regresses — decided here, verified at epic DoD.

## Open questions (validate before/at the relevant sprint — don't assume)
1. **Seller rating + "responde en ~1 h" data (S2.1):** is there a live seller rating + response-time signal, or
   does this need a (non-commerce) source? If absent, S2.1 ships the static trust items and defers the dynamic
   ones rather than inventing data.
2. **Attributes primitive shape (S3.1):** metadata-driven schema (recommended) vs custom Medusa module — confirm
   in plan mode against the live product model; the choice sets the risk tier (metadata = MED, module = HIGH/migration).
3. **Events QR / ticketing depth (S5.3):** confirm the QR redemption backend is reachable from the PDP read, or
   scope S5.3 to display-only + link to the existing ticket surface.

## Research citations
- Medusa v2 has no native typed custom-attributes; metadata or a custom module + link + `additional_data` are the
  paths (verified 2026-06-13): Medusa docs — Product Module / metadata, and the "Personalized Products" recipe;
  community discussion #5303 ("custom attributes plugin stopped working with v2").
- Inspiration patterns (Vinted/Gumtree/Etsy) in the audit are **reference, not signed-off scope** (per guardrail).
