# Sprint 1 — Paid admission, made real

> Epic: [Events & Ticketing](README.md) · **Risk: S1.1 LOW · S1.2 HIGH (Daniel merges).**
> **Status: ✅ SHIPPED to prod 2026-06-08 — [PR #48](https://github.com/danybgoode/miyagisanchezcommerce/pull/48)
> merged (`f0df5ba`, Daniel-authorized; CI green: type-check/build, Vercel, Playwright-vs-preview).**
> Goal met: an event sold as a `service`/`digital` listing shows
> *when & where* it is and caps seats, and a buyer can re-fetch their ticket later. This is the cheap,
> independent slice — it ships without S2/S3. No new `listing_type`, no new commerce table.

**Status:** ✅ SHIPPED 2026-06-08 — PR #48 (`f0df5ba`, Daniel-authorized). S1.1 + S1.2 both merged.

## Stories

### S1.1 — Event date/time/venue/aforo on a listing
**Built:** `794ed68` (`feat(events): add listing event attributes`)

**As** a seller, **I want** to set an event's date, time, venue and seat cap on the listing, **so that**
buyers see when & where it is and the listing stops selling once it's full.
- Add an **event attr block** to `app/sell/AttrsSection.tsx` (same shape as the autos/inmuebles blocks):
  `event_date`, `event_time`, `venue_name`, `venue_address`. Wire through `app/sell/SellWizard.tsx`.
  Optionally surface an **"Eventos" category** that defaults the attr block on (reusing `service`/`digital`
  as the `listing_type`). Aforo = native `manage_inventory` (no new field).
- Surface the attrs in `lib/listings.ts` (normalize from product metadata), render on the PDP
  (`app/l/[id]/page.tsx`), and add them to `lib/ucp/schema.ts` `toUcpListing` so agents see them.
- **Acceptance:** a listing with event attrs shows date + venue on its PDP; when stock hits 0 the listing
  reads sold-out / out-of-stock; `GET` of the UCP listing includes the event fields. All es-MX.
- **QA:** api spec `e2e/event-listing.spec.ts` asserting the normalizer surfaces the event attrs +
  `toUcpListing` carries them, including schema.org `Event` data. Manual preview smoke covers the PDP date/venue
  render. **Risk: LOW** (metadata-only, no money path).

### S1.2 — Buyer can re-download their ticket/confirmation
**Built:** `a73f5cb` (`feat(events): allow buyers to re-download digital tickets`)

**Hardened after review:** `acd6719` (`fix(events): harden ticket download entitlement`)

**As** a buyer, **I want** to re-fetch my ticket/confirmation after purchase, **so that** I don't lose it.
- Build the buyer gate already TODO'd in `app/api/sell/listing/[id]/download/route.ts:37-49` (today
  owner-only, 402 to non-owners): allow a **verified buyer who owns a paid order** for this listing
  (check against `marketplace_orders`), returning the signed download URL; deny everyone else.
- **Acceptance:** the buyer of a paid digital ticket gets a fresh signed URL on demand; a stranger gets
  402/403; the shop owner still works. Signed-URL expiry unchanged.
- **QA:** api spec `e2e/digital-download-access.spec.ts` — owner 200, Clerk-user buyer 200, verified-email
  buyer with Medusa mirror evidence 200, stranger 402, unpaid/pending buyer denied, legacy email-only row
  denied, mismatched/unverified email denied. **Risk: HIGH** (delivery/auth gate on a paid artifact →
  **Daniel merges**). The authed buyer-session check is owed to Daniel.

## Sprint QA — actual
- **Smoke stage name:** `Sprint 1 Preview Smoke — Paid Admission Basics`.
- **Deterministic gate:** `tsc --noEmit` · `next build` · focused Playwright api specs:
  `e2e/event-listing.spec.ts` and `e2e/digital-download-access.spec.ts`.
- **New specs:** normalizer/`toUcpListing` event-attr spec (S1.1); download-gate authz spec (S1.2).
- **PR gate:** [PR #48](https://github.com/danybgoode/miyagisanchezcommerce/pull/48) green after reviewer
  hardening: Type-check + build, Vercel, Playwright vs preview.
- **Deploy order:** S1.1 is frontend + (if an event category needs a backend touch) backend — merge
  together / backend-first; degrade gracefully (missing attrs render nothing). S1.2 is frontend/API.
- **Owed to Daniel:** the authed buyer-session re-download smoke (S1.2 is a money artifact).

## SPRINT SMOKE WALKTHROUGH
```
Stage: Sprint 1 Preview Smoke — Paid Admission Basics
Env: production https://miyagisanchez.com
Risk owner: Daniel for the S1.2 money/auth path.

1. Seller creates or edits a `service` or `digital` listing.
   Set event_date, event_time, venue_name, venue_address, and set inventory/aforo to a small number (e.g. 2).
   Expected: the listing saves; aforo is enforced through native Medusa inventory/manage_inventory.
2. Open the public listing page:
   https://miyagisanchez.com/l/<listing-or-medusa-product-id>
   Expected: the PDP shows the event date/time and venue details in es-MX copy.
3. Check the listing through UCP:
   GET https://miyagisanchez.com/api/ucp/catalog/<listing-or-medusa-product-id>
   Expected: the listing payload includes `event` details and schema.org uses `@type: "Event"`.
4. Daniel money/auth smoke: buy the digital ticket as a real buyer account.
   Expected: the purchase succeeds and creates a paid `marketplace_orders` row for the listing.
5. Daniel money/auth smoke: as that buyer, re-open the ticket/download endpoint later.
   Expected: the buyer receives a fresh signed download URL; expiry remains 1 hour.
6. Daniel money/auth smoke: as the seller/shop owner, open the same download endpoint.
   Expected: owner preview/download still returns a fresh signed URL.
7. Daniel money/auth smoke: as a signed-out user or unrelated account, hit the same endpoint.
   Expected: response is refused with the payment gate (`402 PAYMENT_REQUIRED` / `Comprar para descargar`).
8. Inventory smoke: repeat purchase until the aforo is exhausted.
   Expected: the public listing reads sold-out/out-of-stock and no extra purchase is possible.

Steps 4–8 are the HIGH-risk paid-artifact path — Daniel merges and owns final buyer-session verification.
If any step fails, note the step number + what you saw.
```
