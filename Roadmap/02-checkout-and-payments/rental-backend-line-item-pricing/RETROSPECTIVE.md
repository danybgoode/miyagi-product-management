# Rental line-item pricing — Retrospective

**Shipped:** 2026-07-08 · 3 sprints · Area 02 · Risk HIGH (S1/S2 mutate the checkout money path), LOW (S3 read-only quoting)
**Flag:** `checkout.rental_pricing_enabled` (enablement, default OFF). OFF = today's AskSeller coordination flow everywhere.

## What shipped
A rental listing used to open an AskSeller chat to "coordinate" the total by hand — the generic
checkout only ever charged a single unit of the listing price, ignoring the date range and deposit
entirely. It now books and pays in one step, charging the exact **noches × tarifa + depósito**:
- **S1** (backend, `8e41d18`, PR [#67](https://github.com/danybgoode/medusa-bonsai-backend/pull/67)) —
  ported the pure `lib/rental-pricing.ts` seam to the backend + the pesos→cents deposit
  normalization; the `start-checkout` rental branch: dates in, **server-recomputed** total charged
  through every provider, a `rental_booking` metadata block on cart→order, 422 on
  invalid/malformed/flag-OFF. The tamper guarantee: no client-sent amount field exists anywhere on
  the input to smuggle a total through.
- **S2** (frontend, `c5c25a3`, PR [#190](https://github.com/danybgoode/miyagisanchezcommerce/pull/190),
  3 stories) — `/checkout` rental mode threads `checkIn`/`checkOut` through to `startCheckout`
  (redirects to the PDP on invalid dates rather than falling through to a single-unit charge); the
  PDP "Reservar estas fechas" CTA flips behind the flag; buyer/seller order pages, both emails, and
  the chat ledger render dates + itemized deposit.
- **S3** (frontend, `a2a2cf5`, PR [#191](https://github.com/danybgoode/miyagisanchezcommerce/pull/191)) —
  agent parity (AGENTS rule #3): UCP `checkout-session` + MCP `get_checkout_options` accept
  `check_in`/`check_out` and return a `rental_quote` computed by the **identical** pure seam, so an
  agent's quote can never drift from the web checkout's; a date-less call now labels the rate
  clearly per-period instead of implying it's the full price; instant checkout URLs point at the
  dated `/checkout` page (the real S1/S2 charge rail) rather than the date-blind legacy endpoints.

## What went well
- **One pricing seam, ported not re-derived, backed every surface.** `lib/rental-pricing.ts`'s pure
  math (`nightsBetween`, `rentalUnits`, `computeRentalTotal`) is the single source of truth for the
  PDP estimate (epic 01 S4.2), the backend charge (S1.1's byte-for-byte port), the web checkout
  (S2.1's `resolveRentalCheckoutDisplay` wrapper), and the agent quote (S3.1's
  `resolveUcpRentalQuote` wrapper around that same S2.1 function) — four consumers, zero
  reimplementation, so the four numbers can never drift apart.
- **The tamper guarantee held at every layer, not just the money-mutating one.** Each seam's input
  type structurally has no amount/total field — the backend's `RentalCheckoutInput`, the frontend's
  `RentalCheckoutDisplayInput`, and S3's `UcpRentalQuoteInput` all only accept dates + the listing's
  own rate/attrs. A crafted extra field on any of them is simply never read, and each layer has a
  spec asserting it (`e2e/rental-checkout.spec.ts`, `e2e/ucp-rental-quote.spec.ts`).
- **Cross-agent (Codex) review earned its keep on two separate sprints.** S2 caught a real
  MX-timezone same-day-past-date bug pre-merge (UTC "today" disagreed with Mexico City's after
  ~18:00 local). S3 caught two real gaps a single reviewer's mental model of "read-only quoting"
  missed entirely: a rejected dated request still left the date-blind legacy MP/Stripe endpoints
  *available*, letting an agent "succeed" at a one-unit mischarge for the exact dates just refused;
  and `create_checkout` was callable on a rental listing despite its own tool description warning
  against it. Both fixed pre-merge, both in a sprint whose own risk tier was declared LOW.

## What we learned
- **"Read-only quoting" is not the same as "no mis-charge risk" — a URL or an availability flag IS
  a functional decision, even with zero new charge code.** S3's own scope doc correctly said "the
  charge stays on Sprint 1's server-recomputed rail," and that was true — but the *response* still
  decided which checkout URLs an agent would see as available, and a naive first pass left a
  date-blind fallback reachable exactly when it mattered most (a rejected booking attempt). The
  generalizable rule: when a "quoting only" story touches which payment options/URLs get returned
  as available, treat that gating logic with the same scrutiny as charge code, and get a second
  pass on it — don't let the risk *tier* label lower the bar on the *review*.
- **A new listing type's pricing rules must be checked against EVERY checkout entry point, not just
  the one the epic is actively building.** This app has two parallel checkout rails: `/checkout` →
  `startCheckout` → the backend (rental-aware since S1/S2), and the older `/api/mp/checkout` +
  `/api/stripe/checkout` endpoints (a flat one-unit MP/Stripe preference, predating the rental PDP
  entirely, with zero listing-type awareness). S3's research surfaced that the legacy pair would
  silently undercharge ANY rental booking that reached them — a latent gap that predates this epic
  and was never rentals-specific work's job to notice, since nothing about building the *new* rail
  points you at auditing the *old* one. Worth a standing habit: when a listing type gains
  date/quantity-sensitive pricing, grep for every route that resolves a charge amount from that
  listing type, not just the one in scope.
- **Local checkout staleness bit again, reconfirming the existing LEARNINGS rule.** The session
  started with the app-repo local `main` 11 commits behind `origin/main` (missing all of S1 and
  S2's own merges) — reading `lib/rental-pricing.ts`/`lib/ucp/schema.ts` from the stale local
  checkout would have missed `isValidYmd`/`readDepositCents` and the `rental` field S2 had already
  added. Caught by `git fetch` + `git show origin/main:<path>` before trusting "what already
  exists," per the existing rule; branched a fresh worktree off `origin/main` rather than reusing
  the stale root checkout.

## Gaps / follow-ups
- **Owed: Daniel's flag-ON money smoke.** Every sprint (S1 flag-OFF prod smoke passed 2026-07-08;
  S2's web checkout charge; S3's MCP round-trip) shares the same blocking dependency — **no
  disposable test rental listing exists in prod**. Once one exists: flip
  `checkout.rental_pricing_enabled` ON, run each sprint doc's smoke walkthrough (S2's steps 4–5 are
  the actual charge — Stripe test card + SPEI), then set `MS_TEST_RENTAL_LISTING_ID` so the
  fixture-gated specs in `e2e/ucp-rental-quote.spec.ts` and `e2e/ucp-checkout-quantity.spec.ts`'s
  sibling pattern light up permanently instead of skipping.
- **Known, not fixed: the legacy `/api/mp/checkout`/`/api/stripe/checkout` endpoints still have zero
  rental awareness for a date-less call.** They'd charge a bare one-unit rate on a rental listing,
  ignoring any date range/deposit — currently unreachable (no rental listing in prod), and fixing it
  is money-path code that deserves its own risk review rather than riding in on this epic's LOW-risk
  S3. A natural next-seed once the platform's checkout rails get consolidated, or sooner if a rental
  listing goes live before that happens.
- **create_checkout's rental guard is defense-in-depth, not the primary fix.** The primary fix is
  `get_checkout_options` no longer offering a mischargeable URL; the `create_checkout` guard is a
  belt-and-suspenders block for a model that skips straight to it, fail-open on a Medusa lookup
  failure so a transient hiccup never blocks a real (non-rental) checkout through that endpoint.
