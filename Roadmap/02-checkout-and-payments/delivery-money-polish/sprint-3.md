# Sprint 3 — CP-first reorder + quote recovery/timeout

> Epic: [Delivery & Manual-Money Polish](README.md) · **Risk: LOW–MED / MED** (S3.1 presentational
> reorder; S3.2/S3.3 touch the checkout quote path — Daniel reviews).
> **Status: 📋 PLANNED — not started.** Goal: the address form is visually CP-first (the lookup already
> exists), and a slow/failed Envía quote resolves to a selectable coordinated path instead of hanging or
> dead-ending. Frontend-only (`CheckoutExperience.tsx` + `lib/envia.ts`).

## Stories

### S3.1 — CP-first address order
**As** a buyer on mobile, **I want** the address form to start with my CP, **so that** estado / alcaldía /
colonia auto-fill before I type anything else.
- Reorder `CheckoutExperience.tsx` so the CP block (which already drives the `/api/checkout/postal-lookup`
  auto-fill) precedes name/phone in the visible form. No logic change — the lookup exists.
- **Acceptance:** on checkout, CP is the first visible address input; the existing auto-fill still
  populates estado/alcaldía/colonias.
- **QA:** anonymous browser smoke (CP field renders first; auto-fill still fires). **Risk: LOW–MED**
  (presentational — may auto-merge on green CI).

### S3.2 — Coordinated fallback on quote failure
**As** a buyer, **I want** a selectable coordinated option when shipping can't be quoted, **so that** a
quote failure isn't a dead end.
- Replace the inert "coordina con el vendedor" copy (04-#2) with a selectable "entrega acordada" fallback
  when Envía quoting returns nothing; reuse the existing arranged-delivery option.
- **Acceptance:** forcing a quote failure surfaces a selectable coordinated option that lets checkout proceed.
- **QA:** unit/api spec on the fallback branch; browser smoke. **Risk: MED** (checkout delivery path — Daniel reviews).

### S3.3 — Quote timeout
**As** a buyer, **I want** shipping quotes to resolve even if a carrier hangs, **so that** "Cotizando…"
never spins forever.
- Add an abort/UI timeout around `lib/envia.ts quoteShipments` (`allSettled`, `:180`) so a stalled
  carrier resolves to a timeout state (→ the S3.2 fallback) within a sane bound (~8–10s; confirm at build).
- **Acceptance:** a simulated stalled carrier resolves to the timeout/fallback within the bound, not an
  infinite spinner.
- **QA:** pure-logic/unit spec on the timeout wrapper. **Risk: MED** (Daniel reviews).

## Sprint QA — plan
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- **New specs:** anonymous browser smoke for CP-first order; a unit/api spec on the coordinated fallback;
  a pure-logic spec on the timeout wrapper (extract it to a `lib/` seam).
- **Deploy:** frontend-only; standard Vercel preview → prod.

## Sprint 3 — Smoke walkthrough (fill in real IDs at ship)
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.

1. Go to https://miyagisanchez.com/checkout with an item in cart on a phone-width screen.
   → The CP field is the FIRST address input; entering a valid CP auto-fills estado/alcaldía/colonias.
2. Enter a CP/address combination that fails to quote (or a known no-coverage CP).
   → Instead of "coordina con el vendedor" with no action, a selectable "Entrega acordada" option appears.
3. Select "Entrega acordada".
   → Checkout proceeds (no carrier rate required).
4. (timeout) With a carrier simulated as slow, watch the "Cotizando…" state.
   → It resolves to the timeout/fallback within ~10s, never spins indefinitely.

If any step fails, note the step number + what you saw.
```
*(No money/auth path — anonymous-testable; browser + unit specs can cover all four steps.)*
