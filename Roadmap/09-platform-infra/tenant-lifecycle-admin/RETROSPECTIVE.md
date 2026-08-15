# Tenant lifecycle — Retrospective

_Closed: 2026-08-14_

## What shipped

**S1 — the primitive** (backend #152). `seller.status` on the Medusa seller with a migration, a pure
transition planner, the pause/unpause channel-link ledger, and an internal status route.

**S2 — enforcement** (backend #154, fixed by #156). Checkout admission refuses a non-active owner;
the seller portal returns 423 with an explanation instead of a broken screen, gated by middleware on
the `/store/sellers/me` subtree rather than 45 route edits; and `start-checkout` — the money step —
refuses too.

**S3 — the surface** (storefront #368). Registration email read from Clerk at request time, filter
and sort over the full set by the platform's own heuristics, and edit / pause / reactivate / delete
with required reasons and audit rows.

## What went well

**The belt-and-braces design paid off, and not hypothetically.** D2 called the redundancy between the
channel unlink (the mechanism) and the checkout status check (the guarantee) deliberate. When the
unlink turned out to be completely broken in production, that redundancy is the only reason a paused
shop still could not be sold from. A design note that earns its keep inside the same epic is rare
enough to record.

**Reporting discipline made a live failure diagnosable in one run.** The broken unlink came back as
`complete: false` with both errors named, and the restore reported `already_linked: 2` rather than
duplicating link rows. Six review rounds went into making outcomes honest; the payoff was reading one
response and knowing exactly what had happened.

**Pushing the decision into the pure layer worked the second time.** After the cartesian-product
defect in S1, S2 and S3 put every decision — what to unlink, what a transition means, what an edit
may change, whether a payload is trustworthy — in pure functions with the I/O shell doing nothing but
transport. Review still found things, but never again in the decision logic.

## What we learned

**A correct plan handed to a call that cannot execute is still a no-op — and only a live run finds
it.** `link.dismiss` was called with invented module keys (`productService` instead of
`Modules.PRODUCT`). Every unlink threw. Six review rounds, 1198 green unit tests, and a fully correct
planner did not see it, because the specs asserted *what* to unlink rather than that the call
signature existed. **A pure core is only as true as its inputs — and only as useful as the call that
consumes it.** The generalizable rule: when a pure planner drives an external API, at least one test
must exercise the real call shape, or the first real request is the test.

**A status must not claim work that failed.** The same run flipped the seller to `paused` while every
unlink failed — a shop reading "paused" with its products still in the catalog, which is the exact
lying-admin failure the epic was written to prevent. The route header promised the ordering
guarantee and the code did not implement it. **A header describing a guarantee is not the
guarantee**, which is this codebase's most repeated lesson, found again inside the epic that quotes
it.

**"Absent", "not applicable", and "unavailable" are three different facts.** Review found them
collapsed twice: an orphaned mirror row read as a transient glitch, and an un-imported scraped gem
read as an orphan. Each collapse buried a real signal in noise on the one screen an operator uses to
decide whether to intervene.

**An ambiguous outcome is not a failure.** A timeout, a lost browser response, a gateway 5xx and an
unreadable 2xx all mean *we do not know whether it applied*. Calling any of them "failed" invites a
retry against a shop that may already be deleted. This lesson landed four separate times in one PR,
one layer further in each round: server transport, browser transport, gateway status, payload
validation.

## Gaps / follow-ups

- **The pause round trip must be re-verified live** after #156 deploys: pause → confirm the catalog
  is dark → unpause → confirm exactly the recorded links came back. The first attempt found the
  broken unlink; the fix is unproven until that run is green.
- **Authenticated smokes owed to Daniel:** the portal 423 as a real merchant, and a money-path
  checkout refusal against a paused shop.
- **The cart-write authorization boundary is still open**, unwidened and inherited:
  `POST /store/carts/:id/line-items` enforces no channel membership and no seller status. Checkout
  and start-checkout both refuse, so the money consequence is closed — but the gap the owned-shop
  epic recorded as owed is still owed.
- **`deleted` is terminal by design.** Undeleting is a real product decision (what happens to the
  slug, the domain, the channel links) and was deliberately not invented here.
- **Slug and custom-domain edits are deliberately absent** from the admin surface; both need their
  own flow rather than a text field in a directory row.
