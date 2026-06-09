# Sprint 3 — CP-first reorder + quote recovery/timeout

> Epic: [Delivery & Manual-Money Polish](README.md) · **Risk: HIGH — Daniel merges** (S3.2/S3.3 touch
> the checkout delivery/quote path; the whole epic is HIGH-risk).
> **Status: ✅ SHIPPED 2026-06-09 — frontend-only, MERGED to prod (squash `a149d9e`, PR #62).** The
> address form is now visually CP-first, and a slow/failed Envía quote resolves to a selectable
> coordinated path instead of hanging or dead-ending. Fresh-reviewer APPROVE (nits-only); CI green
> (tsc · build · Playwright `api`). Commits: S3.1 `27e4d89` · S3.2 `08ec5cb` · S3.3 `231adf2`
> (main-merge `397adbe`). Branch + worktree cleaned up.

## What reading the code re-scoped (vs the original plan)
- **The buyer's quote hang is NOT in `lib/envia.ts`.** That frontend lib's `quoteShipments` is only
  called by the *seller* ship route (`app/api/orders/[id]/ship`). The buyer's quote goes
  `CheckoutExperience → POST /api/checkout/shipping-rates` (a pure proxy) → backend `/store/envia/rates`
  → backend's own carrier loop. So the frontend-only fix for the spinner is a **timeout on that proxy
  fetch** in `CheckoutExperience`, not on `lib/envia.ts` (S3.3).
- **Coordinated proceed must respect a backend guard.** `start-checkout` **422s on card + coordinated
  delivery** (`fulfillment_method=coord|none` requires manual "pago directo"). So the S3.2 fallback
  auto-switches payment to the seller's first manual method; `fulfillment_method=coord` already resolves
  to the seeded `miyagi-entrega-acordada` $0 option backend-side (that IS the reused arranged option).
- **Checkout is auth-gated** (the page redirects anonymous visitors to sign-in). So the CP-first form
  can't be smoked anonymously — its browser spec is authed (skips without creds) and the live browser
  confirmation is **owed to Daniel**.

## Stories

### S3.1 — CP-first address order ✅ `27e4d89`
**As** a buyer on mobile, **I want** the address form to start with my CP, **so that** estado / alcaldía /
colonia auto-fill before I type anything else.
- Reordered `CheckoutExperience.tsx`: the CP block now leads; **name/phone + the rest of the address are
  gated behind a resolved CP** (full progressive disclosure — Daniel's call). No logic change —
  `handleCpChange` / `cpResolved` / `addressReady` are untouched; the lookup auto-fill still fires.
- **Acceptance:** on checkout, CP is the first visible address input; entering a valid CP auto-fills
  estado/alcaldía/colonias and reveals name/phone + street fields. ✅
- **Spec:** `e2e/checkout-cp-first.browser.spec.ts` (authed; skips without `MS_TEST_BUYER_EMAIL` +
  `MS_TEST_SHIPPABLE_LISTING_ID`).

### S3.2 — Coordinated fallback on quote failure ✅ `08ec5cb`
**As** a buyer, **I want** a selectable coordinated option when shipping can't be quoted, **so that** a
quote failure isn't a dead end.
- Replaced the inert "coordina con el vendedor" copy with a **selectable "Entrega acordada" card** shown
  when quoting settles with no usable rate (error/timeout, or empty + no-coverage message). Selecting it
  switches the effective `fulfillment_method` to `coord` and **auto-steers payment to the seller's first
  manual method** (the backend 422s on card + coord). If the seller has no manual method, the fallback
  stays unpayable with an honest contact-seller note.
- **Acceptance:** forcing a quote failure surfaces a selectable coordinated option that lets checkout
  proceed (no carrier rate required); card + coordinated never reaches start-checkout. ✅
- **Reuse:** `CheckoutFulfillmentMethod='coord'` already threads to start-checkout (`lib/cart.ts`).
- **Spec:** pure `e2e/checkout-fallback.spec.ts` (8 cases) on `shouldOfferCoordinatedFallback` +
  `pickManualPaymentId` (`lib/checkout-fallback.ts`).

### S3.3 — Quote timeout ✅ `231adf2`
**As** a buyer, **I want** shipping quotes to resolve even if a carrier hangs, **so that** "Cotizando…"
never spins forever.
- Wrapped the quote fetch in a pure `raceWithTimeout(…, 9s)`; on timeout the in-flight request is aborted
  and an honest error is set, which surfaces the S3.2 coordinated fallback. (The effect's teardown guard
  moved from `controller.signal.aborted` to a local `cancelled` flag so the timeout path still clears the
  spinner.)
- **Acceptance:** a stalled carrier resolves to the timeout/fallback within ~9s, never an infinite
  spinner. ✅
- **Spec:** pure `e2e/fetch-timeout.spec.ts` (4 cases) on `raceWithTimeout` / `isTimeoutError`
  (`lib/fetch-timeout.ts`).

## Sprint QA — result
- **Deterministic gate (green):** `tsc --noEmit` ✅ · `next build` ✅ (122/122 pages) · Playwright `api`
  — 12 new pure cases (`checkout-fallback` 8 + `fetch-timeout` 4) ✅. (eslint is not part of the CI gate;
  the only flagged rules are pre-existing react-hooks patterns elsewhere in the component.)
- **New specs:** `e2e/checkout-fallback.spec.ts`, `e2e/fetch-timeout.spec.ts` (both `api`, blocking) +
  `e2e/checkout-cp-first.browser.spec.ts` (authed browser, non-blocking, skips without fixtures).
- **Deploy:** frontend-only → Vercel preview → prod on merge. No backend / Cloud Run change.

## Sprint 3 — Smoke walkthrough
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
Needs a SIGNED-IN buyer (checkout is auth-gated) + an item from a seller who offers Envía shipping.
Steps 1–3 are anonymous-untestable (auth + checkout) → OWED TO DANIEL.

1. [Daniel] Sign in, open a shippable listing, "Comprar ahora" → /checkout. Choose "Envío" delivery.
   → The address form's FIRST field is the Código Postal (CP). Name/phone are NOT shown yet.
2. [Daniel] Type a valid CP (e.g. 06000).
   → Estado + Alcaldía auto-fill (read-only ✓ badges), the colonia dropdown appears, THEN name/phone +
     calle/número reveal below. (CP-first progressive disclosure — S3.1.)
3. [Daniel] Complete name/phone/calle/número so the address is "ready".
   → Paquetería rates quote ("Cotizando…" briefly), then selectable carrier rates appear. Pick one →
     the pay button enables. (Baseline still works.)
4. [Daniel — quote failure] Use a CP/address with no carrier coverage (or a seller whose carriers fail).
   → After "Cotizando…" settles, instead of a dead end you see a selectable "Entrega acordada" card
     under the coverage/error message. (S3.2.)
5. [Daniel] Select "Entrega acordada".
   → Payment auto-switches to "Pago directo" (SPEI/efectivo) with the note that coordinated delivery is
     paid directly; the pay button enables with NO carrier rate required. (If the seller has no pago
     directo, the card shows the honest "escríbele para acordar" note and stays unpayable.)
6. [Daniel — money path] Proceed to pay with pago directo.
   → start-checkout accepts it (fulfillment_method=coord, $0 arranged option); card + coordinated is
     never submitted (it would 422). Order is created as a coordinated/arranged-delivery order.
7. [Daniel — timeout] With a carrier simulated as slow (>9s), watch the "Cotizando…" state.
   → It resolves to the timeout error within ~9s and the "Entrega acordada" fallback appears; it never
     spins indefinitely. (S3.3.)

If any step fails, note the step number + what you saw.
```
*Money/auth/checkout steps (1–7) are **owed to Daniel** — checkout is auth-gated and step 6 touches the
real payment path; an automated anonymous browser smoke can't cover them. The pure `api` specs cover the
fallback-eligibility + timeout logic deterministically; the authed CP-first browser spec lights up locally
with `MS_TEST_*` fixtures.*
