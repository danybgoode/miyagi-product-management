# Sprint 1 — Listing-type taxonomy (filterable)

> Epic: [Discovery Polish](README.md) · **Risk: LOW–MED** (read-only discovery). S1.1 touches the
> backend `/store/listings` query (announce; no shared layout).
> **Status: 📋 PLANNED — not started.** Goal: a buyer can filter listings by type, and cards show
> which type each listing is. The data is already normalized (`lib/listings.ts:119`); this sprint adds
> the filter plumbing + UI.

## Stories

### S1.1 — Forward `listing_type` through search
**As** a buyer, **I want** the search to accept a `listing_type` filter, **so that** I can narrow to
products, services, rentals, digital goods, or subscriptions.
- Add `listing_type` to the `buildQuery` allow-list (`lib/listings.ts:21-26`) so it's forwarded as a
  query param; make the backend `/store/listings` handler accept + filter on it (Medusa product type /
  metadata — no new table).
- **Acceptance:** `GET /store/listings?listing_type=service` returns only service listings; the same
  param round-trips from a URL (`/l?listing_type=service`).
- **QA:** pure-logic spec on the param builder (asserts `listing_type` is forwarded); one api spec
  asserting the filter round-trips server-side. **Risk: LOW–MED** (backend query change — announce).

### S1.2 — Type selector in the search UI
**As** a buyer, **I want** a visible type filter, **so that** I can pick "servicios" without editing
the URL.
- Add a chip/segment selector to `app/l/SearchBar.tsx`, mirroring `CategoryChips`; wire it to the
  `listing_type` param; bilingual es-MX labels (Productos / Servicios / Rentas / Digitales / Suscripciones).
- **Acceptance:** selecting a type filters the results and reflects in the URL; clearing it restores all.
- **QA:** anonymous browser smoke (selecting a chip filters the grid — works without auth). **Risk: LOW–MED.**

### S1.3 — Cards show listing type
**As** a buyer, **I want** each listing card to show its type, **so that** a service doesn't look like
a product at a glance.
- Render a small type badge/label on the listing card using the already-normalized `listing.listing_type`.
- **Acceptance:** a service listing card visibly reads "Servicio" (etc.); products show no noisy badge
  if that's the default.
- **QA:** anonymous browser smoke (a known service listing card shows its type). **Risk: LOW.**

## Sprint QA — plan
- **Deterministic gate (green before merge):** `tsc --noEmit` (both repos) · `next build` · Playwright `api`.
- **New specs:** a pure-logic spec on `buildQuery` (listing_type forwarded); an api spec on the
  `/store/listings?listing_type=` filter; an anonymous `*.browser.spec.ts` for the chip + card affordance.
- **Deploy order:** backend (accept the filter) first or together; frontend degrades gracefully (unknown
  param ignored server-side).

## Sprint 1 — Smoke walkthrough (fill in with real URLs at ship)
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.

1. Go to https://miyagisanchez.com/l
   → The filter bar shows a type selector (Productos / Servicios / Rentas / Digitales / Suscripciones).
2. Tap "Servicios".
   → The grid shows only service listings; the URL includes listing_type=service.
3. Look at any result card.
   → It shows a "Servicio" label.
4. Clear the type filter.
   → All listing types return.

If any step fails, note the step number + what you saw.
```
*(No money/auth path in this sprint — all steps are anonymous-testable; a browser spec can cover them.)*
