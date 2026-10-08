# Shop-created welcome by market — Retrospective

_Closed: 2026-10-08_
_Intent: yes_
_Quote vs actual: $5–40 (S, n=0, wide) → unavailable; the `epic-actuals.mjs` cited by the scaffold is absent from this repo, so no cost number was invented._

## What shipped

Frontend PR [#428](https://github.com/danybgoode/miyagisanchezcommerce/pull/428) (`a05b806`) sends a shop-created welcome in the seller's persisted MX or US market after a newly owned shop is created. CI and the production Cloud Build succeeded. The two welcome delivery tables exist in production. Daniel confirmed the intended result.

## What went well

The existing seller creation seams and email transport carried the change without a new flag. The delivery reservation tables make retries distinct from duplicate sends.

## What we learned

The source of the shop language must be the persisted seller market, not the visitor's locale. The implementation and its test already hold that rule; no new cross-epic lesson was needed in `LEARNINGS.md`.

## Gaps / follow-ups

Daniel still owns controlled MX and US shop creation and checking that each expected email arrives exactly once. The unpublished Resend drafts remain review copies; the app code is the send source.
