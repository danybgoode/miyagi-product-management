# PDP redesign: "decide, then act" — Retrospective

_Closed: 2026-06-21_

**Area:** 01 · Discovery & Shopping · **Risk:** LOW–MED overall (S1/S2/S4/S5 LOW frontend; S3 planned MED–HIGH
backend but **re-scoped to frontend-only**; carved #6 HIGH **deferred**). **5 sprints · 18 stories · all merged,
shipped to prod 2026-06-13/06-14**, entirely behind the `pdp_redesign` kill-switch (default enabled).
**S1** PR #88 (`a12c7af`) · **S2** PR #89 (`cd7ade0`) · **S3** PR #90 (`8b91658`) · **S4** PR #91 (`6a52ad2`) ·
**S5** PR #93 (`8ba0e1f`). Carved **#6** (login wall) intentionally not built — gated behind `pdp_defer_auth`
(default off). Scope doc: `00-ideas/2. readyforscope/pdp-redesign-decide-then-act.md`.

## What shipped
The PDP used to ask the buyer to act (seller card + payment up top) **before** it let them identify the item or
trust the seller, with a fixed variable-height bar covering the description (the reported bug). The epic reorders
the page by buyer intent — **identify → trust → understand cost/delivery → act** — and adapts the same skeleton
per listing type. Almost all of it was **reorder/polish of components that already existed**.

- **S1 — base PDP.** Fixed the bar/padding overlap (a measured spacer = the bar's *real* height +
  `env(safe-area-inset-bottom)`; offer states **replace** the buy bar instead of stacking). Reordered the right
  column by intent (gallery → price → "Pago protegido" cue → trust capsule → specs slot → collapsible description
  → payment → seller). One dominant primary CTA (Comprar) with Hacer oferta secondary + Preguntar as a light link.
  All behind the new `pdp_redesign` flag (fail-open).
- **S2 — confidence, liveness & gallery.** A confidence capsule (verificado · pago protegido · devoluciones),
  liveness/FOMO ("X personas lo guardaron" over `marketplace_favorites`, a <48h "Nuevo" badge), and the gallery's
  missing back / share / "1 / N" counter. **Dynamic seller rating / response-time / ventas deferred — no live
  source** (validated, not invented).
- **S3 — attributes primitive + specs table.** A structured, per-category attribute set rendered as a Vinted-style
  scannable specs table above the description, plus seller capture. **Planned as a backend sprint, re-scoped to
  frontend-only** (metadata-driven per-category fields, no Cloud Run deploy) — the Medusa-first re-scope again.
- **S4 — per-type blocks A.** Services (schedule gallery + "qué incluye"), rentals (date picker + deposit + exact
  total, charged via seller coordination — the generic checkout would mischarge), digital (instant-delivery
  banner), subscriptions (comparable tiers + mensual/anual toggle with the annual saving).
- **S5 — per-type blocks B.** Autos (REPUVE verification anchor + vehicle specs + "Agendar prueba de manejo"),
  inmuebles (icon spec row + approximate-zone map + "Agendar visita"), events (event block + "Comprar boleto" +
  "Ver mi boleto" link), unclaimed (honest "aún no reclamada" notice + contact-only + claim nudge).

Each listing type's decision lives in a **pure, next-free `lib/` seam** (`pdp-bar`, `auto-hero`, `inmueble-hero`,
`service-hero`, `event-hero`, `rental-pricing`, `subscription-pricing`, `digital-delivery`) with a spec in the
`api` gate — free coverage, no money/auth path in the deterministic gate.

## What went well
- **Reorder + reuse, not rebuild.** The per-type blocks rode primitives that already existed — `metadata.repuve`,
  the Cal.com `booking_url`, `readEventDetails` + ticketing/QR, `SubscriptionSection`, the inline digital buy, the
  `isShopClaimed` unclaimed PDP, the autos/inmuebles structured fields. The genuinely-new build was narrow (a
  metadata specs primitive + a few signals), and even that shipped frontend-only.
- **Kill-switch on a layout-wide change.** `pdp_redesign` was created **enabled** at ship (Flagsmith both envs),
  so the entire new layout reverts to the old PDP instantly if it regresses — the right safety net for a change
  that touches every listing.
- **Pure `lib/` decision seams gave free, exact coverage** of the parts that matter (rental total =
  días × precio + depósito; annual saving = 12×mensual − anual; REPUVE display; bar one-state-at-a-time), so the
  money-shaped logic was spec-proven without a real money path in the gate.
- **Honest degradation over invented data** (see learning below) — three times the epic found "no live source"
  and shipped the static/linked version rather than faking a metric.

## What we learned
- **VALIDATE-FIRST: confirm a live data source exists before scoping a data-bound signal; if it doesn't, ship the
  static/degraded-but-honest version, defer the dynamic part, and write the gap into the PR — never invent the
  data.** This recurred three times here (S2.1 seller rating/response-time/ventas → static capsule only; S5.3
  events QR/aforo/tiers → display + "Ver mi boleto" link, aforo/tiers deferred; rentals → exact estimate +
  coordination, not an online charge the generic checkout can't honor). → promoted to `LEARNINGS.md`.
- **A planned backend sprint can collapse to frontend-only — check the metadata path first.** S3's per-category
  attributes were modeled on product metadata (the `metadata.repuve`/personalization precedent), so the "deploy
  backend first" sprint evaporated, matching the standing Medusa-first re-scope learning.
- **Model a new helper on an existing one, but sanity-check its predicate against *your* input** (the
  `ensureUrlProtocol` ← `canonicalSourceUrl` `startsWith('http')` false-positive) — already captured in
  `LEARNINGS.md` Build & QA from the follow-ups sprint.

## Gaps / follow-ups
- **Owed to Daniel (authed/money/booking smokes an anonymous run can't cover):** the S1 pending-offer bar state;
  the S2 native share sheet; the S4 signed-in completed states (cita/reserva/descarga/suscripción); the S5 events
  **ticket purchase + QR after payment**.
- **Deferred, by design:** dynamic seller rating / response-time / ventas (no live source); the carved **#6
  login-wall** removal (behind `pdp_defer_auth`, default off).
- **Routed into their own work:** the two LOW correctness gaps → **pdp-followups-cleanup** (shipped, PR #95);
  events aforo/quantity → **events-quantity-selector** epic (scaffolded); rental online line-item pricing →
  **rental-backend-line-item-pricing** seed.
- **Kill-switches:** `pdp_redesign` exists enabled (verified); `pdp_defer_auth` stays disabled until/unless #6 ships.
