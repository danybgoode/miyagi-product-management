# Custom print products — Retrospective

_Closed: 2026-07-07 · 4 sprints, all shipped to prod. The sticker-shop configurator, from storefront honesty to agent-native reorder._

## What shipped

miyagiprints (and any future print-shop tenant) can now sell a real StickerJunkie/Sticker-Mule-grade
configured product: priced size/material options, automatic quantity-break pricing, buyer artwork
upload that rides the order end-to-end, a lightweight print-proof sign-off, full AI-agent parity, and
one-tap reorder.

- **S1 — Storefront honesty + flagship ops.** [#171](https://github.com/danybgoode/miyagisanchezcommerce/pull/171)
  `8552974`. Fixed `getShopListings()` to exclude `is_print_placement` products across every
  storefront channel (marketplace/subdomain/custom-domain/embed) — the general catalog route already
  filtered these, the per-shop route didn't. miyagiprints' comp grants (subdomain/custom-domain/ML-sync)
  confirmed live; real catalog seeding continues as an ops backlog item, not a sprint blocker.
- **S2 — Priced options + quantity tiers (commerce core).** Backend
  [#60](https://github.com/danybgoode/medusa-bonsai-backend/pull/60) `d22fb29`, frontend
  [#175](https://github.com/danybgoode/miyagisanchezcommerce/pull/175) `7009895` +
  [#176](https://github.com/danybgoode/miyagisanchezcommerce/pull/176) `d6d457b` (Story 2.4, the
  seller "Opciones" UI, added mid-epic once the gap was found). Real Medusa options/variants for size ×
  material, quantity price tiers via `min_quantity`/`max_quantity`, a pure `lib/price-grid.ts` deriver
  keeping PDP/cart/checkout display in sync with Medusa's own price resolution, and a seller-facing
  editor so configuring a product no longer needs a direct API call.
- **S3 — Artwork upload + the configurator buy box.** Commits `4f6b859`/`bf769c3`/`8e348cc`/`c416183`,
  part of [#177](https://github.com/danybgoode/miyagisanchezcommerce/pull/177). A new `file`
  `CustomFieldType`, a genuinely public (no-Clerk) upload route with real magic-byte format sniffing,
  a low-res preflight warning, and the unified options → upload → live price grid → total buy box —
  all behind `configurator.enabled` (fail-open ON, scoped narrowly after a cross-review catch, below).
- **S4 — Lightweight proof, agent parity, reorder.** Frontend
  [#177](https://github.com/danybgoode/miyagisanchezcommerce/pull/177) `bfd28de` (same PR, Sprint 3+4),
  backend [#63](https://github.com/danybgoode/medusa-bonsai-backend/pull/63) `6d982ff`. A seller can
  send a print proof into the existing buyer-seller chat (size/qty/price always server-derived — the
  StickerJunkie-pitfall guard); an AI agent can read a configurator listing's options/tiers/artwork
  contract and place a fully configured order via MCP; a buyer can reorder a fulfilled configurator
  order in one tap. Same-day hardening from cross-review: backend
  [#64](https://github.com/danybgoode/medusa-bonsai-backend/pull/64) `fc6d867` (a seller-ownership
  auth-bypass gap, closed in three routes) and frontend
  [#181](https://github.com/danybgoode/miyagisanchezcommerce/pull/181) `9465120` (MCP `isError`
  silently dropped for most tools' error responses).

## What went well

- **Sprint 2's mid-epic gap-catch (Story 2.4) is the epic's best process moment.** Sprints 2.1/2.2's
  own acceptance text said "seller defines/sets" but the sprint shipped API-only — caught by re-reading
  the full scope table against what Sprint 3/4 actually covered (neither did), not assumed to land
  later. Added as its own story rather than silently expanding S3's scope. Generalizes: when a story's
  acceptance implies a UI action but the build only proves it via direct API calls, that's a real gap,
  not a deferred nice-to-have — check the REST of the epic's scope table before assuming a later sprint
  covers it.
- **A pre-existing security-shaped bug (seller-ownership check skippable when an order's items had no
  resolvable `product_id`) was caught by cross-review on Sprint 4's OWN new route** (which had faithfully
  copied the exact shape from two already-shipped routes, `tags` and `confirm-payment`) — not found by
  auditing the old routes directly. Fixed the new route immediately, then spawned a follow-up task for
  the two pre-existing instances rather than silently expanding the current PR's scope. A second
  cross-review round on THAT follow-up caught a further nuance (`.some()` ownership should be
  `.every()` for an order-level write) and the fix was applied to all three routes together. Two review
  passes on a security fix, each finding something real, is a strong argument for re-reviewing hardening
  PRs even when they feel like "just apply the same fix again."
- **A local dev environment gap surfaced a real, load-bearing invariant.** The local Medusa dev
  database had no configurator product seeded at all (the mirror-referenced listing didn't exist in
  this Postgres), which blocked a full live MCP round-trip — but investigating WHY led to confirming
  `lib/cart.ts`'s "a cart can only ever hold one seller's items" constraint, which is exactly the fact
  that makes the `.some()`→`.every()` ownership tightening a safe no-op change rather than a behavior
  risk. A blocked verification path, chased down, produced the evidence needed to trust an unrelated fix.
- **Extracting shared logic (`ingestArtworkBytes`, `lib/reorder.ts`, `deriveProofRestatement`) before
  a second caller needs it kept every new integration point (MCP checkout, the reorder button) a thin
  wrapper around already-tested logic**, rather than a second copy of security- or money-adjacent code.
  The one regression this session did produce (the artwork-upload route's cheap size fast-fail
  silently moved AFTER the buffer read during the `ingestArtworkBytes` extraction) was caught by the
  SAME cross-review pass that validated the extraction — a reminder that "no behavior change" claims on
  an extraction are exactly the kind of claim a fresh reviewer should re-derive from the diff, not trust.
- **CI against the real deployed Vercel preview caught two things local dev-mode testing structurally
  could not:** (1) a test payload that was actually ABOVE Vercel's own ~4.5MB body-size ceiling, only
  ever exercising the app's own validation locally (no such platform limit exists in `next dev`) and
  413ing at the platform edge on the real preview; (2) nothing else broke, which is its own useful
  signal — the deterministic gate's local/CI parity held everywhere else across 4 sprints' worth of
  changes to shared files (`ConversationClient.tsx`, `transaction-ledger.ts`, `lib/cart.ts`).

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md (dedupe — sharpen, don't append). -->
- **A conversation keyed by `(buyer, listing)` that also carries a direct order link must repoint that
  link to the LATEST order on every use, never pin it to the first.** A buy-now (non-negotiated)
  purchase gets no `offer_id` at all, so a durable `medusa_order_id` column was the only way its
  conversation could resolve ledger/proof state — but the first design ("stamp once, never overwrite")
  breaks the instant a second order reuses that same conversation (exactly what a reorder feature
  enables), showing the WRONG order's state forever after. Caught by cross-review before merge; the fix
  is "always repoint," not "stamp once." Any conversation-to-domain-object link scoped narrower than
  1:1 needs to ask "what happens on the SECOND link-worthy event," not just "what happens on the first."
- **A seller-ownership check phrased as `productIds.some(pid => sellerOwns(pid))` is only as safe as
  the invariant that the order can't mix sellers' items — write it as `.every()` regardless**, so the
  check stays correct even if that invariant (enforced elsewhere, at cart-construction time on the
  frontend) ever weakens. Two independent cross-review passes flagged the same class of gap on this
  epic (once as an outright bypass when `productIds.length === 0`, once as `.some()` vs `.every()`) —
  worth treating "ownership check on an order-level write" as a checklist item whenever copying an
  existing `resolveOrderForSeller`-shaped helper into a new route, not just testing it against the
  happy path.
- **Extracting a validate-and-store helper from a single-caller route can silently reorder a
  fast-fail relative to the expensive operation it exists to short-circuit.** `ingestArtworkBytes`'s own
  size check ran fine in isolation, but the caller had already materialized the full request buffer via
  `file.arrayBuffer()` before ever calling it — the cheap `File.size` check that used to gate that read
  was lost in the extraction. When lifting shared logic out of a route that has an existing
  cheap-check-before-expensive-operation shape, explicitly verify the NEW caller preserves that
  ordering, not just that the extracted function's own internal checks still exist.
- **A synthetic "oversize" test payload must be sized relative to BOTH the app's own cap and the
  real deployment platform's ceiling, not just the app's.** A payload comfortably above the app's 4MB
  cap can still be ABOVE the platform's ~4.5MB real body-size limit, so it only ever exercises the
  platform's error path in production, never the app's own validation the test was written to prove —
  and this is invisible in local dev (`next dev` enforces no such platform limit), so it silently
  passed locally for the life of the epic until it ran against a real Vercel preview. When a spec
  asserts "our app-level cap fires," pick a size strictly between the app cap and the platform ceiling,
  and say so explicitly in the test's own comment (which this one did — the math itself was just wrong).

## Gaps / follow-ups

- **Live smokes owed to Daniel** (numbered walkthroughs already in each sprint doc):
  - S1: confirmed already (2026-07-04).
  - S2: money-path buy-flow across a tier boundary (walkthrough in `sprint-2.md`).
  - S3: guest upload → configure → pay with a Stripe test card → artwork visible on order + both
    emails → seller downloads the original (walkthrough in `sprint-3.md`).
  - S4: proof round-trip (seller sends → buyer approves → ledger + both order screens update) + one
    full MCP agent order with a real artwork URL (walkthrough in `sprint-4.md`) — this build session's
    local Medusa dev database had no configurator product seeded, so only the MCP tool's
    validation/branching paths could be verified locally, not an actual successful agent checkout.
  - `configurator.enabled` flag-flip decision (currently fail-open ON — S3's buy-box addition is
    already live; flipping OFF is the deliberate act to revert to Sprint 2's plain variant/tier buy box).
- **Known v1 scope limits, not blockers:** proof state (`proof_sent`/`proof_approved`/etc.) is
  ORDER-level, derived from only the order's first line item — fine for the sprint's single-item
  buy-now case, but an order with multiple configurator items from the same seller only gets one proof
  covering the first item. A true per-line-item proof would need per-item metadata; out of scope here.
- **Follow-up tasks spawned this session, not yet actioned:** fixing the `isError`-drop shape in the
  remaining MCP tool cases was completed via [#181](https://github.com/danybgoode/miyagisanchezcommerce/pull/181)
  and the `tags`/`confirm-payment` ownership gap via [#64](https://github.com/danybgoode/medusa-bonsai-backend/pull/64)
  — both merged same-day, so no outstanding spawned tasks remain from this epic.
- **Out of this epic's scope (unchanged from grooming):** add-on surcharges beyond quantity tiers,
  own-shop premium presentation for configurator listings (its own groom), negotiation/offers on
  multi-variant listings (explicit Daniel-confirmed scope call in S2 — cash/card-only for now).
