# Market architecture foundation — owned shops, country marketplaces, and locale — Retrospective

_Closed: 2026-07-31_

## What shipped

Market, locale, checkout region, and marketplace publication are now four separate concepts instead
of one implicit "Mexico". Mexico moved to `/mx`, `/` became the master-brand selector, and `/us` is a
structurally fail-closed invitation surface.

| Sprint | Repo | PR | Landed |
|---|---|---|---|
| 1 — market contract, seller market, channel boundary, Region resolver | `apps/backend` | [#124](https://github.com/danybgoode/medusa-bonsai-backend/pull/124) | 2026-07-30 |
| 1 — market-aware read layer, degrade-closed | `apps/miyagisanchez` | [#324](https://github.com/danybgoode/miyagisanchezcommerce/pull/324) | 2026-07-30 |
| 2 — `/` selector, `/mx` cutover, middleware 308s, canonical/hreflang, sitemap, MCP market | `apps/miyagisanchez` | [#327](https://github.com/danybgoode/miyagisanchezcommerce/pull/327) | 2026-07-30 |
| 3 — `/us` invitation, fail-closed boundary, admin/partner/MCP market projection, lifecycle tag | `apps/miyagisanchez` | [#328](https://github.com/danybgoode/miyagisanchezcommerce/pull/328) | 2026-07-31 |

No database migration (D12) and no runtime flag (approved pre-launch kill-switch decision). The only
production mutation authorized was one idempotent MX backfill — which measurement showed was
unnecessary (below).

## What went well

**The D1 gate did its job, and the answer was recorded.** D1 named the real hazard early: the Sales
Channel filter was *new enforcement*, not a repair, so switching it on could hide a product that was
visible the day before. The rule was that the no-link count had to be reviewed before the filter
shipped. Measured live after the cutover: **72 products, exactly the number D0 predicted on
2026-07-28**. The boundary hid nothing and the backfill was a no-op. That is what a gate is supposed
to feel like — boring, because the risk was priced before it was taken.

**D7's "literal `mx/` segments, not a root `[market]` dynamic segment" avoided a whole class of bug.**
A dynamic root segment would have shadow-competed with ~20 existing top-level routes and turned every
404 into a market-resolution question. The literal folder is also what makes "`/us` has no catalog
child routes" a *structural* fact rather than a guard — `/us/l` 404s because the folder does not
exist, which is the only version of fail-closed that cannot be refactored away by accident.

**Architecture decisions were locked against live code and the live database before any builder
started.** D0 re-derived region/channel/product counts from production. Every later "is this safe?"
question had a number attached instead of an assumption, and the one prediction that mattered most
(72) came back exact three days later.

**The scope corrections were written down as they happened,** rather than discovered by a reviewer:
D7c (bare `/c/[collection]` is tenant-only, not a marketplace route) and D12b (owned-shop-only
publication deferred rather than half-shipped) both correct the original plan *in the plan*.

## What we learned

**An admission proof must be keyed to the object that is actually consumed, not a neighbouring one.**
The checkout gate proved that a *product* was published to the requested market, but a cart line buys
a *variant*, and both came from the caller. Pairing an admitted `productId` with a variant of an
unpublished product walked straight past a gate that was, in every test, green. The guard was real;
it was simply guarding a different noun than the one that reached the money path. Generalisable:
whenever a check and an effect name different identifiers, prove they refer to the same thing —
otherwise the check is decoration.

**A population guard that hand-picks its own scan roots reproduces the bug it exists to prevent.** The
D10 guard opened with a doc comment quoting "guard the population, not the door you found" — and then
scanned `app/` and `lib/` only, while `components/`, `services/` and `db/` went unscanned. Other tests
*in the same file* already scanned `components/`. The fix that matters is not adding three directories;
it is the meta-test that reddens when a new source directory appears unscanned. **Guard the guard's
own population, or it silently covers less over time while still passing.**

**"Degrades to `[]` so the page never throws" was a doc comment, not a behaviour.** `getShop` is a bare
`fetch`: a network fault *rejects*, it does not return `null`. Inside `Promise.all` that took down the
entire `/admin/tenants` and `/partner` pages over one unreachable seller — while the function's own
comment two lines up promised the opposite. A degradation contract stated only in prose is not a
contract; the codebase had the correct unavailable state (`readPublicSellerMarket(null)` →
"Mercado operativo no disponible") already built and simply never routed to it.

**Cross-family review paid for itself again, and still needed verifying.** The Gemini pass found three
real defects — including the variant bypass on the money path — that four Playwright shards, `tsc`,
lint and a build had all missed, because they were logic gaps rather than broken assertions. It also
produced one confidently-worded false positive (a missing `useEffect` cleanup that was present three
lines below the quoted line). That is ~1-in-4 wrong, consistent with the ratio already recorded in
team memory. **Verify each finding against the code before acting; do not batch-apply a review.**

**Stale sprint docs are the default state of a multi-session epic.** Sprint 1 still read "In review"
and Sprint 2 "in progress" days after both had merged and deployed. Sessions end mid-flight and the
doc is the thing that does not get updated. The reliable move at pickup is to derive state from
`gh pr list` and the live site, then correct the docs — never to trust a status line.

## Gaps / follow-ups

- **Owned-shop operating channel (deferred, D12b).** `publish_to_market: null` — an owned-shop-only
  product — would produce a listing that renders and *cannot be sold* (no Sales Channel ⇒ 404 on the
  channel-scoped endpoint ⇒ "Product not found" at checkout). The capability was removed rather than
  half-shipped. The follow-up needs a new production Sales Channel, a publishable-key membership
  change and a full backfill, so it is deliberately its own epic:
  [`00-ideas/seeds/owned-shop-operating-channel.md`](../../00-ideas/seeds/owned-shop-operating-channel.md).
- **No spec covers the `getShop` rejection fix.** Reproducing it needs network-fault injection, and a
  source-text assertion that a `try`/`catch` exists would reject correct refactors later
  (`LEARNINGS.md`: a guard that rejects correct output is worse than one that misses a rare fault).
  The fix is deployed and the failure mode is documented in-line; the coverage gap is stated rather
  than papered over.
- **Owed to Daniel — smokes that need a human or a session.** Sprint 3 step 3 (partner/admin view of
  an MX fixture shop showing `Operating market: MX`), step 4 (a seller-agent write that would enable
  US commerce fails closed and mutates nothing) and step 5 (inspect a disposable shop-created event
  and confirm `market_code` is present with no private commerce fields). All three need an
  authenticated session; none is on the money path.
- **Daniel may optionally submit one `/us` pilot inquiry** end-to-end. No US commerce smoke exists or
  should exist — USD checkout, shipping and payments are explicit non-goals.
- **`/us` copy is hypothesis, not validated claim.** It is grounded in the MADMEN US operator
  discovery brief, which is itself "approved direction, hypotheses pending interviews". Revisit the
  page after the interviews happen rather than treating the current copy as settled.
- **`store.default_sales_channel_id` ≠ env `MEDUSA_SALES_CHANNEL_ID`** remains true and remains
  deliberately out of scope (D0). Do not "fix" it without reading that decision first.
