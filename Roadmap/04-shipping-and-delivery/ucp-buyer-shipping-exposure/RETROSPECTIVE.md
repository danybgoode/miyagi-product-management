# UCP buyer-side shipping/delivery-method exposure — Retrospective

_Closed: 2026-08-17_

## What shipped

One atomic frontend release: [#385](https://github.com/danybgoode/miyagisanchezcommerce/pull/385),
squashed as `936b42d` and deployed through Cloud Build
`4276cd94-332d-4c82-97be-d6c0542b9039` to Cloud Run `miyagi-web-00106-plc` (100% traffic).

- **Sprint 1 — discovery.** A next-free fulfillment seam turns the existing backend delivery catalog and
  Envía/Correos rate response into UCP fulfillment methods, destinations, groups and options. Returned
  shipping ids bind listing + normalized destination + current backend rate id; unavailable, empty and
  address-required states stay distinct. `checkout-session` and `get_checkout_options` expose the result
  while arranged, rental, digital and service behavior stays intact.
- **Sprint 2 — selection.** `create_checkout` accepts only an opaque returned selection, immediately
  re-reads the backend catalog/rate, rejects unknown or stale/cross-address choices before a write, and
  derives the actual quote/spot for the existing Medusa `startCheckout()` rail. Calls without a fulfillment
  selection preserve the legacy checkout path. No new flag, MCP tool, database object, provider, direct
  Stripe use or payment calculation shipped.

## What went well

- Architecture lock found the required backend routes and cart path already existed, keeping the delivery
  change frontend-only and avoiding a migration or duplicate pricing logic.
- The deliberate red proofs demonstrated both the projection and stale-destination selection specs could
  fail before their implementation was restored.
- Independent Vibe and Antigravity passes found real contract gaps before merge: complete-address/no-rate
  is unavailable rather than empty; checkout derives the delivery mode from the UCP session; MCP summaries
  retain returned ids; and pickup ids use the same fallback mapping everywhere.
- The preview gate caught a stale generated flag inventory after the final review edits. Regenerating it
  and rerunning all four API shards cleared the release before production merge.

## What we learned

No new durable rule was promoted. The generated-artifact freshness and unavailable-fixture rules already
in `Roadmap/LEARNINGS.md` cover this release; this retrospective is supporting evidence, not a duplicate.

## Gaps / follow-ups

- **Daniel / first safe fixture:** publish a carrier-configured test listing and a structured-pickup test
  listing, then run Sprint 1's positive quote comparison and Sprint 2's hosted test-mode
  rate→payment-total→order-metadata and pickup-persistence walkthroughs. The public catalog currently has
  only arranged or delivery-unconfigured products, so creating a cart, payment or order merely to make the
  checklist green would have been an uncontrolled production transaction.
- The deployed read-only production smokes did confirm the complementary behavior: an unconfigured
  physical listing gets no fabricated fulfillment, and an arranged listing retains its existing MCP flow.
