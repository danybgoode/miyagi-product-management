# Sprint 2 — the admin surfaces

**Status:** 🟦 In review · PR [#376](https://github.com/danybgoode/miyagisanchezcommerce/pull/376), [#378](https://github.com/danybgoode/miyagisanchezcommerce/pull/378)

## Story 2.1 — /admin/contenido stops accusing itself

> **As** Daniel, **I want** the copy editor's nav to name real pages, **so that** I can find the
> string I want to change.
>
> **Acceptance:** the left nav lists ~110 readable page names. None says "sección no reconocida".
> Picking a page shows fields, never an empty list.

**Two causes.** Three namespaces (`buyerShell`, `buyerCopy`, `sellerCopy` — 2587 of 3372 keys) were
missing from the route map, whose header comment claimed full coverage. And `sellerCopy`'s 1809
content-hash keys each became their own section under the universal `key.split('.')[0]` rule.

**`sectionForKey` is now the one definition.** Four files spelled it inline: the nav, the filter, and
both import and export scoping. Nav-vs-filter drift shows a group that opens onto nothing; the export
one meant "export this page's copy" would have matched zero keys for every new `sellerCopy` page.

**The guard found two bugs the fix did not.** `e2e/copy-overrides-route-coverage.spec.ts` runs against
the live dictionary and surfaced `partnersRecruiting.landing` and `.application` — both real sections
on `/us/operators`, captioned "no reconocida" since that namespace shipped.

## Story 2.2 — the long admin lists paginate <a id="s5"></a>

> **As** Daniel, **I want** `/admin/tenants` and `/admin/comunicaciones` to page, **so that** they are
> not one unbroken scroll.
>
> **Acceptance:** both show 25 rows with the same pill control `/admin/contenido` already uses.
> Changing a filter returns you to page 1 rather than to an empty page 3.

Delegated to a Codex builder against a written contract. One follow-up commit replaced a reset helper
whose only spec asserted that `true` returns `1` — a test proving the wrapper was called and nothing
about what the wrapper is for. The spec now asserts the real property against the selector +
`paginate` composition, plus the defence in depth: even with the reset missed, the clamp still shows
rows, so a future call site that forgets degrades to "the last page" rather than "a blank list".
