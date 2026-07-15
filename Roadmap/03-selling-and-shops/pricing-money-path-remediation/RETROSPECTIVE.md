# Money-Path & Pricing Integrity Remediation — Retrospective

_Closed: 2026-07-15_

## What shipped

- **Sprint 0 — Finding A, REFUTED.** Source-traced Medusa v2.15.3's payment-session-creation
  pipeline end-to-end for both checkout shapes this marketplace uses (flat-price Stripe/MP direct,
  and the Medusa-cart path). Every real charge is self-consistent with what's displayed to the
  buyer — the one CRITICAL latent unknown gating the whole epic (and `panfleto-premium-shop`
  Sprint 3) closed with certainty and no code change. Full evidence trail in `sprint-0.md`.
- **Sprint 1 — Findings D + E, MERGED + LIVE.** Backend PR
  [#89](https://github.com/danybgoode/medusa-bonsai-backend/pull/89), squash `3247d68`. Finding D
  (a fresh zero-price variant permanently unable to receive its first price) took three attempts —
  two independently cross-reviewed fixes turned out to be no-ops before the real cause (a plain
  `price_set_id` vs. Medusa's actual `priceSetId` key typo) was found on a third pass. Finding E
  (Admin's dual MXN/region price columns writing two rows that a legitimate tier-ladder guard then
  misread as real quantity tiers) fixed by teaching the guard to distinguish a real ladder from a
  same-band Admin artifact. Verified live against both real affected products post-deploy.
- **Sprint 2 — Finding F + migrations sweep, DONE.** Backend PR
  [#92](https://github.com/danybgoode/medusa-bonsai-backend/pull/92) deleted the leftover seeded
  "Europe" region (currency-guarded, soft-delete via Medusa's own `deleteRegionsWorkflow`) —
  executed live and independently re-verified via `/store/regions`. The migrations-vs-applied
  sweep (Finding B precedent) covered all 68 local migration files against the live `bonsaiClerk`
  Supabase project and found **3 real gaps** across two other "shipped" epics — `tenant_intake`,
  `marketplace_migration_estimates`, and a ticket-token uniqueness index — all applied live and
  re-verified by direct schema query.
- **Sprint 3 (Findings G/H)** — deferred to `bookshop-launchpad`'s next grooming pass, as scoped;
  not part of this hardening pass.

## What went well

- **Refusing to stop at a plausible-sounding fix (Finding D).** Two separate fixes each looked
  correct on inspection and each survived an independent fresh-agent review before being proven
  no-ops by a *different* fresh review reading deeper into Medusa's actual compiled source. The
  discipline that mattered wasn't "get a review" — it was treating "the reviewer approved it" as
  necessary but not sufficient, and re-reading the real error string until the diagnosis was the
  *only possible* source of the observed failure (confirmed by grepping the entire installed
  package for the exact template string).
- **Checking live schema instead of trusting migration bookkeeping, twice this session.** The
  bookshop-launchpad incident (Finding B, fixed before this epic even started) already established
  that `apply_migration` records its own run timestamp, not the file's — so a naive timestamp diff
  produces false positives. Sprint 2's sweep applied that lesson directly: name-based diff to
  narrow candidates, then a live `to_regclass()`/`pg_indexes` query as the only fully-authoritative
  check. It caught a second, independent recurrence of the exact same failure class.
- **Separating "merge the PR" from "execute the live mutation" as two distinct sign-off gates.**
  Finding F's code review and CI passing didn't imply the actual region deletion should run
  unattended — Daniel's go-ahead was sought (and given) for each separately, and the live response
  was checked for the specific success line rather than assumed from a 200 status.

## What we learned

- **"Shipped" means the code merged — it says nothing about whether the database agrees, and this
  can fail two different ways.** `tenant_intake`'s degrade-safe read pattern (every Supabase error
  swallowed to a safe default, matching `lib/home-favorites.ts`'s established convention) meant a
  missing table produced **zero visible symptoms** — the onboarding-three-doors epic's entire Q1/Q2
  personalization feature has been silently inert since its "ship" date, and nothing in normal use
  would ever have surfaced that. `marketplace_migration_estimates`, by contrast, had no such
  guard — its insert path let a Supabase error propagate into a genuine 500, so its break was loud,
  just never yet hit by a real seller. **Generalizable: a migration-application gap can hide behind
  either a defensive read pattern (silent) or an unguarded one (loud) — "no error reports" is not
  evidence a feature works if nobody has exercised it since deploy.** This is now the *second* time
  this exact failure mode has recurred (`bookshop-launchpad`'s Finding B was the first), which is
  what elevates it from "a bug" to "a systemic gap worth a one-time full-repo sweep," which is
  exactly what Sprint 2 Story 2.2 was scoped to be.
- **A degrade-safe read pattern is a double-edged design choice.** It correctly prevented a
  Supabase hiccup from ever blocking onboarding — but the same property that makes it robust to
  transient failures also makes a *permanent* failure (a table that was never created) invisible.
  Worth a lighter-weight generalizable follow-up: a fail-soft data path is not a substitute for
  confirming the schema it depends on actually exists post-deploy.
- **Auto-mode's tool-safety classifier can go down mid-task, including for the exact prod-mutation
  step the whole sprint was building toward.** When it recovered, verifying the actual Cloud Build
  status from an already-completed background poll's captured output (rather than re-running a
  fresh check) avoided redundant work — and reading the live secret from Secret Manager rather than
  trusting a local `.env` (per the `dotenv-local-is-not-prod-source` precedent) confirmed the two
  matched before using either.

## Gaps / follow-ups

- **Live smokes still owed for the onboarding Q1/Q2 flow and a real >150-listing Shopify migration
  quote**, now that their backing tables exist. Schema now matches code; behavior should just work,
  but neither has been exercised live since the fix.
- **Findings G/H (convocatoria "Género" dropdown + paste-a-story option)** remain deferred to
  `bookshop-launchpad`'s next grooming pass, as originally scoped — reference only, logged in that
  epic's README fast-follows section.
- **The cents-vs-major-units semantics (Finding A/D's core discovery — this app's entire pricing
  write/read path assumes integer cents while Medusa v2's own `amount` field stores major units)**
  is a durable, cross-cutting fact worth keeping visible beyond this epic — promoted to
  `LEARNINGS.md`.
