# Catalog orphan-listing sweep — Sprint 1: report, unpublish, make it unrepeatable

**Status:** ⬜ not started

> **Root cause (proven 2026-07-19, don't re-derive):** `lib/ucp/schema.ts:367-384` emits
> `slug: ''` for a listing with **no linked shop** — deliberately, and the comment explains why a
> placeholder slug was tried and reverted. The prod-smoke failure is that fallback firing on a real
> row. `seller-product-create.ts` already made product-create + seller-link atomic (2026-07-15), so
> **no new orphan can be created** — these are pre-fix rows still published.
>
> ⚠️ **The one thing that would invalidate this plan:** if Story 1.1's report shows orphans created
> **after 2026-07-15**, the atomic-create assumption is wrong, there is a second unfixed path, and
> you must **stop and escalate** rather than sweep. Sweeping would hide an active bug.

## Stories

### Story 1.1 — Report the orphans (read-only; stop here and show Daniel)
**As** Daniel, **I want** to see exactly which published listings have no seller link, **so that** I
can confirm unpublishing them is safe before anything mutates.
**Acceptance:** a read-only query/script lists every published, catalog-visible listing with no
seller link — **id · title · created_at · price · order count**. Output posted in the PR body as a
table. **Zero writes.** Explicitly flag any row with `created_at > 2026-07-15` (see the escalation
warning above) and any row with `order_count > 0`.
**QA:** the script's own output is the evidence; no spec needed for a read-only report.
**Risk:** LOW. **→ Do not start Story 1.2 until Daniel has read this.**

### Story 1.2 — Unpublish the orphans
**As** a buyer or AI agent, **I want** every catalog result to belong to a real shop, **so that**
everything I can see is something I can actually buy.
**Acceptance:** every row from 1.1's list is **unpublished, not hard-deleted** (reversible). Rows
with **any orders against them are excluded and escalated to Daniel**, never swept — an order means
money moved, which implies a different failure than the create-path race. The operation is
idempotent and re-runnable. Re-running 1.1's report afterwards returns an empty list (modulo the
escalated rows).
**QA:** post-run, `curl https://miyagisanchez.com/api/ucp/catalog | jq '[.items[] | select(.shop.slug == "")] | length'` → `0`.
**Risk:** **HIGH — Daniel merges.** Mutates published commerce data.

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
**QA:** both specs observed **red** at least once (point the catalog spec at a fixture containing an
orphan, or run it pre-sweep against prod where the orphan still exists — the second is free and more
honest).
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
