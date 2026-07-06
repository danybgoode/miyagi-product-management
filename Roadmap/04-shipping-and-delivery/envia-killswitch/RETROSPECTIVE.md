# Retrospective — Envía platform kill-switch

**Macro-section:** 04 · Shipping & Delivery · **Risk:** HIGH (checkout/shipping money path) · **Closed:**
2026-06-26 · **1 sprint, 4 stories** — backend `medusa-bonsai-backend` #41 (`d2b7c1a`) · frontend
`miyagisanchezcommerce` #131 (`87baff9`).

> *Close-out note:* written **2026-07-06** at the grooming-audit close-out — the epic merged without its
> DoD close (no retro, no frontmatter `status:` block at all, which made it invisible to the board's SSOT
> mechanism until the audit).

## What shipped
One platform-level flag, `shipping.envia_enabled` (**enablement polarity, default OFF** — a flag-store outage
keeps Envía off and falls back to arranged delivery, rather than steering buyers into an unfunded carrier):

- **S1.1 (BE):** the quote seam — `POST /store/envia/rates` short-circuits *before* any Envía call when the
  flag is off, returning the existing graceful "coordina la entrega directamente con el vendedor" response.
  Decision extracted into a pure `enviaKillGate` seam for unit coverage.
- **S1.2 (BE):** the label seam — the ship route's Envía-label branch 422s (es-MX) when off; sellers are
  steered to the existing manual-carrier path, which is untouched.
- **S1.3 (FE):** the seller-settings banner — `Envios.tsx` server-evaluates the flag; when off, it explains
  the platform-wide pause and that the per-shop live-rates toggle is superseded (the per-seller setting is
  preserved, not overwritten).
- **S1.4 (FE, added mid-build):** the legacy seam — tracing every importer of the Envía client found that the
  seller order screen's `app/api/orders/[id]/ship` route calls `lib/envia.ts` **directly** for legacy Supabase
  orders, bypassing the backend gate entirely. Gated too, after confirming scope with Daniel.

Because the enforcement sits on the backend routes, UCP/MCP checkout and agent ship calls inherit the kill
automatically — the FE banner is cosmetic. Flag created **OFF** in Production (the Envía account was
unfunded); flipping it ON when funded is a dashboard action, no deploy.

## What went well
- **The LEARNINGS importer-trace rule paid for itself in-flight.** Applying "trace every importer before
  gating" (the delivery-money-polish lesson) *before* writing code surfaced S1.4 — a second, ungated seam the
  scope doc didn't know about. Without the trace, the kill-switch would have shipped half-open: platform "off"
  while legacy orders still quoted and labeled through Envía.
- **Polarity was decided at grooming, not discovered in code review.** The spike taxonomy had this flag as a
  kill-switch (default ON); grooming consciously inverted it to enablement (default OFF) for the
  unfunded-account lifecycle, mirroring `domain.paywall_enabled`. The decision and its why are in the scope
  doc — nothing had to be relitigated mid-build.
- **A one-sprint epic stayed one sprint.** Light-enhancement classification held: one `FlagKey` + gates on
  existing seams, zero new tables, zero new commerce concepts.

## What we learned
- **Reconfirmed (sharpened in LEARNINGS, not duplicated):** the importer-trace rule — the second seam this
  epic found is now cited on the existing "fix the call the user awaits" LEARNINGS entry as its
  reconfirmation.
- **A same-day scope addition (S1.4) is fine when it comes from the trace, is confirmed with Daniel, and
  lands inside the same gate** — the alternative (ship, then discover the bypass live) is strictly worse.
- **Flag-layer migration note:** the flag was created in Flagsmith (feature 219454); the in-house
  `platform_flags` epic (2026-07-01) replaced that layer platform-wide. The polarity/fail-open semantics
  carried over — enablement flags stay OFF-by-default on store outage.

## Gaps / owed
- **Daniel's live money/ship smoke** (steps in `sprint-1.md`): flag-OFF checkout shows the arranged fallback
  with zero Envía calls; flag-ON restores live rates; the legacy ship route obeys the gate.
- The flag's **current production value** post-Flagsmith-migration should be confirmed in `platform_flags`
  when the account-funding decision lands (OFF was correct at ship time).
