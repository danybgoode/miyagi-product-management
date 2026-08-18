# Seller-portal depth pass — Sprint 2: Reversible and honest

**Status:** ✅ shipped — frontend commit `03edbcb` (included in PR #388)

## Stories

### Story 2.1 — Listing deletes have a real 10-second escape
**As a** seller cleaning my catalog, **I want** a short undo window after choosing delete, **so that** a
mis-tap does not remove a live listing.

**Acceptance:** single-row and staged bulk listing delete enter a visible 10-second pending state before
the existing soft-delete request runs; a seller-shell pending-delete owner survives in-app navigation;
rows disappear optimistically with one shared toast naming the object/count and `Deshacer`; undo cancels
before any network write and restores the rows; expiry calls the unchanged single/bulk delete path exactly
once; failure restores the rows and explains what to do next; a page reload during the pending window fails
safe by cancelling the uncommitted deletion. Remove copy claiming a soft-deletable listing cannot be undone.

**Risk:** low

### Story 2.2 — Guidance is factual and es-MX
**As a** seller setting up and operating my shop, **I want** guidance based on my own state instead of
threats or made-up benchmarks, **so that** I can trust the portal's advice.

**Acceptance:** remove the exact `4×`, `3×`, `70%`, and `23%` claims; replace photo/description/REPUVE
guidance with concrete actions; replace the Orders threat with factual urgency derived from the seller's
oldest waiting order; remove `State`, `Municipality`, and `Listing location` leaks from SellWizard; preserve
brand names and genuine product facts such as real prices/counts and the platform's `100% gratis` promise.

**Risk:** low

## Sprint QA
- **pure spec(s):** pending-delete reducer covers schedule → undo → no write, schedule → expiry → one write,
  in-app navigation survival, reload-safe cancellation, and write failure → restore; order urgency derives
  only from real order age/count and handles zero orders.
- **api/source spec(s):** ban the four claims and named bilingual labels across the seller surface; retain
  existing auth-gate coverage on the unchanged delete routes.
- **browser spec:** with delete requests stubbed, exercise single and staged-bulk delete and prove `Deshacer`
  prevents the request; expiry fires once and failure restores the row/report.
- **browser smoke owed:** Daniel's authenticated disposable-listing smoke in production; no real payment.
- **red proof:** make undo fall through to the request and reinsert one prohibited claim; observe the new
  specs fail before restoring the implementation.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (use the frontend preview URL pre-merge)

1. Create or choose a disposable listing, then go to https://miyagisanchez.com/shop/manage/catalogo.
   → The listing appears and offers Eliminar through its row actions.
2. Choose Eliminar, then press `Deshacer` within 10 seconds.
   → The row returns immediately, no delete request runs, and it remains live after reload.
3. Delete the same disposable listing again and let the countdown expire.
   → Exactly one delete runs; the listing stays absent after reload. A failed request would restore the row
   with a clear retry message.
4. Stage a bulk delete of disposable listings, press apply, then `Deshacer` before 10 seconds.
   → No selected listing is deleted. Repeat and let it expire; the existing per-row apply report appears.
5. Open https://miyagisanchez.com/sell and https://miyagisanchez.com/shop/manage/orders.
   → None of `4×`, `3×`, `70%`, `23%`, `State`, `Municipality`, or `Listing location` appears; order urgency
   refers only to the seller's real waiting orders.

If any step fails, note the step number + what you saw — that's the bug report.
