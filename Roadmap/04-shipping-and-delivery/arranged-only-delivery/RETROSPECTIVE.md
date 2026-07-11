# Arranged-only delivery — Retrospective

_Closed: 2026-07-11_

## What shipped

- **Sprint 1 — the web path.** ✅ MERGED 2026-07-11, backend
  [#84](https://github.com/danybgoode/medusa-bonsai-backend/pull/84) → squash `21b1874`, frontend
  [#223](https://github.com/danybgoode/miyagisanchezcommerce/pull/223) → squash `ba92aab`. Per-listing
  `delivery_mode` (`carrier|arranged`) on product metadata; `checkout-options` derives `coord`-only
  delivery + `only_coordinated` for arranged listings via a new pure seam (`buildDeliveryCatalog`); seller
  listing editor gets an "Entrega" toggle; publish gate accepts arranged-with-manual-payment; web checkout
  renders the coordinated path first-class. All behind `shipping.arranged_only_enabled` (default OFF,
  dark-shipped). A small unrelated chore rode alongside: `/admin/flags` sort + pagination + descriptions
  (PR #225, LOW, merged).
- **Sprint 2 — agent parity + the card-payment hole fix.** ✅ MERGED 2026-07-11, backend
  [#85](https://github.com/danybgoode/medusa-bonsai-backend/pull/85) → squash `4de1de2`, frontend
  [#228](https://github.com/danybgoode/miyagisanchezcommerce/pull/228) → squash `2317c0f`. S2.1: the UCP
  `checkout-session` route now threads `delivery_mode` to the backend and surfaces a `delivery: {
  arranged, note }` hint, closing a real agent-facing gap (an AI agent checking out a coordinated listing
  previously still saw card options). S2.2: closed the service/rental card-payment hole for real — one
  canonical `isCoordinatedListing()` function now backs both `checkout-options` and a new server-side
  re-derivation in `start-checkout`'s payment guard; service/rental listings became unconditionally
  manual-payment-only **live on merge, no flag** (a bug-fix to pre-existing behavior, not new epic scope —
  explicitly confirmed with Daniel before building).

Both sprints' PRs went through the same review sequence: CI green (tsc + build + unit/Playwright) → a
fresh pr-reviewer pass (independent, re-derives intent from the diff alone) → an advisory cross-agent
(Codex) pass. Both passes caught real, non-blocking issues, fixed pre-merge (see below).

## What went well

- **Research-before-planning caught that the real bug was one layer deeper than the epic doc's own scope
  language.** The epic README already recorded S1's cross-agent finding that S2.2 needed widening from
  "service/rental only" to "any arranged product." Sprint 2's own planning research went one step further:
  `checkout-options`' derivation never looked at `listingType` at all (only a client-supplied
  `delivery_mode` query param), and `start-checkout`'s 422 guard ran *before the cart/product was even
  loaded* — there was no server-side product truth anywhere on the payment path, for any listing type.
  Confirming this against the actual current code (not the epic doc's stale line-number references, which
  had drifted since S1) before writing any code avoided building a narrower fix that would have left the
  door open.
- **One canonical pure function, shared by both call sites, instead of two independent checks that could
  drift.** `isCoordinatedListing()` in `delivery-catalog.ts` is the single source of truth `checkout-options`
  and `start-checkout` both call — the sprint doc's own design principle ("keep checkout-options the single
  source of truth") held up cleanly through implementation; there was never a moment where the two surfaces
  computed coordination differently.
- **A user-facing behavior-change decision (does S2.2 need its own new flag?) was surfaced explicitly
  before building, not decided unilaterally.** The service/rental fix genuinely changes production behavior
  on merge — Daniel was asked directly whether that should ship unconditionally or behind a fresh
  kill-switch, and the "unconditional, it's a bug fix" answer shaped the entire implementation (no flag
  plumbing needed in the fix itself). Building first and asking later would have either produced a fix that
  needed rework, or silently shipped a live money-path behavior change without an explicit go-ahead.
- **Two independent review layers each caught a real, different bug, exactly as designed.** The advisory
  cross-agent (Codex) pass on the backend PR caught a genuine fail-open gap: if the batched cart-product
  hydration returned fewer rows than requested, the guard silently read that as "not coordinated" instead
  of failing closed. Fixed same-session, re-verified. The fresh pr-reviewer pass (a different mechanism —
  independent re-derivation, not diff-pattern-matching) then independently re-executed the fixed function's
  seven branch combinations against the real code before approving — genuine double coverage, not
  redundant motion.

## What we learned

- **A sprint doc's own inline code excerpts and line-number references can go stale within days, even
  across the SAME epic's own sprints.** Sprint 1's README cited `start-checkout/route.ts:237-247` for the
  422 guard; by the time Sprint 2 read the live code, it had shifted to `~243-253` and the actual
  cross-cutting gap (no product data loaded at all before the guard runs) wasn't visible from the doc's own
  framing — only from reading the current file directly. Generalizable: treat scope-doc code excerpts as
  orientation, not ground truth, and always re-read the actual current file before writing the fix,
  especially when a doc that motivated a previous sprint's finding is now itself a sprint or more old.
- **A CI-green regression spec doesn't have to mean "a new Playwright spec" — matching the coverage tier to
  where the fix actually lives avoids inventing test infrastructure that doesn't fit the harness.** S2.2's
  fix is entirely backend logic (`delivery-catalog.ts` + `start-checkout`'s guard); the regression coverage
  for it went into the backend's existing `delivery-catalog.unit.spec.ts` (6 new cases, part of `test:unit`),
  not a new frontend Playwright spec hitting `start-checkout` directly — which would have required
  inventing a new direct-to-Medusa cart-creation test pattern that doesn't exist anywhere in this repo's
  harness today (every existing spec hits the frontend's own Next.js routes). This deviated from the
  sprint doc's original QA plan (which assumed a frontend spec), and the deviation was stated explicitly
  in the sprint doc + the PR rather than silently substituted.
- **"Merge on green" from the product owner is permission to proceed through the established review gate
  without re-asking at each step — not permission to skip a genuine "needs discussion" finding from an
  independent review.** The frontend PR's fresh-reviewer pass approved the code on correctness but flagged
  a real, worth-considering question (is a `checkout-session` file really MED, not HIGH, risk?) rather than
  a clean approve. Rather than self-merging under the broad "merge on green" authorization, the reasoning
  was posted back on the PR (this route never itself moves money — the real enforcement is the sibling
  HIGH-tier backend PR's guard) and the PR was left ready-for-review rather than merged by the builder,
  preserving the review layer's actual authority even under a broad go-ahead. Reconfirms the existing
  LEARNINGS entry on this exact pattern, this time on a tier-classification question rather than a
  code-correctness one.

## Gaps / follow-ups

- **Both sprints' money-path smokes owed to Daniel, to be run in prod** — Sprint 1's (seller declares
  arranged, buyer checks out via pago directo, order completes — walkthrough in `sprint-1.md`) and Sprint
  2's (a real service/rental checkout can no longer be card-paid; an MCP-connected agent sees only manual
  options on a coordinated listing — walkthrough in `sprint-2.md`). Neither has run yet.
- **The kill-switch (`shipping.arranged_only_enabled`) stays OFF** until Sprint 1's money smoke passes —
  the `arranged` capability for ordinary (non-service/rental) products is still dark in production. Only
  the S2.2 service/rental fix is live unconditionally.
- **A known, deliberately-unresolved cross-epic tension**, flagged in code (`isCoordinatedListing`'s doc
  comment): the dark/OFF `checkout.rental_pricing_enabled` capability (Rental line-item pricing epic) was
  designed to let rentals be safely card-paid via a server-recomputed total. This epic's S2.2 unconditionally
  overrides that for rentals. Changes nothing live today (that flag is off), but whoever activates it later
  must reconcile the two — either rentals stay manual-only permanently, or `isCoordinatedListing` needs a
  carve-out for a rental with a valid server-side quote.
- **`both` delivery mode (carrier AND arranged, card allowed)** was scoped as a stretch in S1.1 and never
  built — deferred to its own follow-up per the epic README, not a v1 commitment.
