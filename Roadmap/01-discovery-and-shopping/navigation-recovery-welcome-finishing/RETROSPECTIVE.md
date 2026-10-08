# Navigation, recovery, and welcome finishing — Retrospective

_Closed: 2026-10-08_
_Intent: yes_
_Quote vs actual: $5–40 (S, n=0, wide) → unavailable; the `epic-actuals.mjs` cited by the scaffold is absent from this repo, so no cost number was invented._

## What shipped

Frontend PR [#428](https://github.com/danybgoode/miyagisanchezcommerce/pull/428) (`a05b806`) aligned the Cuenta popover, gave 404 and error pages a shared recovery surface, and made the MX claim confirmation name the shop. PR [#429](https://github.com/danybgoode/miyagisanchezcommerce/pull/429) (`cde8e58`) preserved market on the recovery browse link. Both production Cloud Builds succeeded. Daniel confirmed the result matches the intended work.

## What went well

The public production 404 rendered with the expected actions and support address. The single code-rendered email source kept the headline change narrow; the new-account welcome remained unchanged.

## What we learned

An intentional 404 cannot pass a generic browser smoke that requires 2xx. Inspect its screenshot and assert its 404 status and recovery actions explicitly. This is specific to error-page checks and adds no new platform-wide rule to `LEARNINGS.md`.

## Gaps / follow-ups

Daniel still owns the signed-in Cuenta position check and two actual email receipts (unchanged account welcome and a claimed MX shop). The generic smoke reported nonzero on the expected 404 HTTP response; its screenshot was inspected rather than counted as a passing run.
