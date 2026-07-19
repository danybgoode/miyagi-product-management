# catalog-orphan-listing-sweep — Retrospective

_Closed: 2026-07-19_

## What shipped

- No data sweep. The read-only audit disproved the “orphan row” premise before any write.
- Runtime repair arrived through sibling backend [PR #104](https://github.com/danybgoode/medusa-bonsai-backend/pull/104)
  (`f813206`): the linked product once again resolves to shop `andrea-shops`.
- Frontend [PR #286](https://github.com/danybgoode/miyagisanchezcommerce/pull/286), squash
  `b1a8311`: the embed gate scans every paginated catalog item, fails any missing shop slug, and
  skips only a genuinely empty catalog.

## What went well

- The groomed stop-before-mutation gate worked. Product→link→seller and seller→products were checked
  against production before an authorized HIGH unpublish, preventing removal of a valid live
  listing.
- The “orphan” epic and null-slot epic were recognized as one causal chain rather than implemented
  as competing fixes.
- Red→green was unambiguous: old test one pass/one skip; corrected test red on the exact product;
  after backend deploy, two passes across all 71 catalog items and the exact slug `andrea-shops`.

## What we learned

- A missing projection is not proof of missing data. For relationship anomalies, validate both link
  directions and the read path before authorizing data repair.
- `test.skip(!derivedValue)` is dangerous when a falsy derived value is the defect under test.
  Separate “source collection is empty” from “collection exists but one item violates the
  invariant,” and assert across every page rather than the first item.
- The highest-value orchestration decision was deletion of work: three validation agents plus the
  production audit collapsed a HIGH data-mutation story to a no-op before builders started.

## Gaps / follow-ups

- None for data repair: zero true orphans were found and zero writes were performed.
- The next daily production smoke should remain green; the permanent PR gate now catches the same
  invariant before merge.
