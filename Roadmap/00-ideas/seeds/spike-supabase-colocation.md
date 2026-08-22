---
title: "Spike — should Supabase (non-commerce) co-locate onto GCP, like commerce did?"
slug: spike-supabase-colocation
status: ready
area: "09"
type: spike
priority: null
appetite: S
underwritten_by: null
risk: low
epic: null
build_order: null
updated: 2026-08-22
---

# Pitch — Supabase co-location spike

> **Split out of [`hyper-performant-runtime`](./hyper-performant-runtime.md) at grooming
> (2026-08-22)** so a perf epic doesn't quietly acquire a 60-table database migration.
> **Investigation only — ends in a written decision, not code.**

## Problem

The product owner asked: *"What about DB, let's map what we have currently, we use Supabase for
everything? should we move to GCP?"*

**The premise is half true, and the half that's false is the important one.** Commerce is *not* on
Supabase and *not* on AWS: `postgres-neon-to-cloudsql` moved it to **Cloud SQL, private IP, same VPC
as the backend** (2026-06-22). Per AGENTS rule #2, Supabase holds **non-commerce only** — but that
"only" is now large: **95 migrations, ~60 tables** (conversations, offers, favorites, promoters,
sweepstakes, referrals, merchant CRM, launchpad, scrape runs, shop settings, wall).

Supabase runs on AWS. That is **the same cross-cloud shape** whose root cause `postgres-neon-to-cloudsql`
diagnosed: *"the compute is on Google Cloud; the database runs on AWS — a cross-cloud split with no
upside for this usage."* Nobody has re-run that analysis against Supabase. It may be a real
tax; it may be irrelevant. **Both are currently guesses, and a guess is not a reason to migrate 60
tables or a reason not to.**

## Appetite

**S.** One investigation, no build. If the answer is "migrate", that is a **separate epic** with its
own appetite — this spike does not pre-authorize it.

## Outcome & signal

A written decision in this seed — **keep** or **migrate** — backed by measured numbers, not
architecture aesthetics. The product owner can point at the number that decided it.

## Stage-2.5 bucket

**Genuinely new** as an investigation; **already-answered** as a build question — the answer today is
"no work", and the spike exists to find out whether that stays true.

## Questions the spike must answer

1. **Where is the Supabase project actually hosted** (region), and how far is it from Cloud Run
   us-east4? (Neon/AWS us-east-1 ↔ GCP us-east4 were both Virginia — *milliseconds*. That fact killed
   the "co-location fixes cold loads" theory last time and would kill it again.)
2. **What does the egress/transfer actually cost**, in bytes and money? Reuse the measurement shape of
   `scripts/neon-egress.mjs` — the harness that survived the archived `neon-egress-and-db-isolation`
   epic precisely because it measures rather than assumes.
3. **Which request paths pay it?** The static homepage touches no Supabase. Which authed surfaces do,
   and how many round-trips per page? (`app/(shell)/**` server components + `lib/*` readers.)
4. **What would we lose?** Supabase is not just Postgres here — RLS policies, auth-adjacent helpers,
   the `@supabase/supabase-js` client (235 KB in the bundle), Realtime, Storage if used. Cloud SQL is
   Postgres and nothing else. **Enumerate every non-Postgres Supabase feature in use** before costing
   a migration; that list is usually what decides it.
5. **Is there a cheaper intervention that gets most of the win?** Connection pooling, caching the hot
   reads through `lib/cache-policy.ts`, or trimming per-page round-trips — the `neon-egress` S1 answer,
   which is also what `hyper-performant-runtime` S2 does for free.

## Decision shape (fill at close)

> **Decision:** \<keep on Supabase | migrate to Cloud SQL | migrate a named subset\>
> **Because:** \<the measured number that decided it\>
> **Superseded/unblocked:** \<what this closes out\>

## What already exists (reuse, don't rebuild)

- **`postgres-neon-to-cloudsql/README.md`** — the reasoning template, including the honest caveat that
  co-location fixed **egress**, not cold-start. Read it before re-deriving the argument.
- **`neon-egress-and-db-isolation/README.md`** (archived) — a worked example of a spike whose original
  framing blamed the wrong causes (traffic, backups) and whose value was in the measurement.
- **`scripts/neon-egress.mjs`** — the durable measurement harness kept when that epic was superseded.
- **`lib/cache-policy.ts`** — the revalidate SSOT; the cheap-intervention lever for Q5.
- **`apps/miyagisanchez/supabase/migrations/`** — 95 files; the true scope of any migration.
- **AGENTS rule #2 table** — the authoritative list of what Supabase is allowed to own.

## Cross-agent planning panel

Per the groom skill, a spike **must surface** the offer: this is an expensive-to-reverse data-ownership
call, exactly the fork the panel exists for.

```
node scripts/cross-panel.mjs Roadmap/00-ideas/seeds/spike-supabase-colocation.md --lens both --agent codex
node scripts/cross-panel.mjs Roadmap/00-ideas/seeds/spike-supabase-colocation.md --lens both --agent antigravity
```

Advisory, single-pass, print-only. It never gates and never edits this doc.

## Open risks

- **Anchoring on the last migration's success.** `postgres-neon-to-cloudsql` was right *because the
  measurement said so*, not because co-location is always right. The spike must be allowed to
  conclude "keep it where it is" without that reading as a failure.
- **Scope gravity.** A migration epic here would be **high risk on one irreplaceable dataset** — the
  operating posture's first named hazard is *"destructive or hard-to-reverse data changes against the
  shared live Supabase … there is one dataset and no second copy."*
