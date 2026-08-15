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

## The live round trip — what it took, and what it proved

Three attempts. The first two found real defects; the third is the one that counts.

| Step | Result |
|---|---|
| Pause | `unlinked: 2, complete: true` |
| Dark? | product detail **404** · checkout admission **404** · **absent** from browse |
| Unpause | `restored: 2, complete: true` |
| Back? | product detail **200** · `admitted: true` |

**The epic's central promise holds in production:** pausing a shop genuinely hides it, and unpausing
restores exactly what pausing removed.

A third defect surfaced only because that run was checked rather than declared green:
`paused_link_count` stayed at 2 after a COMPLETE restore. `updateSellers` **merges** the metadata
blob rather than replacing it, so `delete metadata[key]` is a no-op — the deleted key is simply
absent from the patch and the stored value survives. Fixed in #157 by writing an explicit `null`.
Not cosmetic: a stale ledger would re-link, on some later unpause, pairs that were legitimately
unlinked in between — publishing products nobody asked to publish, which is the failure the ledger
exists to prevent arriving through the back door.

**Verified clean on `medusa-web-00055-6j2` after #157**, which is the run that closes the epic:

```
PAUSE    unlinked: 2  complete: true   → product 404 · admission 404
UNPAUSE  restored: 2  complete: true   → product 200 · admitted: true
LEDGER   paused_link_count: 0
```

**Four live runs, three defects, none of which any review round or unit test found.** That ratio is
the argument for exercising a feature against production before calling it done — and for checking
the result rather than declaring it, since the third defect was only visible in a field of a response
that otherwise read as a complete success.

## Gaps / follow-ups
- **Authenticated smokes owed to Daniel:** the portal 423 as a real merchant, and a money-path
  checkout refusal against a paused shop.
- **`internal/sellers/[id]/grant` probably shares the metadata-merge bug.** It uses the identical
  `delete metadata.envia_grant` + `updateSellers` pattern, so a REVOKE there likely does not clear
  either. Not fixed as a drive-by — it belongs to the shipping epic and deserves its own
  verification — but it is the same defect and worth checking before anyone relies on that revoke.
- **The cart-write authorization boundary is still open**, unwidened and inherited:
  `POST /store/carts/:id/line-items` enforces no channel membership and no seller status. Checkout
  and start-checkout both refuse, so the money consequence is closed — but the gap the owned-shop
  epic recorded as owed is still owed.
- **`deleted` is terminal by design.** Undeleting is a real product decision (what happens to the
  slug, the domain, the channel links) and was deliberately not invented here.
- **Slug and custom-domain edits are deliberately absent** from the admin surface; both need their
  own flow rather than a text field in a directory row.
- **`/admin/tenants` fans one status read and one Clerk email read per shop.** Measured: ~250 ms per
  status call, bounded at concurrency 8 (statuses) and 6 (emails, with a 5-minute in-process cache).
  At 30 shops that is a few seconds on a cold load, which is fine. **At a few hundred tenants it is
  not** — the read model would need a batch endpoint or a cached projection. Recorded now, while the
  number is small enough that nobody has felt it.
