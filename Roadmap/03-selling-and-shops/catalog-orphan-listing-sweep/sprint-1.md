# Catalog orphan-listing sweep — Sprint 1: report, unpublish, make it unrepeatable

**Status:** ✅ complete — validation folded the runtime fix into backend PR [#104](https://github.com/danybgoode/medusa-bonsai-backend/pull/104) (`f813206`); frontend invariant PR [#286](https://github.com/danybgoode/miyagisanchezcommerce/pull/286) (`b1a8311`)

> **Close correction (2026-07-19):** Story 1.1 disproved the premise. Product
> `prod_01KXGXMQ3X6WPMGDG2BMP64H7K` had an active seller link to live shop `andrea-shops`, zero
> orders, and eight soft-deleted sibling products. The apparent orphan was the null-slot
> attribution failure tracked by `seller-catalog-null-slot-sweep`. Story 1.2 was therefore
> cancelled as an unsafe data mutation: **zero products unpublished, zero production writes**.

> **Corrected root cause (proven 2026-07-19, don't re-derive):** `lib/ucp/schema.ts:367-384`
> deliberately emits `slug: ''` when its input has no resolved shop. The input was incomplete, not
> the relationship: `store/listings` caught the seller→products sparse-slot exception and discarded
> that seller's entire attribution map. Backend PR #104 fixed the shared read class. The existing
> atomic product-create/link seam remains useful prevention for true missing links, but it was not
> the cause of this incident.

## Stories

### Story 1.1 — Validate the apparent orphans bidirectionally (read-only)
**As** Daniel, **I want** to see exactly which published listings have no seller link, **so that** I
can confirm unpublishing them is safe before anything mutates.
**Acceptance:** a read-only query/script lists every published, catalog-visible listing with no
seller link — **id · title · created_at · price · order count**. Output posted in the PR body as a
table. **Zero writes.** Explicitly flag any row with `created_at > 2026-07-15` (see the escalation
warning above) and any row with `order_count > 0`.
**QA:** the script's own output is the evidence; no spec needed for a read-only report.
**Risk:** LOW. **→ Do not start Story 1.2 until Daniel has read this.**

### Story 1.2 — Unpublish confirmed orphans (cancelled: none found)
**As** a buyer or AI agent, **I want** every catalog result to belong to a real shop, **so that**
everything I can see is something I can actually buy.
**Acceptance:** every row from 1.1's list is **unpublished, not hard-deleted** (reversible). Rows
with **any orders against them are excluded and escalated to Daniel**, never swept — an order means
money moved, which implies a different failure than the create-path race. The operation is
idempotent and re-runnable. Re-running 1.1's report afterwards returns an empty list (modulo the
escalated rows).
**QA:** post-run, `curl https://miyagisanchez.com/api/ucp/catalog | jq '[.items[] | select(.shop.slug == "")] | length'` → `0`.
**Risk:** **HIGH — Daniel merges.** Mutates published commerce data.

**Close result:** not executed. The read-only report found zero true orphans; unpublishing the
reported product would have removed a valid live listing.

### Story 1.3 — The invariant + the CI hole
**As the** team, **I want** an empty `shop.slug` to fail the gate, **so that** an orphan can never
again reach production and be caught days later by a human reading an email.
**Acceptance:** three parts —
1. A spec asserting **no item** in `/api/ucp/catalog` output has an empty `shop.slug`. Note the
   current prod smoke samples only `items[0]`; an orphan at `items[7]` is invisible today. Assert
   across the whole page.
2. `e2e/embed-shop.spec.ts:31`'s skip is split: *no listings at all* → legitimately skip;
   *listings exist but the first has no shop* → **fail loudly**. This is the hole that let CI report
   green on the live defect.
3. The daily prod-smoke check 4 keeps its strict assertion — **confirm, change nothing.** It behaved
   correctly. Per the `smoke-triage` routine's own rule: never make a red smoke pass by weakening it.
**QA:** both specs observed **red** against production before the backend read fix, then green
against production after deployment. The exact linked product was the regression witness.
**Risk:** LOW.

## Sprint QA
- **api spec(s):** the no-empty-slug catalog spec + the corrected `embed-shop.spec.ts` skip logic.
- **Red-first:** run the new catalog spec **before** Story 1.2 sweeps. Prod currently contains the
  offending row, so it should fail on the real tree — the cheapest and most trustworthy red-first
  observation available. Capture that output in the PR.
- **deterministic gate:** backend `medusa build` → `tsc --noEmit` → `npm run test:unit`; frontend
  `tsc` + `next build` + Playwright. Green before merge.
- **No backend preview** — state the post-merge prod-smoke split in the PR (WAYS-OF-WORKING §5).
- **browser smoke owed:** **yes, to Daniel** — after the sweep, confirm no legitimate seller lost a
  listing (browse the homepage and one known shop page). The agent owns the API-level checks.

**Recorded result:** old production spec = one pass / one skip; corrected spec = red on the exact
empty slug; after backend deployment = two passes. The guard fetched all 71 advertised catalog
items over two pages (50 + 21), found zero blank slugs, and the exact product returned
`andrea-shops`. Schema fallback unchanged. No “did we unpublish something real” smoke is owed
because no data mutation occurred.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (backend has no preview — this runs post-merge)

1. Run: `curl -s https://miyagisanchez.com/api/ucp/catalog | jq '[.items[] | select(.shop.slug == "")] | length'`
   → Prints `0`.
2. Run: `curl -s https://miyagisanchez.com/api/ucp/catalog | jq -r '.items[0].shop.slug'`
   → Prints a real shop slug (non-empty).
3. Run: `curl -sI "https://miyagisanchez.com/embed/s/$(curl -s https://miyagisanchez.com/api/ucp/catalog | jq -r '.items[0].shop.slug')"`
   → **HTTP 200** (not 308), and the response includes
   `Content-Security-Policy: frame-ancestors *`.
4. Open `https://miyagisanchez.com/` in a browser.
   → The homepage renders listings normally; nothing obviously missing.
5. Open a known live shop page, e.g. `https://miyagisanchez.com/s/<a-shop-you-know>`.
   → Its listings are all still there. **This is the "did we unpublish something real" check.**
6. Wait for the next daily prod smoke run (or trigger it).
   → Check 4 (embed iframe) passes.
7. Confirm `e2e/embed-shop.spec.ts` **ran** rather than skipped in the CI log.
   → The test name appears as passed, not skipped — proving the hole from Story 1.3 is closed.

If any step fails, note the step number + what you saw — that's the bug report.
