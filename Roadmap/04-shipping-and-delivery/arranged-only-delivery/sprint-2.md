# Sprint 2 — Agent parity + consistency hardening (the car)

**Epic:** [Arranged-only delivery](README.md) · **Risk: MIXED (MED + HIGH)** · **Status: ✅ MERGED to
`main` in both repos, 2026-07-11.** Backend PR
[danybgoode/medusa-bonsai-backend#85](https://github.com/danybgoode/medusa-bonsai-backend/pull/85)
(S2.2, squash `4de1de2`) and frontend PR
[danybgoode/miyagisanchezcommerce#228](https://github.com/danybgoode/miyagisanchezcommerce/pull/228)
(S2.1, squash `2317c0f`), both squash-merged on Daniel's "merge on green" go-ahead after CI green + a
fresh pr-reviewer pass + an advisory cross-agent (Codex) pass on each, off fresh `feat/arranged-only-delivery-s2`
branches cut in isolated worktrees off latest `origin/main` (S1's branch was squash-merged — a dead end
per `LEARNINGS.md`). Branches deleted in both repos after merge.

**S2.2 is live now, unconditionally** — the service/rental card-payment hole is closed in production as
of this merge, no flag. The `arranged` capability for ordinary products (S1's kill-switch,
`shipping.arranged_only_enabled`) stays OFF/dark pending Daniel's S1 money smoke, per the epic's own
Definition of Done — this sprint didn't touch that gate.

**Review pass results:**
- **Backend PR #85 (S2.2)** — fresh pr-reviewer: **Approve** (all 8 report claims independently
  re-verified, including re-executing `isCoordinatedListing`'s 7 branch combinations against the real
  function body). Cross-agent (Codex) advisory caught one real gap: the coordinated-guard's cart-product
  hydration could silently read a hydration shortfall as "not coordinated" (fail-open) instead of
  fail-closed — fixed pre-merge (`c360f00`), re-verified (tsc clean, 401/401 unit tests).
- **Frontend PR #228 (S2.1)** — fresh pr-reviewer: code approved on correctness; flagged two procedural
  holds (still draft; whether MED vs HIGH is right for a `checkout-session` file). Resolved pre-merge:
  marked ready-for-review, and posted the tier reasoning on the PR — this route never itself moves money,
  it only describes availability + returns `checkout_url`s pointing at the actual mutating endpoints
  (`/api/mp/checkout`, `/api/stripe/checkout`, both untouched); the real enforcement is the backend's
  `start-checkout` 422 guard (S2.2, HIGH-gated). Cross-agent (Codex) advisory: one trivial formatting nit
  fixed (`0e84a52`), one already-acknowledged fixture-gating limitation (no unmocked positive test runs in
  CI until `MS_TEST_ARRANGED_LISTING_ID` is provisioned).

Sprint 1 ships the web path. Sprint 2 brings the agent surface to parity and closes the adjacent money-path
inconsistency the spike surfaced.

**Build note (planning):** research for this sprint found the S2.2 hole goes one layer deeper than S1's
cross-agent finding — `checkout-options`' own `buildDeliveryCatalog` derivation never looks at
`listingType` at all (only a client-supplied `delivery_mode` query param), and `start-checkout`'s 422
guard runs *before* the cart/product is even loaded, so there's no server-side product truth anywhere on
the payment path today. Fix: one canonical pure function (`isCoordinatedListing`) in
`delivery-catalog.ts`, called by both `checkout-options` (existing) and `start-checkout` (new). Confirmed
with Daniel: the service/rental branch of that function is **unconditional** (ships live on merge, no new
flag) since it closes a pre-existing bug, not new epic scope — the `arranged`-capability branch stays
behind `shipping.arranged_only_enabled` exactly as S1.1 built it. Build order is **S2.2 (backend) before
S2.1 (frontend)** — deviates from the story numbering below because S2.1's UCP hint is only fully correct
for service/rental listings once S2.2's backend fix ships. Full plan:
`~/.claude/plans/toasty-sniffing-snowglobe.md`.

---

## Stories

### S2.1 — Agent/UCP arranged-only surface *(MED — reviewer may merge on green CI)* ✅ MERGED — frontend `2317c0f` (PR #228 squash)
> **As a** buyer's AI agent, **I want** the checkout session to tell me a listing is delivered by
> coordination, **so that** I present "coordina la entrega con el vendedor" instead of implying shipping or
> offering a card.
- `app/api/ucp/checkout-session/route.ts` adds a `delivery: { arranged: boolean, note: string }` hint derived
  from checkout-options' `only_coordinated` / `delivery_methods` — `fetchBackendPaymentMethods` now sends
  `delivery_mode` and reads both fields back (previously ignored both entirely).
- The field is **omitted** (not `false`) for ordinary shippable listings — keeps
  `ucp-checkout-session-shipping-boundary.spec.ts` passing unmodified.
- Confirmed the existing filtering already drops mp/stripe for coordinated listings once `only_coordinated`
  is correctly read — the agent computes `mpAvailable`/`stripeAvailable` false, only `bank_transfer`/`cash`
  remain, no instant `checkout_url`s.
- **Copy correction from the original story text**: research found NO bilingual dictionary pattern exists
  anywhere in `app/api/ucp/*` — every buyer-facing UCP string is es-MX only (the manifest's `en` text is
  developer-facing tool docs, a different concern). The delivery note follows that existing convention
  (es-MX only), not "es-MX + en."
- **Additive, no mutation** — surface parity only; agent-initiated arranged-order *issuance* stays deferred
  (the UCP session doesn't open a Medusa cart, per its own `quantity` note).
- **Acceptance:** a `POST /api/ucp/checkout-session` for an arranged listing returns `delivery.arranged:true`
  with a coordinate note, **no** instant `checkout_url`s, and only manual payment options.

### S2.2 — Close the service/rental card-payment hole *(HIGH — Daniel merges)* ✅ MERGED — backend `4de1de2` (PR #85 squash)
> **As** the platform, **I want** service and rental listings to enforce manual payment like any coordinated
> delivery, **so that** a buyer can't pay by card for something that fulfills by in-person coordination.
- **Widened during build**: the real root cause was one layer deeper than the original story text —
  `checkout-options`' own `buildDeliveryCatalog` derivation never looked at `listingType` at all (only a
  client-supplied `delivery_mode` query param), and `start-checkout`'s 422 guard ran **before the
  cart/product was even loaded**, so there was no server-side product truth anywhere on the payment path.
- Fix: one canonical `isCoordinatedListing()` in `delivery-catalog.ts`. `service`/`rental` → coordinated
  **unconditionally** (closes the pre-existing bug live on merge, no flag — confirmed with Daniel).
  `delivery_mode==='arranged'` → coordinated only when `arrangedOnlyEnabled` (unchanged S1.1 contract).
  `checkout-options` calls it via `buildDeliveryCatalog` (no route changes needed); `start-checkout`
  re-derives it server-side from the cart's actual product metadata before the payment branch runs.
- **Known cross-epic tension, flagged in code**: the dark/OFF `checkout.rental_pricing_enabled` capability
  was designed to let rentals be safely card-paid via a server-recomputed total. This story's `rental`
  branch unconditionally overrides that per this epic's explicit scope. Changes nothing live today (that
  flag is off); whoever activates it later must reconcile the two — see the doc comment on
  `isCoordinatedListing`.
- **Acceptance:** attempting card + a `service` (or `rental`) listing is blocked — the checkout-options
  response offers no instant method, and `start-checkout` 422s — matching arranged-only behavior.
- **Regression spec** so the hole can't silently reopen.

---

## Sprint QA
- **API spec** (S2.1) asserting a coordinated listing's UCP session omits instant `checkout_url`s and
  carries `delivery.arranged:true` + the note. ✅ `e2e/ucp-checkout-session-arranged-delivery.spec.ts`
  (fixture-gated on `MS_TEST_ARRANGED_LISTING_ID`, owed to Daniel to provision — skips gracefully until then).
- **Regression spec** (S2.2) pinned to the exact hole. ✅ Built as a **backend unit spec**
  (`delivery-catalog.unit.spec.ts`, 6 new cases, part of the `test:unit` CI gate), not a frontend Playwright
  spec — testing `start-checkout` directly from Playwright would require inventing a new direct-to-Medusa
  test pattern (creating a real cart via the store API, etc.) that doesn't exist anywhere in this harness
  today; every existing spec hits the frontend's own Next.js routes. This matches how the backend's own CI
  gate already works (no DB-bound integration tests, by design — see WAYS-OF-WORKING). **Deviates from the
  original QA plan**, which assumed a frontend spec was the right tier.
- **Pure-logic** coverage folded into the S1.1 derivation seam — done (`isCoordinatedListing` + the
  `buildDeliveryCatalog` cases above).
- **Anonymous browser smoke** — an agent-style fetch of a coordinated listing shows the coordinate hint —
  **owed, post-merge** (nothing live to fetch yet; attempted pre-merge against prod and confirmed it's
  correctly running the OLD code, as expected — see PR #228's test plan).
- **Money-path smoke — OWED TO DANIEL, he will run it in prod** (confirm a real service/rental checkout can
  no longer be card-paid).

---

## Sprint 2 — Smoke walkthrough (do these in order)
Env: **production** (both PRs merged 2026-07-11; backend Cloud Build deploys ~12 min post-merge, no
preview). Steps 1–2 already ran pre-merge (below) as a build-time sanity check — steps 3–7 are the real
prod walkthrough, **all owed to Daniel** (he'll run these himself in prod).

1. ✅ **Ran pre-merge.** The two new/updated specs against the frontend PR's preview correctly **skipped**
   (fixture env vars not yet set) rather than failed — confirmed the harness wiring before the fixtures
   exist: `e2e/ucp-checkout-session-shipping-boundary.spec.ts`, `e2e/ucp-checkout-session-arranged-delivery.spec.ts`.
2. ✅ **Ran pre-merge.** `npm run test:unit` in `apps/backend` on the S2.2 branch — 401/401 passed,
   including the 6 new `isCoordinatedListing`/`buildDeliveryCatalog` regression cases in
   `delivery-catalog.unit.spec.ts` pinned to the exact service/rental hole.
3. **(owed to Daniel)** As an AI agent (or `curl`), `POST https://miyagisanchez.com/api/ucp/checkout-session`
   with `{"listing_id":"<a live service or rental listing's prod_ id>"}`.
   → The response body includes `delivery: { arranged: true, note: "…" }`, and in `payment_options`, both
   `mercadopago` and `stripe` entries show `available: false` with **no** `checkout_url`.
4. **(owed to Daniel)** Repeat step 3 for an ordinary shippable **product** listing (not service/rental, no
   `delivery_mode=arranged` metadata).
   → The response has **no** `delivery` key at all (omitted, not `false`) — byte-identical to before this
   sprint.
5. **(money — owed to Daniel)** As a buyer, attempt to check out a live service or rental listing on the web
   (`/checkout?listingId=...`) and try to pay by card (Stripe or MercadoPago).
   → Card payment is blocked — the checkout page shows only pago directo (SPEI/efectivo), matching the
   existing arranged-only UI from Sprint 1. Before this sprint, card would have worked for these listings.
6. **(money — owed to Daniel)** Complete that same service/rental checkout using SPEI or cash.
   → The order completes normally as a manual/coordinated order — the fix blocks card, not the sale itself.
7. **(agent-live — owed to Daniel)** Point an MCP-connected AI agent (e.g. Claude Desktop configured per
   `ucp.md`) at a live service/rental listing and ask it to check available payment methods.
   → The agent reports only manual/coordinated options and mentions coordinating delivery directly with the
   seller — it should not offer to pay by card.

If any step fails, note the step number + what you saw — that's the bug report.
